'use strict';
const mongoose = require('mongoose');
const { COUNTER_TYPES } = require('../../constants');

const counterSchema = new mongoose.Schema(
  {
    type: {
      type:     String,
      required: true,
      unique:   true,
      // e.g. "GST_BILL_2026", "NON_GST_BILL_2026", "QUOTATION_2026"
    },
    sequence: {
      type:    Number,
      default: 0,
    },
  },
  { versionKey: false }
);

/**
 * Atomically increment and return the next sequence for a given type+year.
 * Safe against concurrent requests.
 * @param {string} type    Counter type (from COUNTER_TYPES)
 * @param {number} year    Current year
 * @returns {Promise<number>}
 */
counterSchema.statics.getNextSequence = async function (type, year) {
  const key = `${type}_${year}`;
  const doc = await this.findOneAndUpdate(
    { type: key },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.sequence;
};

const Counter = mongoose.model('Counter', counterSchema);
module.exports = Counter;
