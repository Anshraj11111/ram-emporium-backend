'use strict';
const mongoose             = require('mongoose');
const QuotationRepository  = require('./quotation.repository');
const ProductRepository    = require('../products/product.repository');
const CustomerRepository   = require('../customers/customer.repository');
const SettingsRepository   = require('../settings/settings.repository');
const CounterService       = require('../stock/counter.service');
const ApiError             = require('../../utils/ApiError');
const { generateQuotationPDF } = require('../../utils/pdfGenerator');
const { calculateItemAmounts, calculateBillTotals } = require('../../utils/helpers');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const { QUOTATION_STATUS } = require('../../constants');

class QuotationService {
  /**
   * Build processed items array (calculate discounts, GST, totals).
   */
  static async _buildItems(rawItems) {
    const productIds = rawItems.map((i) => i.productId);
    const products   = await ProductRepository.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    return rawItems.map((item) => {
      const product = productMap.get(item.productId.toString());
      if (!product) throw ApiError.notFound(`Product ${item.productId} not found`);

      const gstRate    = item.gstRate !== undefined ? item.gstRate : product.gstRate;
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

  static async create(data, userId) {
    const quotationNo = await CounterService.nextQuotationNo();

    // Customer snapshot
    let customerSnapshot = {}
    if (data.customerId) {
      const customer = await CustomerRepository.findById(data.customerId)
      if (!customer) throw ApiError.notFound('Customer not found')
      customerSnapshot = {
        name:      customer.name,
        mobile:    customer.mobile,
        gstNumber: customer.gstNumber,
        address:   [customer.address, customer.city, customer.state].filter(Boolean).join(', '),
      }
    } else if (data.customerName) {
      customerSnapshot = { name: data.customerName }
    }

    const items      = await QuotationService._buildItems(data.items);
    const totals     = calculateBillTotals(items, data.overallDiscount || 0);

    const quotation = await QuotationRepository.create({
      quotationNo,
      customerId:       data.customerId,
      customerSnapshot,
      items,
      overallDiscount:  data.overallDiscount || 0,
      notes:            data.notes,
      termsConditions:  data.termsConditions,
      validUntil:       data.validUntil,
      ...totals,
      createdBy: userId,
    });

    return quotation;
  }

  static async getById(id) {
    const quotation = await QuotationRepository.findById(id);
    if (!quotation) throw ApiError.notFound('Quotation not found');
    return quotation;
  }

  static async update(id, data, userId) {
    const existing = await QuotationRepository.findById(id);
    if (!existing) throw ApiError.notFound('Quotation not found');

    if (existing.status === QUOTATION_STATUS.CONVERTED_TO_BILL) {
      throw ApiError.badRequest('Cannot edit a quotation that has been converted to a bill');
    }

    const updateData = { ...data };

    if (data.items) {
      const items  = await QuotationService._buildItems(data.items);
      const totals = calculateBillTotals(items, data.overallDiscount || existing.overallDiscount);
      Object.assign(updateData, { items, ...totals });
    }

    return QuotationRepository.updateById(id, updateData);
  }

  static async delete(id) {
    const quotation = await QuotationRepository.findById(id);
    if (!quotation) throw ApiError.notFound('Quotation not found');
    if (quotation.status === QUOTATION_STATUS.CONVERTED_TO_BILL) {
      throw ApiError.badRequest('Cannot delete a converted quotation');
    }
    await QuotationRepository.deleteById(id);
    return true;
  }

  static async updateStatus(id, status) {
    const quotation = await QuotationRepository.findById(id);
    if (!quotation) throw ApiError.notFound('Quotation not found');
    return QuotationRepository.updateById(id, { status });
  }

  /**
   * Duplicate a quotation (creates a new DRAFT with the same items).
   */
  static async duplicate(id, userId) {
    const original = await QuotationRepository.findById(id);
    if (!original) throw ApiError.notFound('Quotation not found');

    const quotationNo = await CounterService.nextQuotationNo();

    // Strip _id from items
    const items = original.items.map(({ _id, ...rest }) => rest);

    return QuotationRepository.create({
      quotationNo,
      customerId:       original.customerId,
      customerSnapshot: original.customerSnapshot,
      items,
      subtotal:              original.subtotal,
      overallDiscount:       original.overallDiscount,
      overallDiscountAmount: original.overallDiscountAmount,
      gstAmount:             original.gstAmount,
      grandTotal:            original.grandTotal,
      notes:            original.notes,
      termsConditions:  original.termsConditions,
      validUntil:       original.validUntil,
      status:           QUOTATION_STATUS.DRAFT,
      createdBy:        userId,
    });
  }

  static async generatePDF(id) {
    const quotation = await QuotationRepository.findById(id);
    if (!quotation) throw ApiError.notFound('Quotation not found');

    const settings = (await SettingsRepository.get()) || {};
    const pdfUrl   = await generateQuotationPDF(quotation, settings);

    await QuotationRepository.updateById(id, { pdfUrl });
    return pdfUrl;
  }

  static async list(queryParams) {
    const { page, limit, skip } = parsePagination(queryParams);
    const { search, status, customerId, startDate, endDate } = queryParams;

    const { quotations, total } = await QuotationRepository.findAll(
      { search, status, customerId, startDate, endDate },
      { skip, limit }
    );

    return { quotations, pagination: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Returns the quotation data formatted for bill pre-fill (convert to bill flow).
   */
  static async getForConversion(id) {
    const quotation = await QuotationRepository.findById(id);
    if (!quotation) throw ApiError.notFound('Quotation not found');
    if (quotation.status === QUOTATION_STATUS.CONVERTED_TO_BILL) {
      throw ApiError.badRequest('Quotation already converted to bill');
    }
    if (quotation.status === QUOTATION_STATUS.REJECTED) {
      throw ApiError.badRequest('Cannot convert a rejected quotation');
    }
    return quotation;
  }
}

module.exports = QuotationService;
