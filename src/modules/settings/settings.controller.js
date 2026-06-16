'use strict';
const fs                 = require('fs');
const SettingsRepository = require('./settings.repository');
const ApiResponse        = require('../../utils/ApiResponse');
const asyncHandler       = require('../../utils/asyncHandler');
const ApiError           = require('../../utils/ApiError');

const get = asyncHandler(async (req, res) => {
  const settings = await SettingsRepository.get();
  ApiResponse.success(res, settings || {});
});

const upsert = asyncHandler(async (req, res) => {
  const settings = await SettingsRepository.upsert(req.body);
  ApiResponse.success(res, settings, 'Settings saved');
});

/**
 * Store image as base64 data URI in MongoDB.
 * This persists across Render redeployments (no file system needed).
 */
const toDataUri = (file) => {
  const buffer  = fs.readFileSync(file.path);
  const base64  = buffer.toString('base64');
  const mime    = file.mimetype;
  // Clean up temp file
  try { fs.unlinkSync(file.path); } catch {}
  return `data:${mime};base64,${base64}`;
};

const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const dataUri = toDataUri(req.file);
  // Store both the data URI (for PDF) and as logoUrl (for frontend display)
  await SettingsRepository.upsert({ logo: dataUri, logoUrl: dataUri });
  ApiResponse.success(res, { logoUrl: dataUri }, 'Logo uploaded successfully');
});

const uploadSignature = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const dataUri = toDataUri(req.file);
  // Store data URI — works on both local and cloud (no filesystem dependency)
  await SettingsRepository.upsert({ signature: dataUri, signatureUrl: dataUri });
  ApiResponse.success(res, { signatureUrl: dataUri }, 'Signature uploaded successfully');
});

module.exports = { get, upsert, uploadLogo, uploadSignature };
