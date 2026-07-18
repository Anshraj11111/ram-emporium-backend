'use strict';
const CustomBill         = require('./customBill.model')
const Counter            = require('../stock/counter.model')
const SettingsRepository = require('../settings/settings.repository')
const { streamBillPDF }  = require('../../utils/pdfGenerator')
const ApiResponse        = require('../../utils/ApiResponse')
const ApiError           = require('../../utils/ApiError')
const asyncHandler       = require('../../utils/asyncHandler')

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// ── Create custom bill ──────────────────────────────
const create = asyncHandler(async (req, res) => {
  const {
    customerName, customerMobile, customerAddress, customerGst,
    items = [], paymentMode = 'CASH', paidAmount, notes,
  } = req.body

  if (!items.length) throw ApiError.badRequest('At least one item is required')

  // Process items — compute amounts
  let subtotal   = 0
  let cgstTotal  = 0
  let sgstTotal  = 0

  const processedItems = items.map(item => {
    const qty          = Number(item.qty)     || 1
    const rate         = Number(item.rate)    || 0
    const discPct      = Number(item.discount)|| 0
    const cgstPct      = Number(item.cgst)    || 0
    const sgstPct      = Number(item.sgst)    || 0

    const discountAmt  = round2(rate * discPct / 100)
    const finalRate    = round2(rate - discountAmt)
    const taxable      = round2(finalRate * qty)
    const cgstAmt      = round2(taxable * cgstPct / 100)
    const sgstAmt      = round2(taxable * sgstPct / 100)
    const total        = round2(taxable + cgstAmt + sgstAmt)

    subtotal  += taxable
    cgstTotal += cgstAmt
    sgstTotal += sgstAmt

    return {
      description:   item.description || 'Item',
      qty, unit:     item.unit || 'PCS',
      rate, discount: discPct,
      cgst: cgstPct, sgst: sgstPct,
      taxableAmount: taxable,
      cgstAmount:    cgstAmt,
      sgstAmount:    sgstAmt,
      totalAmount:   total,
    }
  })

  subtotal  = round2(subtotal)
  cgstTotal = round2(cgstTotal)
  sgstTotal = round2(sgstTotal)
  const rawGrand  = round2(subtotal + cgstTotal + sgstTotal)
  const roundOff  = round2(Math.round(rawGrand) - rawGrand)
  const grandTotal = Math.round(rawGrand)

  // Generate bill number: CUSTOM-2026-000001
  const year = new Date().getFullYear()
  const seq  = await Counter.getNextSequence('CUSTOM_BILL', year)
  const billNo = `CUSTOM-${year}-${String(seq).padStart(6, '0')}`

  const bill = await CustomBill.create({
    billNo,
    customerName, customerMobile, customerAddress, customerGst,
    items: processedItems,
    subtotal,
    cgstAmount:   cgstTotal,
    sgstAmount:   sgstTotal,
    discountAmount: 0,
    roundOff,
    grandTotal,
    paymentMode,
    paidAmount:  paidAmount != null ? Number(paidAmount) : grandTotal,
    dueAmount:   round2(grandTotal - (paidAmount != null ? Number(paidAmount) : grandTotal)),
    notes,
    createdBy: req.user._id,
  })

  ApiResponse.created(res, bill, 'Custom bill created')
})

// ── List ─────────────────────────────────────────
const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query
  const skip = (page - 1) * limit
  const query = {}
  if (search) {
    const re = new RegExp(search, 'i')
    query.$or = [{ billNo: re }, { customerName: re }, { customerMobile: re }]
  }
  const [bills, total] = await Promise.all([
    CustomBill.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    CustomBill.countDocuments(query),
  ])
  ApiResponse.success(res, bills, 'OK', 200, {
    pagination: {
      total, page: Number(page), limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  })
})

// ── Get by ID ────────────────────────────────────
const getById = asyncHandler(async (req, res) => {
  const bill = await CustomBill.findById(req.params.id).lean()
  if (!bill) throw ApiError.notFound('Custom bill not found')
  ApiResponse.success(res, bill)
})

// ── Update ───────────────────────────────────────
const update = asyncHandler(async (req, res) => {
  const bill = await CustomBill.findById(req.params.id)
  if (!bill) throw ApiError.notFound('Custom bill not found')

  const {
    customerName, customerMobile, customerAddress, customerGst,
    items = [], paymentMode, paidAmount, notes,
  } = req.body

  if (items && items.length === 0) throw ApiError.badRequest('At least one item is required')

  // Process items — compute amounts
  let subtotal   = 0
  let cgstTotal  = 0
  let sgstTotal  = 0

  const processedItems = items.map(item => {
    const qty          = Number(item.qty)     || 1
    const rate         = Number(item.rate)    || 0
    const discPct      = Number(item.discount)|| 0
    const cgstPct      = Number(item.cgst)    || 0
    const sgstPct      = Number(item.sgst)    || 0

    const discountAmt  = round2(rate * discPct / 100)
    const finalRate    = round2(rate - discountAmt)
    const taxable      = round2(finalRate * qty)
    const cgstAmt      = round2(taxable * cgstPct / 100)
    const sgstAmt      = round2(taxable * sgstPct / 100)
    const total        = round2(taxable + cgstAmt + sgstAmt)

    subtotal  += taxable
    cgstTotal += cgstAmt
    sgstTotal += sgstAmt

    return {
      description:   item.description || 'Item',
      qty, unit:     item.unit || 'PCS',
      rate, discount: discPct,
      cgst: cgstPct, sgst: sgstPct,
      taxableAmount: taxable,
      cgstAmount:    cgstAmt,
      sgstAmount:    sgstAmt,
      totalAmount:   total,
    }
  })

  subtotal  = round2(subtotal)
  cgstTotal = round2(cgstTotal)
  sgstTotal = round2(sgstTotal)
  const rawGrand  = round2(subtotal + cgstTotal + sgstTotal)
  const roundOff  = round2(Math.round(rawGrand) - rawGrand)
  const grandTotal = Math.round(rawGrand)

  const updatedPaidAmount = paidAmount !== undefined ? Number(paidAmount) : bill.paidAmount
  const dueAmount = round2(grandTotal - updatedPaidAmount)

  // Update bill
  bill.customerName    = customerName !== undefined ? customerName : bill.customerName
  bill.customerMobile  = customerMobile !== undefined ? customerMobile : bill.customerMobile
  bill.customerAddress = customerAddress !== undefined ? customerAddress : bill.customerAddress
  bill.customerGst     = customerGst !== undefined ? customerGst : bill.customerGst
  bill.items           = processedItems
  bill.subtotal        = subtotal
  bill.cgstAmount      = cgstTotal
  bill.sgstAmount      = sgstTotal
  bill.roundOff        = roundOff
  bill.grandTotal      = grandTotal
  bill.paymentMode     = paymentMode || bill.paymentMode
  bill.paidAmount      = updatedPaidAmount
  bill.dueAmount       = dueAmount
  bill.notes           = notes !== undefined ? notes : bill.notes

  await bill.save()

  ApiResponse.success(res, bill, 'Custom bill updated')
})

// ── Delete ───────────────────────────────────────
const deleteBill = asyncHandler(async (req, res) => {
  await CustomBill.findByIdAndDelete(req.params.id)
  ApiResponse.success(res, null, 'Deleted')
})

// ── Generate PDF ─────────────────────────────────
const generatePDF = asyncHandler(async (req, res) => {
  const bill = await CustomBill.findById(req.params.id).lean()
  if (!bill) throw ApiError.notFound('Custom bill not found')

  const settings = (await SettingsRepository.get()) || {}

  // Map CustomBill to the shape pdfGenerator expects
  const pdfData = {
    billNo:          bill.billNo,
    type:            'GST',
    paymentMode:     bill.paymentMode,
    createdAt:       bill.createdAt,
    customerSnapshot: {
      name:      bill.customerName    || 'Customer',
      mobile:    bill.customerMobile  || '',
      gstNumber: bill.customerGst     || '',
      address:   bill.customerAddress || '',
    },
    items: bill.items.map(i => ({
      productName:        i.description,
      sku:                '',
      unit:               i.unit,
      quantity:           i.qty,
      rate:               i.rate,
      discountPercentage: i.discount,
      gstRate:            (i.cgst || 0) + (i.sgst || 0),
      taxableAmount:      i.taxableAmount,
      gstAmount:          (i.cgstAmount || 0) + (i.sgstAmount || 0),
      totalAmount:        i.totalAmount,
    })),
    subtotal:              bill.subtotal,
    gstAmount:             (bill.cgstAmount || 0) + (bill.sgstAmount || 0),
    overallDiscount:       0,
    overallDiscountAmount: 0,
    roundOff:              bill.roundOff,
    grandTotal:            bill.grandTotal,
    paidAmount:            bill.paidAmount,
    dueAmount:             bill.dueAmount,
  }

  await streamBillPDF(pdfData, settings, res)
})

module.exports = { create, list, getById, update, deleteBill, generatePDF }
