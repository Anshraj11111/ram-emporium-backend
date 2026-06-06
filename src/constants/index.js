'use strict';

// ── Roles ────────────────────────────────────────
const ROLES = Object.freeze({
  ADMIN: 'admin',
  STAFF: 'staff',
});

// ── Bill Types ───────────────────────────────────
const BILL_TYPES = Object.freeze({
  GST:     'GST',
  NON_GST: 'NON_GST',
});

// ── Quotation Status ─────────────────────────────
const QUOTATION_STATUS = Object.freeze({
  DRAFT:            'DRAFT',
  SENT:             'SENT',
  APPROVED:         'APPROVED',
  REJECTED:         'REJECTED',
  CONVERTED_TO_BILL:'CONVERTED_TO_BILL',
});

// ── Stock Transaction Types ──────────────────────
const STOCK_TRANSACTION_TYPES = Object.freeze({
  PURCHASE:   'PURCHASE',
  SALE:       'SALE',
  ADJUSTMENT: 'ADJUSTMENT',
});

// ── Payment Modes ────────────────────────────────
const PAYMENT_MODES = Object.freeze({
  CASH:   'CASH',
  CARD:   'CARD',
  UPI:    'UPI',
  CREDIT: 'CREDIT',
  CHEQUE: 'CHEQUE',
  NEFT:   'NEFT',
  RTGS:   'RTGS',
});

// ── Counter Types ────────────────────────────────
const COUNTER_TYPES = Object.freeze({
  GST_BILL:     'GST_BILL',
  NON_GST_BILL: 'NON_GST_BILL',
  QUOTATION:    'QUOTATION',
});

// ── Product Status ───────────────────────────────
const PRODUCT_STATUS = Object.freeze({
  ACTIVE:   'ACTIVE',
  INACTIVE: 'INACTIVE',
});

// ── Common GST Rates ─────────────────────────────
const GST_RATES = Object.freeze([0, 3, 5, 12, 18, 28]);

// ── Pagination defaults ──────────────────────────
const PAGINATION = Object.freeze({
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT:     100,
});

module.exports = {
  ROLES,
  BILL_TYPES,
  QUOTATION_STATUS,
  STOCK_TRANSACTION_TYPES,
  PAYMENT_MODES,
  COUNTER_TYPES,
  PRODUCT_STATUS,
  GST_RATES,
  PAGINATION,
};
