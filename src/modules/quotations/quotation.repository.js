'use strict';
const Quotation = require('./quotation.model');

class QuotationRepository {
  static create(data, session) {
    if (session) return Quotation.create([data], { session });
    return Quotation.create(data);
  }

  static findById(id) {
    return Quotation.findById(id)
      .populate('customerId', 'name mobile gstNumber address')
      .populate('createdBy', 'name email')
      .lean();
  }

  static findByQuotationNo(quotationNo) {
    return Quotation.findOne({ quotationNo }).lean();
  }

  static updateById(id, data, session) {
    const opts = { new: true, runValidators: true };
    if (session) opts.session = session;
    return Quotation.findByIdAndUpdate(id, data, opts).lean();
  }

  static deleteById(id) {
    return Quotation.findByIdAndDelete(id);
  }

  static async findAll({ search, status, customerId, startDate, endDate }, { skip, limit }) {
    const query = {};

    if (status)     query.status     = status;
    if (customerId) query.customerId = customerId;

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { quotationNo:             regex },
        { 'customerSnapshot.name': regex },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const [quotations, total] = await Promise.all([
      Quotation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'name mobile')
        .lean(),
      Quotation.countDocuments(query),
    ]);
    return { quotations, total };
  }
}

module.exports = QuotationRepository;
