'use strict';
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['LOW_STOCK', 'NEW_BILL', 'NEW_QUOTATION', 'SYSTEM', 'INFO'],
      default: 'INFO',
    },
    referenceId:   { type: mongoose.Schema.Types.ObjectId },
    referenceType: { type: String },
    isRead:        { type: Boolean, default: false, index: true },
    userId: {
      // null = broadcast to all; set = user-specific
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'User',
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
