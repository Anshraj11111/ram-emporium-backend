'use strict';
const { PAGINATION } = require('../constants');

/**
 * Parse pagination params from request query.
 * @param {object} query  req.query
 * @returns {{ page, limit, skip }}
 */
const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page, 10)  || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build pagination metadata for API responses.
 * @param {number} total   Total matching documents
 * @param {number} page    Current page
 * @param {number} limit   Items per page
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

module.exports = { parsePagination, buildPaginationMeta };
