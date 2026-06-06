'use strict';
const mongoose               = require('mongoose');
const StockRepository        = require('./stock.repository');
const ProductRepository      = require('../products/product.repository');
const ApiError               = require('../../utils/ApiError');
const { STOCK_TRANSACTION_TYPES } = require('../../constants');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const logger                 = require('../../utils/logger');

class StockService {
  /**
   * Record a stock movement and update product.stockQty atomically.
   * Positive qty = stock IN, negative qty = stock OUT.
   *
   * @param {object} opts
   * @param {string}  opts.productId
   * @param {string}  opts.transactionType
   * @param {number}  opts.quantity         – signed delta
   * @param {string}  [opts.referenceId]
   * @param {string}  [opts.referenceType]
   * @param {string}  [opts.remarks]
   * @param {string}  [opts.createdBy]
   * @param {ClientSession} [opts.session]
   */
  static async recordMovement({
    productId,
    transactionType,
    quantity,
    referenceId,
    referenceType,
    remarks,
    createdBy,
    session,
  }) {
    const product = await ProductRepository.findById(productId);
    if (!product) throw ApiError.notFound(`Product ${productId} not found`);

    const previousStock = product.stockQty;
    const currentStock  = previousStock + quantity;

    if (currentStock < 0) {
      throw ApiError.badRequest(
        `Insufficient stock for "${product.name}". Available: ${previousStock}, Requested: ${Math.abs(quantity)}`
      );
    }

    const ledgerEntry = {
      productId,
      transactionType,
      quantity,
      previousStock,
      currentStock,
      referenceId,
      referenceType,
      remarks,
      createdBy,
    };

    await StockRepository.create(ledgerEntry, session);
    const updatedProduct = await ProductRepository.incrementStock(productId, quantity, session);

    // Fire low-stock notification asynchronously (non-blocking)
    if (updatedProduct && updatedProduct.stockQty < updatedProduct.minStockLevel) {
      require('../notifications/notification.service')
        .lowStockAlert(updatedProduct)
        .catch((e) => logger.error('Low stock notification failed', { error: e.message }));
    }

    return { previousStock, currentStock };
  }

  /**
   * Bulk movement for bill creation (multiple items in one transaction).
   */
  static async bulkMovement(movements, session) {
    const results = [];
    for (const m of movements) {
      const result = await StockService.recordMovement({ ...m, session });
      results.push(result);
    }
    return results;
  }

  /**
   * Manual stock adjustment by admin/staff.
   */
  static async adjust({ productId, quantity, remarks, createdBy }) {
    const product = await ProductRepository.findById(productId);
    if (!product) throw ApiError.notFound('Product not found');

    const delta = quantity - product.stockQty; // absolute → delta

    return StockService.recordMovement({
      productId,
      transactionType: STOCK_TRANSACTION_TYPES.ADJUSTMENT,
      quantity: delta,
      referenceType: 'Manual',
      remarks: remarks || `Manual adjustment to ${quantity}`,
      createdBy,
    });
  }

  /**
   * Purchase entry – increases stock.
   */
  static async purchase({ productId, quantity, remarks, createdBy }) {
    return StockService.recordMovement({
      productId,
      transactionType: STOCK_TRANSACTION_TYPES.PURCHASE,
      quantity: Math.abs(quantity),
      referenceType: 'Manual',
      remarks: remarks || 'Purchase entry',
      createdBy,
    });
  }

  static async getLedger(productId, queryParams) {
    const product = await ProductRepository.findById(productId);
    if (!product) throw ApiError.notFound('Product not found');

    const { page, limit, skip } = parsePagination(queryParams);
    const [entries, total] = await StockRepository.findByProduct(productId, { skip, limit });

    return {
      product: { name: product.name, sku: product.sku, stockQty: product.stockQty },
      entries,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }
}

module.exports = StockService;
