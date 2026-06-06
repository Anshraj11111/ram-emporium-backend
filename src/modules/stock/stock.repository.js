'use strict';
const StockLedger = require('./stockLedger.model');

class StockRepository {
  static create(data, session) {
    if (session) return StockLedger.create([data], { session });
    return StockLedger.create(data);
  }

  /**
   * Bulk create ledger entries (e.g. for a bill with multiple items).
   */
  static bulkCreate(entries, session) {
    if (session) return StockLedger.insertMany(entries, { session });
    return StockLedger.insertMany(entries);
  }

  static findByProduct(productId, { skip, limit }) {
    return Promise.all([
      StockLedger.find({ productId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockLedger.countDocuments({ productId }),
    ]);
  }

  static findByReference(referenceId) {
    return StockLedger.find({ referenceId }).lean();
  }
}

module.exports = StockRepository;
