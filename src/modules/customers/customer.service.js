'use strict';
const CustomerRepository = require('./customer.repository');
const ApiError           = require('../../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

class CustomerService {
  static async create(data) {
    if (data.mobile) {
      const existing = await CustomerRepository.findByMobile(data.mobile);
      if (existing) throw ApiError.conflict('A customer with this mobile number already exists');
    }
    return CustomerRepository.create(data);
  }

  static async getById(id) {
    const customer = await CustomerRepository.findById(id);
    if (!customer) throw ApiError.notFound('Customer not found');
    return customer;
  }

  static async update(id, data) {
    const customer = await CustomerRepository.findById(id);
    if (!customer) throw ApiError.notFound('Customer not found');

    if (data.mobile && data.mobile !== customer.mobile) {
      const existing = await CustomerRepository.findByMobile(data.mobile);
      if (existing) throw ApiError.conflict('Mobile number already in use');
    }

    return CustomerRepository.updateById(id, data);
  }

  static async delete(id) {
    const customer = await CustomerRepository.findById(id);
    if (!customer) throw ApiError.notFound('Customer not found');
    await CustomerRepository.deleteById(id);
    return true;
  }

  static async list(queryParams) {
    const { page, limit, skip } = parsePagination(queryParams);
    const { search, gstOnly }   = queryParams;

    const { customers, total } = await CustomerRepository.findAll(
      { search, gstOnly },
      { skip, limit }
    );

    return {
      customers,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }
}

module.exports = CustomerService;
