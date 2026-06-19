'use strict';
const mongoose             = require('mongoose');
const BillRepository       = require('./bill.repository');
const ProductRepository    = require('../products/product.repository');
const CustomerRepository   = require('../customers/customer.repository');
const SettingsRepository   = require('../settings/settings.repository');
const QuotationRepository  = require('../quotations/quotation.repository');
const StockService         = require('../stock/stock.service');
const CounterService       = require('../stock/counter.service');
const ApiError             = require('../../utils/ApiError');
const { generateBillPDF }  = require('../../utils/pdfGenerator');
const { calculateItemAmounts, calculateBillTotals, round2 } = require('../../utils/helpers');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const { BILL_TYPES, STOCK_TRANSACTION_TYPES, QUOTATION_STATUS } = require('../../constants');

class BillService {
  static async _buildItems(rawItems) {
    const productIds = rawItems.map((i) => i.productId);
    const products   = await ProductRepository.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    return rawItems.map((item) => {
      const product = productMap.get(item.productId.toString());
      if (!product) throw ApiError.notFound(`Product ${item.productId} not found`);

      // For non-GST bills, force gstRate = 0
      const gstRate = item.gstRate !== undefined ? item.gstRate : product.gstRate;
      const calculated = calculateItemAmounts({
        quantity:           item.quantity,
        rate:               item.rate,
        discountPercentage: item.discountPercentage || 0,
        gstRate,
      });

      return {
        productId:          product._id,
        sku:                product.sku,
        productName:        item.productName || product.name,
        unit:               product.unit,
        hsn:                product.hsn,
        quantity:           item.quantity,
        rate:               item.rate,
        discountPercentage: item.discountPercentage || 0,
        gstRate,
        ...calculated,
      };
    });
  }

  /**
   * Create a bill (GST or Non-GST) with atomic stock deduction.
   */
  static async create(data, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Build processed items
      const items  = await BillService._buildItems(data.items);
      const totals = calculateBillTotals(items, data.overallDiscount || 0);

      // Round off
      const rawGrand  = totals.grandTotal;
      const rounded   = Math.round(rawGrand);
      const roundOff  = round2(rounded - rawGrand);
      const grandTotal = rounded;

      // 2. Generate serial number
      const billNo = data.type === BILL_TYPES.GST
        ? await CounterService.nextGstBillNo()
        : await CounterService.nextNonGstBillNo();

      // 3. Customer snapshot — accept either customerId OR inline customerSnapshot
      let customerSnapshot = data.customerSnapshot || {}
      if (data.customerId) {
        const customer = await CustomerRepository.findById(data.customerId)
        if (customer) {
          customerSnapshot = {
            name:      customer.name,
            mobile:    customer.mobile,
            gstNumber: customer.gstNumber,
            address:   [customer.address, customer.city, customer.state].filter(Boolean).join(', '),
          }
        }
      }

      // 4. Create bill document
      const [bill] = await BillRepository.create(
        {
          billNo,
          type:             data.type,
          customerId:       data.customerId,
          customerSnapshot,
          items,
          overallDiscount:  data.overallDiscount || 0,
          paymentMode:      data.paymentMode,
          notes:            data.notes,
          quotationId:      data.quotationId,
          roundOff,
          // Spread totals first then override grandTotal with rounded value
          subtotal:              totals.subtotal,
          overallDiscountAmount: totals.overallDiscountAmount,
          gstAmount:             totals.gstAmount,
          grandTotal,
          paidAmount:       data.paidAmount || grandTotal,
          dueAmount:        round2(grandTotal - (data.paidAmount || grandTotal)),
          createdBy:        userId,
        },
        session
      );

      // 5. Deduct stock for each item
      const movements = items.map((item) => ({
        productId:       item.productId,
        transactionType: STOCK_TRANSACTION_TYPES.SALE,
        quantity:        -item.quantity,   // negative = OUT
        referenceId:     bill._id,
        referenceType:   'Bill',
        remarks:         `Sale – ${billNo}`,
        createdBy:       userId,
      }));
      await StockService.bulkMovement(movements, session);

      // 6. If converted from quotation – mark it
      if (data.quotationId) {
        await QuotationRepository.updateById(
          data.quotationId,
          { status: QUOTATION_STATUS.CONVERTED_TO_BILL, convertedBillId: bill._id },
          session
        );
      }

      await session.commitTransaction();
      session.endSession();

      return bill;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  /**
   * Convert a quotation directly into a bill.
   */
  static async convertFromQuotation(quotationId, extraData, userId) {
    const quotation = await QuotationRepository.findById(quotationId);
    if (!quotation) throw ApiError.notFound('Quotation not found');
    if (quotation.status === QUOTATION_STATUS.CONVERTED_TO_BILL) {
      throw ApiError.badRequest('Quotation already converted to a bill');
    }

    const billData = {
      type:           extraData.type || BILL_TYPES.GST,
      customerId:     quotation.customerId?._id || quotation.customerId,
      items:          quotation.items.map((i) => ({
        productId:          i.productId,
        quantity:           i.quantity,
        rate:               i.rate,
        discountPercentage: i.discountPercentage,
        gstRate:            i.gstRate,
        productName:        i.productName,
      })),
      overallDiscount: quotation.overallDiscount,
      paymentMode:     extraData.paymentMode,
      paidAmount:      extraData.paidAmount,
      notes:           extraData.notes || quotation.notes,
      quotationId:     quotation._id,
    };

    return BillService.create(billData, userId);
  }

  static async getById(id) {
    const bill = await BillRepository.findById(id);
    if (!bill) throw ApiError.notFound('Bill not found');
    return bill;
  }

  static async generatePDF(id) {
    const bill = await BillRepository.findById(id);
    if (!bill) throw ApiError.notFound('Bill not found');

    const settings = (await SettingsRepository.get()) || {};
    const pdfUrl   = await generateBillPDF(bill, settings);

    await BillRepository.updateById(id, { pdfUrl });
    return pdfUrl;
  }

  static async list(queryParams) {
    const { page, limit, skip } = parsePagination(queryParams);
    const { search, type, customerId, startDate, endDate } = queryParams;

    const { bills, total } = await BillRepository.findAll(
      { search, type, customerId, startDate, endDate },
      { skip, limit }
    );

    return { bills, pagination: buildPaginationMeta(total, page, limit) };
  }

  static async delete(id) {
    const bill = await BillRepository.findById(id);
    if (!bill) throw ApiError.notFound('Bill not found');
    await BillRepository.deleteById(id);
    return true;
  }
}

module.exports = BillService;
