'use strict';
const mongoose = require('mongoose');
const { PRODUCT_STATUS, GST_RATES } = require('../../constants');

const productSchema = new mongoose.Schema(
  {
    sku: {
      type:      String,
      required:  [true, 'SKU is required'],
      unique:    true,
      trim:      true,
      uppercase: true,
    },
    name: {
      type:     String,
      required: [true, 'Product name is required'],
      trim:     true,
      maxlength:[250, 'Product name cannot exceed 250 characters'],
    },
    category: {
      type:  String,
      trim:  true,
      index: true,
    },
    unit: {
      type:    String,
      default: 'PCS',
      trim:    true,
    },
    purchasePrice: {
      type: Number,
      min:  [0, 'Purchase price cannot be negative'],
      default: 0,
    },
    sellingPrice: {
      type:     Number,
      required: [true, 'Selling price is required'],
      min:      [0, 'Selling price cannot be negative'],
    },
    gstRate: {
      type:    Number,
      enum:    { values: GST_RATES, message: 'Invalid GST rate' },
      default: 18,
    },
    stockQty: {
      type:    Number,
      default: 0,
      min:     [0, 'Stock quantity cannot be negative'],
    },
    location: {
      type:  String,
      trim:  true,
    },
    minStockLevel: {
      type:    Number,
      default: 5,
      min:     [0, 'Minimum stock level cannot be negative'],
    },
    barcode: {
      type:   String,
      trim:   true,
      sparse: true,
    },
    description: { type: String, trim: true },
    hsn:         { type: String, trim: true },  // HSN code for GST
    status: {
      type:    String,
      enum:    Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.ACTIVE,
    },
  },
  { timestamps: true, versionKey: false }
);

// ── Compound text index for fast autocomplete search ──
productSchema.index(
  { name: 'text', sku: 'text', barcode: 'text' },
  { weights: { name: 10, sku: 5, barcode: 3 }, name: 'product_search_text' }
);

// ── Individual indexes for exact lookups ─────────
productSchema.index({ sku: 1 },      { unique: true });
productSchema.index({ barcode: 1 },  { sparse: true });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ stockQty: 1 }); // for low-stock queries

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
