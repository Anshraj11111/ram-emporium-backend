'use strict';
const ProductRepository = require('./product.repository');
const ApiError          = require('../../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

class ProductService {
  static async create(data) {
    const existing = await ProductRepository.findBySku(data.sku);
    if (existing) throw ApiError.conflict(`SKU "${data.sku}" already exists`);

    if (data.barcode) {
      const byBarcode = await ProductRepository.findByBarcode(data.barcode);
      if (byBarcode) throw ApiError.conflict(`Barcode "${data.barcode}" already assigned to another product`);
    }

    return ProductRepository.create(data);
  }

  static async getById(id) {
    const product = await ProductRepository.findById(id);
    if (!product) throw ApiError.notFound('Product not found');
    return product;
  }

  static async update(id, data) {
    const product = await ProductRepository.findById(id);
    if (!product) throw ApiError.notFound('Product not found');

    // SKU uniqueness check (allow same product)
    if (data.sku && data.sku !== product.sku) {
      const existing = await ProductRepository.findBySku(data.sku);
      if (existing) throw ApiError.conflict(`SKU "${data.sku}" already exists`);
    }

    return ProductRepository.updateById(id, data);
  }

  static async delete(id) {
    const product = await ProductRepository.findById(id);
    if (!product) throw ApiError.notFound('Product not found');
    await ProductRepository.deleteById(id);
    return true;
  }

  static async search(query, limit = 15) {
    return ProductRepository.search(query, limit);
  }

  static async list(queryParams) {
    const { page, limit, skip } = parsePagination(queryParams);
    const { search, category, status, lowStock, sort } = queryParams;

    const { products, total } = await ProductRepository.findAll(
      { search, category, status, lowStock },
      { skip, limit, sort }
    );

    return {
      products,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  static getLowStock(limit) {
    return ProductRepository.findLowStock(limit);
  }
}

module.exports = ProductService;
