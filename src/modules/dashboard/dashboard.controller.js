'use strict';
const DashboardService = require('./dashboard.service');
const ApiResponse      = require('../../utils/ApiResponse');
const asyncHandler     = require('../../utils/asyncHandler');

const getSummary = asyncHandler(async (req, res) => {
  const data = await DashboardService.getSummary();
  ApiResponse.success(res, data, 'Dashboard summary');
});

module.exports = { getSummary };
