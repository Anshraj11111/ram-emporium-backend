'use strict';
const StockService = require('./stock.service');
const ApiResponse  = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const adjust = asyncHandler(async (req, res) => {
  const result = await StockService.adjust({ ...req.body, createdBy: req.user._id });
  ApiResponse.success(res, result, 'Stock adjusted');
});

const purchase = asyncHandler(async (req, res) => {
  const result = await StockService.purchase({ ...req.body, createdBy: req.user._id });
  ApiResponse.success(res, result, 'Purchase recorded');
});

const getLedger = asyncHandler(async (req, res) => {
  const result = await StockService.getLedger(req.params.productId, req.query);
  ApiResponse.paginated(res, result.entries, result.pagination, 'Stock ledger');
});

module.exports = { adjust, purchase, getLedger };
