'use strict';
const BillService        = require('./bill.service');
const BillRepository     = require('./bill.repository');
const SettingsRepository = require('../settings/settings.repository');
const { streamBillPDF }  = require('../../utils/pdfGenerator');
const ApiResponse        = require('../../utils/ApiResponse');
const asyncHandler       = require('../../utils/asyncHandler');
const ApiError           = require('../../utils/ApiError');

const create = asyncHandler(async (req, res) => {
  const bill = await BillService.create(req.body, req.user._id);
  ApiResponse.created(res, bill, 'Bill created');
});

const convertFromQuotation = asyncHandler(async (req, res) => {
  const bill = await BillService.convertFromQuotation(
    req.params.quotationId, req.body, req.user._id
  );
  ApiResponse.created(res, bill, 'Quotation converted to bill successfully');
});

const getById = asyncHandler(async (req, res) => {
  const bill = await BillService.getById(req.params.id);
  ApiResponse.success(res, bill);
});

// ── Stream PDF directly (works on Render free tier) ──
const generatePDF = asyncHandler(async (req, res) => {
  const bill = await BillRepository.findById(req.params.id);
  if (!bill) throw ApiError.notFound('Bill not found');
  const settings = (await SettingsRepository.get()) || {};
  await streamBillPDF(bill, settings, res);
});

const list = asyncHandler(async (req, res) => {
  const result = await BillService.list(req.query);
  ApiResponse.paginated(res, result.bills, result.pagination);
});

const update = asyncHandler(async (req, res) => {
  const bill = await BillService.update(req.params.id, req.body);
  ApiResponse.success(res, bill, 'Bill updated');
});

const deleteBill = asyncHandler(async (req, res) => {
  await BillService.delete(req.params.id);
  ApiResponse.success(res, null, 'Bill deleted');
});

module.exports = { create, convertFromQuotation, getById, generatePDF, list, update, deleteBill };
