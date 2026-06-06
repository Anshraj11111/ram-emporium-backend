'use strict';
const ReportsService = require('./reports.service');
const ApiResponse    = require('../../utils/ApiResponse');
const asyncHandler   = require('../../utils/asyncHandler');

const dailySales = asyncHandler(async (req, res) => {
  const result = await ReportsService.dailySales(req.query.date);
  ApiResponse.success(res, result);
});

const monthlySales = asyncHandler(async (req, res) => {
  const result = await ReportsService.monthlySales(req.query.year, req.query.month);
  ApiResponse.success(res, result);
});

const yearlySales = asyncHandler(async (req, res) => {
  const result = await ReportsService.yearlySales(req.query.year);
  ApiResponse.success(res, result);
});

const productWiseSales = asyncHandler(async (req, res) => {
  const result = await ReportsService.productWiseSales(req.query, req.query);
  ApiResponse.paginated(res, result.data, result.pagination);
});

const customerWiseSales = asyncHandler(async (req, res) => {
  const result = await ReportsService.customerWiseSales(req.query, req.query);
  ApiResponse.paginated(res, result.data, result.pagination);
});

const topSellingProducts = asyncHandler(async (req, res) => {
  const result = await ReportsService.topSellingProducts(
    req.query.limit,
    req.query.startDate,
    req.query.endDate
  );
  ApiResponse.success(res, result);
});

const lowStockReport = asyncHandler(async (req, res) => {
  const result = await ReportsService.lowStockReport();
  ApiResponse.success(res, result);
});

const profitReport = asyncHandler(async (req, res) => {
  const result = await ReportsService.profitReport(req.query);
  ApiResponse.success(res, result);
});

module.exports = {
  dailySales, monthlySales, yearlySales,
  productWiseSales, customerWiseSales,
  topSellingProducts, lowStockReport, profitReport,
};
