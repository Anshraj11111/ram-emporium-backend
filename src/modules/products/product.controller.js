'use strict';
const ProductService = require('./product.service');
const ApiResponse    = require('../../utils/ApiResponse');
const asyncHandler   = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const product = await ProductService.create(req.body);
  ApiResponse.created(res, product, 'Product created');
});

const getById = asyncHandler(async (req, res) => {
  const product = await ProductService.getById(req.params.id);
  ApiResponse.success(res, product);
});

const update = asyncHandler(async (req, res) => {
  const product = await ProductService.update(req.params.id, req.body);
  ApiResponse.success(res, product, 'Product updated');
});

const remove = asyncHandler(async (req, res) => {
  await ProductService.delete(req.params.id);
  ApiResponse.success(res, null, 'Product deleted');
});

const search = asyncHandler(async (req, res) => {
  const { q, limit } = req.query;
  const products = await ProductService.search(q, limit);
  ApiResponse.success(res, products);
});

const list = asyncHandler(async (req, res) => {
  const result = await ProductService.list(req.query);
  ApiResponse.paginated(res, result.products, result.pagination);
});

const lowStock = asyncHandler(async (req, res) => {
  const products = await ProductService.getLowStock(req.query.limit || 20);
  ApiResponse.success(res, products);
});

module.exports = { create, getById, update, remove, search, list, lowStock };
