'use strict';

/**
 * Standardised JSON response envelope.
 *
 * Success  → { success: true,  data, message, meta }
 * Error    → { success: false, error: { code, message, errors } }
 */
class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
    const body = { success: true, message, data };
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  static created(res, data = null, message = 'Created successfully') {
    return ApiResponse.success(res, data, message, 201);
  }

  static paginated(res, data, pagination, message = 'Success') {
    return ApiResponse.success(res, data, message, 200, { pagination });
  }

  static error(res, statusCode = 500, message = 'Internal Server Error', errorCode = null, errors = []) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code:    errorCode || 'ERROR',
        message,
        errors,
      },
    });
  }
}

module.exports = ApiResponse;
