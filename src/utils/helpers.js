'use strict';
const crypto = require('crypto');

/**
 * Generate a numeric OTP of given length.
 * @param {number} length
 * @returns {string}
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

/**
 * Round a number to 2 decimal places.
 */
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Calculate item-level amounts with discount and GST.
 * @param {object} item  { quantity, rate, discountPercentage, gstRate }
 */
const calculateItemAmounts = ({ quantity, rate, discountPercentage = 0, gstRate = 0 }) => {
  const discountAmount = round2((rate * discountPercentage) / 100);
  const finalRate      = round2(rate - discountAmount);
  const taxableAmount  = round2(finalRate * quantity);
  const gstAmount      = round2((taxableAmount * gstRate) / 100);
  const totalAmount    = round2(taxableAmount + gstAmount);

  return { discountAmount, finalRate, taxableAmount, gstAmount, totalAmount };
};

/**
 * Calculate bill totals from an array of processed items.
 * @param {Array}   items           - Items with taxableAmount and gstAmount
 * @param {number}  overallDiscount - Overall discount percentage on subtotal
 */
const calculateBillTotals = (items, overallDiscount = 0) => {
  const subtotal = round2(items.reduce((s, i) => s + i.taxableAmount, 0));
  const overallDiscountAmount = round2((subtotal * overallDiscount) / 100);
  const taxableAfterDiscount  = round2(subtotal - overallDiscountAmount);
  const gstAmount = round2(items.reduce((s, i) => s + i.gstAmount, 0));
  const grandTotal = round2(taxableAfterDiscount + gstAmount);

  return { subtotal, overallDiscountAmount, gstAmount, grandTotal };
};

/**
 * Pad a sequence number to fixed width.
 * @param {number} seq
 * @param {number} width  default 6
 */
const padSequence = (seq, width = 6) => String(seq).padStart(width, '0');

/**
 * Current year as string.
 */
const currentYear = () => new Date().getFullYear().toString();

/**
 * Safe random hex string (for file names, tokens, etc.).
 */
const randomHex = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');

module.exports = { generateOTP, round2, calculateItemAmounts, calculateBillTotals, padSequence, currentYear, randomHex };
