'use strict';
const CustomerService = require('./customer.service');
const ApiResponse     = require('../../utils/ApiResponse');
const asyncHandler    = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const customer = await CustomerService.create(req.body);
  ApiResponse.created(res, customer, 'Customer created');
});

const getById = asyncHandler(async (req, res) => {
  const customer = await CustomerService.getById(req.params.id);
  ApiResponse.success(res, customer);
});

const update = asyncHandler(async (req, res) => {
  const customer = await CustomerService.update(req.params.id, req.body);
  ApiResponse.success(res, customer, 'Customer updated');
});

const remove = asyncHandler(async (req, res) => {
  await CustomerService.delete(req.params.id);
  ApiResponse.success(res, null, 'Customer deleted');
});

const list = asyncHandler(async (req, res) => {
  const result = await CustomerService.list(req.query);
  ApiResponse.paginated(res, result.customers, result.pagination);
});

module.exports = { create, getById, update, remove, list };
