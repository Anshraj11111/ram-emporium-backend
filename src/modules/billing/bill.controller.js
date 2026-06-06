'use strict';
const BillService  = require('./bill.service');
const ApiResponse  = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const bill = await BillService.create(req.body, req.user._id);
  ApiResponse.created(res, bill, 'Bill created');
});

const convertFromQuotation = asyncHandler(async (req, res) => {
  const bill = await BillService.convertFromQuotation(
    req.params.quotationId,
    req.body,
    req.user._id
  );
  ApiResponse.created(res, bill, 'Quotation converted to bill successfully');
});

const getById = asyncHandler(async (req, res) => {
  const bill = await BillService.getById(req.params.id);
  ApiResponse.success(res, bill);
});

const generatePDF = asyncHandler(async (req, res) => {
  const pdfUrl = await BillService.generatePDF(req.params.id);
  ApiResponse.success(res, { pdfUrl }, 'PDF generated');
});

const list = asyncHandler(async (req, res) => {
  const result = await BillService.list(req.query);
  ApiResponse.paginated(res, result.bills, result.pagination);
});

module.exports = { create, convertFromQuotation, getById, generatePDF, list };
