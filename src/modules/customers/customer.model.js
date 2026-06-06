'use strict';
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Customer name is required'],
      trim:     true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    mobile: {
      type:  String,
      trim:  true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number'],
    },
    gstNumber: {
      type:      String,
      trim:      true,
      uppercase: true,
      default:   null,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Invalid GST number format',
      ],
      sparse: true,
    },
    address:  { type: String, trim: true },
    city:     { type: String, trim: true },
    state:    { type: String, trim: true },
    pincode:  { type: String, trim: true },
    email:    { type: String, trim: true, lowercase: true },
    notes:    { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

// ── Indexes ──────────────────────────────────────
customerSchema.index({ name: 'text', mobile: 1 });
customerSchema.index({ gstNumber: 1 }, { sparse: true });
customerSchema.index({ mobile: 1 });

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;
