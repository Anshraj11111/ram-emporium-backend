'use strict';
const Bill = require('./bill.model');

class BillRepository {
  static create(data, session) {
    if (session) return Bill.create([data], { session });
    return Bill.create(data);
  }

  static findById(id) {
    return Bill.findById(id)
      .populate('customerId', 'name mobile gstNumber address')
      .populate('createdBy', 'name email')
      .lean();
  }

  static findByBillNo(billNo) {
    return Bill.findOne({ billNo }).lean();
  }

  static updateById(id, data, session) {
    const opts = { new: true, runValidators: true };
    if (session) opts.session = session;
    return Bill.findByIdAndUpdate(id, data, opts).lean();
  }

  static async findAll({ search, type, customerId, startDate, endDate }, { skip, limit }) {
    const query = {};

    if (type)       query.type       = type;
    if (customerId) query.customerId = customerId;

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { billNo:                      regex },
        { 'customerSnapshot.name':     regex },
        { 'customerSnapshot.mobile':   regex },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const [bills, total] = await Promise.all([
      Bill.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-items')        // list view doesn't need items array
        .lean(),
      Bill.countDocuments(query),
    ]);
    return { bills, total };
  }

  /** Used for sales reports */
  static aggregate(pipeline) {
    return Bill.aggregate(pipeline);
  }
}

module.exports = BillRepository;
