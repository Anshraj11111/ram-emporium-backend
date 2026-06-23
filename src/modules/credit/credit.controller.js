'use strict';
const Bill       = require('../billing/bill.model');
const CustomBill = require('../billing/customBill.model');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError    = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

// ── Aggregate all unpaid bills grouped by customer mobile ─────────────────
const listCredits = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  // Pull due bills from both sources
  const [regularBills, customBills] = await Promise.all([
    Bill.find({ dueAmount: { $gt: 0 } })
      .select('billNo customerSnapshot grandTotal paidAmount dueAmount paymentMode createdAt')
      .sort({ createdAt: -1 })
      .lean(),
    CustomBill.find({ dueAmount: { $gt: 0 } })
      .select('billNo customerName customerMobile customerAddress grandTotal paidAmount dueAmount paymentMode createdAt')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  // Normalise to a common shape
  const allDue = [
    ...regularBills.map(b => ({
      _id:         b._id,
      billNo:      b.billNo,
      source:      'bill',
      name:        b.customerSnapshot?.name    || 'Walk-in',
      mobile:      b.customerSnapshot?.mobile  || '',
      address:     b.customerSnapshot?.address || '',
      grandTotal:  b.grandTotal,
      paidAmount:  b.paidAmount,
      dueAmount:   b.dueAmount,
      paymentMode: b.paymentMode,
      createdAt:   b.createdAt,
    })),
    ...customBills.map(b => ({
      _id:         b._id,
      billNo:      b.billNo,
      source:      'custom-bill',
      name:        b.customerName    || 'Walk-in',
      mobile:      b.customerMobile  || '',
      address:     b.customerAddress || '',
      grandTotal:  b.grandTotal,
      paidAmount:  b.paidAmount,
      dueAmount:   b.dueAmount,
      paymentMode: b.paymentMode,
      createdAt:   b.createdAt,
    })),
  ];

  // Group by mobile (fallback to name) → customer credit accounts
  const map = new Map();
  for (const bill of allDue) {
    const key = bill.mobile || bill.name || 'unknown';
    if (!map.has(key)) {
      map.set(key, {
        mobile:      bill.mobile,
        name:        bill.name,
        address:     bill.address,
        totalDue:    0,
        totalBilled: 0,
        totalPaid:   0,
        bills:       [],
      });
    }
    const entry = map.get(key);
    entry.totalDue    += bill.dueAmount;
    entry.totalBilled += bill.grandTotal;
    entry.totalPaid   += bill.paidAmount;
    entry.bills.push(bill);
  }

  // Convert to array and apply search
  let customers = Array.from(map.values());
  if (search) {
    const re = new RegExp(search, 'i');
    customers = customers.filter(c => re.test(c.name) || re.test(c.mobile));
  }

  // Sort by highest due first
  customers.sort((a, b) => b.totalDue - a.totalDue);

  const total = customers.length;
  const paged = customers.slice(skip, skip + Number(limit));

  ApiResponse.success(res, paged, 'OK', 200, {
    pagination: {
      total,
      page:       Number(page),
      limit:      Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

// ── Mark a bill as fully paid ─────────────────────────────────────────────
const markPaid = asyncHandler(async (req, res) => {
  const { id, source } = req.params; // source = 'bill' | 'custom-bill'

  let updated;
  if (source === 'custom-bill') {
    updated = await CustomBill.findByIdAndUpdate(
      id,
      [{ $set: { paidAmount: '$grandTotal', dueAmount: 0 } }],
      { new: true }
    ).lean();
  } else {
    updated = await Bill.findByIdAndUpdate(
      id,
      [{ $set: { paidAmount: '$grandTotal', dueAmount: 0 } }],
      { new: true }
    ).lean();
  }

  if (!updated) throw ApiError.notFound('Bill not found');
  ApiResponse.success(res, updated, 'Marked as paid');
});

// ── Add partial payment to a bill ─────────────────────────────────────────
const addPayment = asyncHandler(async (req, res) => {
  const { id, source } = req.params;
  const { amount } = req.body;

  if (!amount || Number(amount) <= 0) throw ApiError.badRequest('Amount must be positive');

  const Model = source === 'custom-bill' ? CustomBill : Bill;
  const bill  = await Model.findById(id).lean();
  if (!bill) throw ApiError.notFound('Bill not found');

  const pay    = Math.min(Number(amount), bill.dueAmount); // can't pay more than due
  const newPaid = Math.round((bill.paidAmount + pay) * 100) / 100;
  const newDue  = Math.round((bill.grandTotal - newPaid) * 100) / 100;

  const updated = await Model.findByIdAndUpdate(
    id,
    { paidAmount: newPaid, dueAmount: Math.max(0, newDue) },
    { new: true }
  ).lean();

  ApiResponse.success(res, updated, 'Payment recorded');
});

module.exports = { listCredits, markPaid, addPayment };
