'use strict';
const mongoose = require('mongoose');

// Custom Bill — fully manual, no stock connection
const customBillItemSchema = new mongoose.Schema({
  description: { type: String, required: true },   // any text
  qty:         { type: Number, default: 1 },
  unit:        { type: String, default: 'PCS' },
  rate:        { type: Number, required: true },
  cgst:        { type: Number, default: 0 },       // CGST %
  sgst:        { type: Number, default: 0 },       // SGST %
  discount:    { type: Number, default: 0 },       // discount %
  // computed
  taxableAmount: { type: Number },
  cgstAmount:    { type: Number },
  sgstAmount:    { type: Number },
  totalAmount:   { type: Number },
}, { _id: false })

const customBillSchema = new mongoose.Schema({
  billNo: { type: String, unique: true, index: true },

  // Customer — fully manual
  customerName:    { type: String, trim: true },
  customerMobile:  { type: String, trim: true },
  customerAddress: { type: String, trim: true },
  customerGst:     { type: String, trim: true, uppercase: true },

  items:           [customBillItemSchema],

  subtotal:        { type: Number, default: 0 },
  cgstAmount:      { type: Number, default: 0 },
  sgstAmount:      { type: Number, default: 0 },
  discountAmount:  { type: Number, default: 0 },
  roundOff:        { type: Number, default: 0 },
  grandTotal:      { type: Number, default: 0 },

  paymentMode:     { type: String, default: 'CASH' },
  paidAmount:      { type: Number, default: 0 },
  dueAmount:       { type: Number, default: 0 },
  notes:           { type: String, trim: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false })

customBillSchema.index({ createdAt: -1 })

const CustomBill = mongoose.model('CustomBill', customBillSchema)
module.exports = CustomBill
