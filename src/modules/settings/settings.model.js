'use strict';
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    shopName:         { type: String, required: true, trim: true },
    ownerName:        { type: String, trim: true },
    mobile:           { type: String, trim: true },
    email:            { type: String, trim: true, lowercase: true },
    address:          { type: String, trim: true },
    city:             { type: String, trim: true },
    state:            { type: String, trim: true },
    pincode:          { type: String, trim: true },
    gstNumber:        { type: String, trim: true, uppercase: true },
    logo:             { type: String },  // base64 data URI or URL
    logoUrl:          { type: String },
    signature:        { type: String },  // base64 data URI — persists on cloud
    signatureUrl:     { type: String },  // same as signature (for frontend display)
    invoicePrefix:    { type: String, default: 'GST',    trim: true },
    nonGstPrefix:     { type: String, default: 'NONGST', trim: true },
    quotationPrefix:  { type: String, default: 'QT',     trim: true },
    termsConditions:  { type: String, trim: true },
    bankName:         { type: String, trim: true },
    bankAccountNo:    { type: String, trim: true },
    bankIfsc:         { type: String, trim: true },
    upiId:            { type: String, trim: true },
    currency:         { type: String, default: 'INR' },
  },
  {
    timestamps:  true,
    versionKey:  false,
    // Only ever ONE settings document
    capped: false,
  }
);

const Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;
