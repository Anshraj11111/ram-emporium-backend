'use strict';

/**
 * Wraps an async Express route handler and forwards errors to next().
 * Eliminates try/catch boilerplate in every controller.
 *
 * @param {Function} fn  Async route handler (req, res, next)
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
