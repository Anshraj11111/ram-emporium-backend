'use strict';
const mongoose = require('mongoose');
const { BILL_TYPES, PAYMENT_MODES } = require('../../constants');

const billItemSchema = new mongoose.Schema(
  {
    productId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku:                { type: String },
    productName:        { type: String, required: true },
    unit:               { type: String },
    quantity:           { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    rate:               { type: Number, required: true, min: [0, 'Rate cannot be negative'] },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount:     { type: Number, default: 0 },
    finalRate:          { type: Number },
    taxableAmount:      { type: Number },
    gstRate:            { type: Number, default: 0 },
    gstAmount:          { type: Number, default: 0 },
    totalAmount:        { type: Number },
    hsn:                { type: String },
  },
  { _id: true }
);

const billSchema = new mongoose.Schema(
  {
    billNo: {
      type:   String,
      unique: true,
      index:  true,
    },
    type: {
      type:     String,
      enum:     Object.values(BILL_TYPES),
      required: true,
      index:    true,
    },
    customerId: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'Customer',
      index: true,
    },
    customerSnapshot: {
      name:      String,
      mobile:    String,
      gstNumber: String,
      address:   String,
      city:      String,
      state:     String,
    },
    items:    [billItemSchema],
    subtotal:              { type: Number, default: 0 },
    overallDiscount:       { type: Number, default: 0 },       // percentage
    overallDiscountAmount: { type: Number, default: 0 },
    gstAmount:             { type: Number, default: 0 },
    roundOff:              { type: Number, default: 0 },
    grandTotal:            { type: Number, default: 0 },
    paymentMode: {
      type:    String,
      enum:    Object.values(PAYMENT_MODES),
      default: PAYMENT_MODES.CASH,
    },
    paidAmount:   { type: Number, default: 0 },
    dueAmount:    { type: Number, default: 0 },
    notes:        { type: String, trim: true },
    pdfUrl:       { type: String },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Quotation',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
  },
  { timestamps: true, versionKey: false }
);

// ── Indexes ──────────────────────────────────────
billSchema.index({ createdAt: -1 });
billSchema.index({ customerId: 1, createdAt: -1 });
billSchema.index({ type: 1, createdAt: -1 });
billSchema.index({ 'customerSnapshot.mobile': 1 });

const Bill = mongoose.model('Bill', billSchema);
module.exports = Bill;
