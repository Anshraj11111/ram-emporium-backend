'use strict';
const mongoose = require('mongoose');
const { QUOTATION_STATUS } = require('../../constants');

const quotationItemSchema = new mongoose.Schema(
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
  },
  { _id: true }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNo: {
      type:   String,
      unique: true,
      index:  true,
    },
    customerId: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'Customer',
      index: true,
    },
    customerSnapshot: {
      // Snapshot at time of creation so historical data remains intact
      name:      String,
      mobile:    String,
      gstNumber: String,
      address:   String,
    },
    items:    [quotationItemSchema],
    subtotal: { type: Number, default: 0 },
    overallDiscount:       { type: Number, default: 0 },       // percentage
    overallDiscountAmount: { type: Number, default: 0 },
    gstAmount:             { type: Number, default: 0 },
    grandTotal:            { type: Number, default: 0 },
    notes:                 { type: String, trim: true },
    termsConditions:       { type: String, trim: true },
    validUntil:            { type: Date },
    status: {
      type:    String,
      enum:    Object.values(QUOTATION_STATUS),
      default: QUOTATION_STATUS.DRAFT,
      index:   true,
    },
    pdfUrl:     { type: String },
    convertedBillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Bill',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
  },
  { timestamps: true, versionKey: false }
);

// ── Indexes ──────────────────────────────────────
quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ customerId: 1, createdAt: -1 });
quotationSchema.index({ status: 1, createdAt: -1 });

const Quotation = mongoose.model('Quotation', quotationSchema);
module.exports = Quotation;
