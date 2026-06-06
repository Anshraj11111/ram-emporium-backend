'use strict';

/**
 * Custom operational error class.
 * Distinguish operational errors (user-facing) from programmer errors.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode  - HTTP status code
   * @param {string} message     - Human-readable message
   * @param {string} [errorCode] - Machine-readable error code
   * @param {Array}  [errors]    - Validation error details
   */
  constructor(statusCode, message, errorCode = null, errors = []) {
    super(message);
    this.name       = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode  = errorCode;
    this.errors     = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Factory helpers ────────────────────────────
  static badRequest(message, errors = []) {
    return new ApiError(400, message, 'BAD_REQUEST', errors);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message) {
    return new ApiError(409, message, 'CONFLICT');
  }
  static unprocessable(message, errors = []) {
    return new ApiError(422, message, 'UNPROCESSABLE', errors);
  }
  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS');
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

module.exports = ApiError;
