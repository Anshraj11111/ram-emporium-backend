'use strict';
const mongoose = require('mongoose');
const { STOCK_TRANSACTION_TYPES } = require('../../constants');

const stockLedgerSchema = new mongoose.Schema(
  {
    productId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Product',
      required: true,
      index:    true,
    },
    transactionType: {
      type:     String,
      enum:     Object.values(STOCK_TRANSACTION_TYPES),
      required: true,
    },
    quantity: {
      type:     Number,
      required: true,
      // positive for IN (PURCHASE/ADJUSTMENT+), negative for OUT (SALE/ADJUSTMENT-)
    },
    previousStock: {
      type:     Number,
      required: true,
    },
    currentStock: {
      type:     Number,
      required: true,
    },
    referenceId: {
      // bill._id or quotation._id
      type:  mongoose.Schema.Types.ObjectId,
    },
    referenceType: {
      type: String,
      enum: ['Bill', 'Quotation', 'Manual'],
    },
    remarks: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // ledger is immutable
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────
stockLedgerSchema.index({ productId: 1, createdAt: -1 });
stockLedgerSchema.index({ transactionType: 1 });
stockLedgerSchema.index({ referenceId: 1 });
stockLedgerSchema.index({ createdAt: -1 });

const StockLedger = mongoose.model('StockLedger', stockLedgerSchema);
module.exports = StockLedger;
