'use strict';
const ApiError    = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger      = require('../utils/logger');

/**
 * Central error handler middleware.
 * Must be registered LAST with 4 parameters (err, req, res, next).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log every error with context
  logger.error('Unhandled error', {
    message:    err.message,
    stack:      err.stack,
    path:       req.path,
    method:     req.method,
    ip:         req.ip,
    statusCode: err.statusCode,
  });

  // Mongoose CastError  (invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.error(res, 400, `Invalid ${err.path}: ${err.value}`, 'INVALID_ID');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiResponse.error(res, 409, `Duplicate value for ${field}`, 'DUPLICATE_KEY');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return ApiResponse.error(res, 422, 'Validation failed', 'VALIDATION_ERROR', errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 401, 'Invalid token', 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 401, 'Token expired', 'TOKEN_EXPIRED');
  }

  // Our operational errors
  if (err instanceof ApiError && err.isOperational) {
    return ApiResponse.error(res, err.statusCode, err.message, err.errorCode, err.errors);
  }

  // Unknown / programmer error – don't leak details in production
  const statusCode = err.statusCode || 500;
  const message    = process.env.NODE_ENV === 'production'
    ? 'Something went wrong. Please try again later.'
    : err.message;

  return ApiResponse.error(res, statusCode, message, 'INTERNAL_ERROR');
};

module.exports = errorHandler;
