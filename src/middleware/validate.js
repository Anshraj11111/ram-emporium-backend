'use strict';
const { ZodError } = require('zod');
const ApiError     = require('../utils/ApiError');

/**
 * Zod validation middleware factory.
 * @param {ZodSchema} schema   Zod schema
 * @param {'body'|'query'|'params'} [source='body']
 */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field:   e.path.join('.'),
      message: e.message,
    }));
    throw ApiError.badRequest('Validation failed', errors);
  }
  req[source] = result.data; // coerce types (e.g. string → number)
  next();
};

module.exports = validate;
