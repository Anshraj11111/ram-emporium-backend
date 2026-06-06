'use strict';
const ApiError = require('../utils/ApiError');

/**
 * Role-based access control middleware factory.
 * @param {...string} roles  Allowed roles
 */
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  if (!roles.includes(req.user.role)) {
    throw ApiError.forbidden('You do not have permission to perform this action');
  }
  next();
};

module.exports = authorize;
