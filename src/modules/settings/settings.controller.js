'use strict';
const path               = require('path');
const SettingsRepository = require('./settings.repository');
const ApiResponse        = require('../../utils/ApiResponse');
const asyncHandler       = require('../../utils/asyncHandler');
const ApiError           = require('../../utils/ApiError');
const env                = require('../../config/env');

const get = asyncHandler(async (req, res) => {
  const settings = await SettingsRepository.get();
  ApiResponse.success(res, settings || {});
});

const upsert = asyncHandler(async (req, res) => {
  const settings = await SettingsRepository.upsert(req.body);
  ApiResponse.success(res, settings, 'Settings saved');
});

const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const logoPath = req.file.path;
  const logoUrl  = `${env.PDF_BASE_URL.replace('/pdfs', '')}/uploads/${req.file.filename}`;

  await SettingsRepository.upsert({ logo: logoPath, logoUrl });
  ApiResponse.success(res, { logoUrl }, 'Logo uploaded successfully');
});

module.exports = { get, upsert, uploadLogo };
