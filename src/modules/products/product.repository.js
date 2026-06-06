'use strict';
const Product = require('./product.model');
const { PRODUCT_STATUS } = require('../../constants');

class ProductRepository {
  static create(data) {
    return Product.create(data);
  }

  static findById(id) {
    return Product.findById(id).lean();
  }

  static findBySku(sku) {
    return Product.findOne({ sku: sku.toUpperCase() }).lean();
  }

  static findByBarcode(barcode) {
    return Product.findOne({ barcode }).lean();
  }

  static updateById(id, data) {
    return Product.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  static deleteById(id) {
    return Product.findByIdAndDelete(id);
  }

  /**
   * Full-text autocomplete search – target <100ms.
   * Uses MongoDB text index (name, sku, barcode).
   */
  static async search(query, limit = 10) {
    if (!query || query.trim() === '') return [];

    // Prefix regex for instant autocomplete feel
    const regex = new RegExp(`^${query.trim()}`, 'i');

    const products = await Product.find(
      {
        status: PRODUCT_STATUS.ACTIVE,
        $or: [
          { name:    { $regex: regex } },
          { sku:     { $regex: new RegExp(query.trim(), 'i') } },
          { barcode: query.trim() },
        ],
      },
      // Projection – only fields needed for search dropdown
      { name: 1, sku: 1, sellingPrice: 1, gstRate: 1, unit: 1, stockQty: 1, barcode: 1 }
    )
      .limit(limit)
      .lean();

    return products;
  }

  /**
   * Paginated product list with filters.
   */
  static async findAll({ search, category, status, lowStock }, { skip, limit, sort }) {
    const query = {};

    if (status) query.status = status;
    if (category) query.category = new RegExp(category, 'i');
    if (lowStock === 'true' || lowStock === true) {
      query.$expr = { $lt: ['$stockQty', '$minStockLevel'] };
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name:    regex },
        { sku:     regex },
        { barcode: regex },
      ];
    }

    const sortObj = sort ? JSON.parse(sort) : { createdAt: -1 };

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
      Product.countDocuments(query),
    ]);
    return { products, total };
  }

  /** Get low-stock products for dashboard / alerts */
  static findLowStock(limit = 20) {
    return Product.find({
      status: PRODUCT_STATUS.ACTIVE,
      $expr:  { $lt: ['$stockQty', '$minStockLevel'] },
    })
      .select('name sku stockQty minStockLevel unit location')
      .limit(limit)
      .lean();
  }

  /** Bulk find by array of IDs (used in bill/quotation creation) */
  static findByIds(ids) {
    return Product.find({ _id: { $in: ids } }).lean();
  }

  /** Atomic stock decrement – uses $inc for safety */
  static incrementStock(productId, qty, session) {
    return Product.findByIdAndUpdate(
      productId,
      { $inc: { stockQty: qty } },
      { new: true, session }
    );
  }
}

module.exports = ProductRepository;
