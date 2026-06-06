'use strict';
const Counter = require('./counter.model');
const { COUNTER_TYPES } = require('../../constants');
const { padSequence, currentYear } = require('../../utils/helpers');

class CounterService {
  /**
   * Generate next GST bill number:  GST-2026-000001
   */
  static async nextGstBillNo() {
    const year = currentYear();
    const seq  = await Counter.getNextSequence(COUNTER_TYPES.GST_BILL, year);
    return `GST-${year}-${padSequence(seq)}`;
  }

  /**
   * Generate next Non-GST bill number:  NONGST-2026-000001
   */
  static async nextNonGstBillNo() {
    const year = currentYear();
    const seq  = await Counter.getNextSequence(COUNTER_TYPES.NON_GST_BILL, year);
    return `NONGST-${year}-${padSequence(seq)}`;
  }

  /**
   * Generate next quotation number:  QT-2026-000001
   */
  static async nextQuotationNo() {
    const year = currentYear();
    const seq  = await Counter.getNextSequence(COUNTER_TYPES.QUOTATION, year);
    return `QT-${year}-${padSequence(seq)}`;
  }
}

module.exports = CounterService;
