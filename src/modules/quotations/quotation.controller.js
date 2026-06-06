'use strict';
const QuotationService = require('./quotation.service');
const ApiResponse      = require('../../utils/ApiResponse');
const asyncHandler     = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.create(req.body, req.user._id);
  ApiResponse.created(res, quotation, 'Quotation created');
});

const getById = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.getById(req.params.id);
  ApiResponse.success(res, quotation);
});

const update = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.update(req.params.id, req.body, req.user._id);
  ApiResponse.success(res, quotation, 'Quotation updated');
});

const remove = asyncHandler(async (req, res) => {
  await QuotationService.delete(req.params.id);
  ApiResponse.success(res, null, 'Quotation deleted');
});

const updateStatus = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.updateStatus(req.params.id, req.body.status);
  ApiResponse.success(res, quotation, 'Status updated');
});

const duplicate = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.duplicate(req.params.id, req.user._id);
  ApiResponse.created(res, quotation, 'Quotation duplicated');
});

const generatePDF = asyncHandler(async (req, res) => {
  const pdfUrl = await QuotationService.generatePDF(req.params.id);
  ApiResponse.success(res, { pdfUrl }, 'PDF generated');
});

const list = asyncHandler(async (req, res) => {
  const result = await QuotationService.list(req.query);
  ApiResponse.paginated(res, result.quotations, result.pagination);
});

const getForConversion = asyncHandler(async (req, res) => {
  const quotation = await QuotationService.getForConversion(req.params.id);
  ApiResponse.success(res, quotation, 'Ready for conversion');
});

module.exports = {
  create, getById, update, remove, updateStatus,
  duplicate, generatePDF, list, getForConversion,
};
