'use strict';
const Bill              = require('../billing/bill.model');
const Product           = require('../products/product.model');
const { PRODUCT_STATUS } = require('../../constants');

class DashboardService {
  static async getSummary() {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86400000 - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      salesTodayResult,
      salesMonthResult,
      totalBills,
      totalProducts,
      lowStockProducts,
      recentBills,
      topSelling,
    ] = await Promise.all([
      Bill.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $count: {} } } },
      ]),
      Bill.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $count: {} } } },
      ]),
      Bill.countDocuments(),
      Product.countDocuments({ status: PRODUCT_STATUS.ACTIVE }),
      Product.find({
        status: PRODUCT_STATUS.ACTIVE,
        $expr:  { $lt: ['$stockQty', '$minStockLevel'] },
      })
        .select('name sku stockQty minStockLevel unit')
        .limit(10)
        .lean(),
      Bill.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('billNo type customerSnapshot grandTotal createdAt paymentMode')
        .lean(),
      Bill.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
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
        { $limit: 5 },
      ]),
    ]);

    return {
      totalSalesToday:     salesTodayResult[0]?.total || 0,
      totalBillsToday:     salesTodayResult[0]?.count || 0,
      totalSalesThisMonth: salesMonthResult[0]?.total || 0,
      totalBillsThisMonth: salesMonthResult[0]?.count || 0,
      totalBills,
      totalProducts,
      lowStockCount:       lowStockProducts.length,
      lowStockProducts,
      recentBills,
      topSellingProducts:  topSelling,
    };
  }
}

module.exports = DashboardService;
