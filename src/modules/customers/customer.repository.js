'use strict';
const Customer = require('./customer.model');

class CustomerRepository {
  static create(data) {
    return Customer.create(data);
  }

  static findById(id) {
    return Customer.findById(id).lean();
  }

  static updateById(id, data) {
    return Customer.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  static deleteById(id) {
    return Customer.findByIdAndDelete(id);
  }

  /**
   * Search + paginate customers.
   * @param {object} filters  { search, gstOnly }
   * @param {object} pagination { skip, limit }
   */
  static async findAll({ search, gstOnly }, { skip, limit }) {
    const query = { isActive: true };

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name:      regex },
        { mobile:    regex },
        { gstNumber: regex },
      ];
    }
    if (gstOnly === 'true' || gstOnly === true) {
      query.gstNumber = { $ne: null, $exists: true };
    }

    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Customer.countDocuments(query),
    ]);
    return { customers, total };
  }

  static findByMobile(mobile) {
    return Customer.findOne({ mobile }).lean();
  }
}

module.exports = CustomerRepository;
