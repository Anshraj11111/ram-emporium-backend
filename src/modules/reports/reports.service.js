'use strict';
const BillRepository    = require('../billing/bill.repository');
const ProductRepository = require('../products/product.repository');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

class ReportsService {
  // ── Helpers ────────────────────────────────────
  static _dateRange(startDate, endDate) {
    const range = {};
    if (startDate) range.$gte = new Date(startDate);
    if (endDate)   range.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    return Object.keys(range).length ? range : null;
  }

  // ── Daily Sales ─────────────────────────────────
  static async dailySales(date) {
    const day   = date ? new Date(date) : new Date();
    const start = new Date(day.setHours(0, 0, 0, 0));
    const end   = new Date(new Date(start).setHours(23, 59, 59, 999));

    const pipeline = [
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id:        null,
          totalSales: { $sum: '$grandTotal' },
          totalBills: { $count: {} },
          gstSales:   { $sum: { $cond: [{ $eq: ['$type', 'GST'] }, '$grandTotal', 0] } },
          nonGstSales:{ $sum: { $cond: [{ $eq: ['$type', 'NON_GST'] }, '$grandTotal', 0] } },
        },
      },
    ];

    const [result] = await BillRepository.aggregate(pipeline);
    return result || { totalSales: 0, totalBills: 0, gstSales: 0, nonGstSales: 0 };
  }

  // ── Monthly Sales ───────────────────────────────
  static async monthlySales(year, month) {
    const y = parseInt(year, 10) || new Date().getFullYear();
    const m = parseInt(month, 10) || new Date().getMonth() + 1;

    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59, 999);

    const pipeline = [
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id:   { $dayOfMonth: '$createdAt' },
          sales: { $sum: '$grandTotal' },
          bills: { $count: {} },
        },
      },
      { $sort: { _id: 1 } },
    ];

    return BillRepository.aggregate(pipeline);
  }

  // ── Yearly Sales ────────────────────────────────
  static async yearlySales(year) {
    const y     = parseInt(year, 10) || new Date().getFullYear();
    const start = new Date(y, 0, 1);
    const end   = new Date(y, 11, 31, 23, 59, 59, 999);

    const pipeline = [
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id:   { $month: '$createdAt' },
          sales: { $sum: '$grandTotal' },
          bills: { $count: {} },
        },
      },
      { $sort: { _id: 1 } },
    ];

    return BillRepository.aggregate(pipeline);
  }

  // ── Product-wise Sales ──────────────────────────
  static async productWiseSales({ startDate, endDate }, queryParams) {
    const { skip, limit, page } = parsePagination(queryParams);
    const dateRange = ReportsService._dateRange(startDate, endDate);

    const matchStage = dateRange ? { createdAt: dateRange } : {};

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id:          '$items.productId',
          productName:  { $first: '$items.productName' },
          sku:          { $first: '$items.sku' },
          totalQty:     { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalAmount' },
          totalSales:   { $count: {} },
        },
      },
      { $sort: { totalRevenue: -1 } },
      {
        $facet: {
          data:  [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await BillRepository.aggregate(pipeline);
    const total    = result?.total?.[0]?.count || 0;

    return {
      data:       result?.data || [],
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  // ── Customer-wise Sales ─────────────────────────
  static async customerWiseSales({ startDate, endDate }, queryParams) {
    const { skip, limit, page } = parsePagination(queryParams);
    const dateRange = ReportsService._dateRange(startDate, endDate);
    const matchStage = dateRange ? { createdAt: dateRange } : {};

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id:          '$customerId',
          customerName: { $first: '$customerSnapshot.name' },
          mobile:       { $first: '$customerSnapshot.mobile' },
          totalPurchase:{ $sum: '$grandTotal' },
          totalBills:   { $count: {} },
        },
      },
      { $sort: { totalPurchase: -1 } },
      {
        $facet: {
          data:  [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await BillRepository.aggregate(pipeline);
    const total    = result?.total?.[0]?.count || 0;

    return {
      data:       result?.data || [],
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  // ── Top Selling Products ────────────────────────
  static async topSellingProducts(limit = 10, startDate, endDate) {
    const dateRange  = ReportsService._dateRange(startDate, endDate);
    const matchStage = dateRange ? { createdAt: dateRange } : {};

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id:         '$items.productId',
          productName: { $first: '$items.productName' },
          sku:         { $first: '$items.sku' },
          totalQty:    { $sum: '$items.quantity' },
          totalRev:    { $sum: '$items.totalAmount' },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: parseInt(limit, 10) },
    ];

    return BillRepository.aggregate(pipeline);
  }

  // ── Low Stock Report ────────────────────────────
  static async lowStockReport() {
    return ProductRepository.findLowStock(100);
  }

  // ── Profit Report (basic) ───────────────────────
  static async profitReport({ startDate, endDate }) {
    const dateRange  = ReportsService._dateRange(startDate, endDate);
    const matchStage = dateRange ? { createdAt: dateRange } : {};

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $lookup: {
          from:         'products',
          localField:   'items.productId',
          foreignField: '_id',
          as:           'productInfo',
        },
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id:      null,
          revenue:  { $sum: '$items.totalAmount' },
          cost:     { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$productInfo.purchasePrice', 0] }] } },
        },
      },
      {
        $addFields: {
          profit:      { $subtract: ['$revenue', '$cost'] },
          marginPct:   {
            $cond: [
              { $eq: ['$revenue', 0] }, 0,
              { $multiply: [{ $divide: [{ $subtract: ['$revenue', '$cost'] }, '$revenue'] }, 100] },
            ],
          },
        },
      },
    ];

    const [result] = await BillRepository.aggregate(pipeline);
    return result || { revenue: 0, cost: 0, profit: 0, marginPct: 0 };
  }
}

module.exports = ReportsService;
