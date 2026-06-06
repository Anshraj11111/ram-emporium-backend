'use strict';
const jwt     = require('jsonwebtoken');
const env     = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const UserRepository = require('../modules/users/user.repository');

/**
 * Verify JWT access token and attach user to req.user.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token required');
  }

  const token = authHeader.split(' ')[1];
  let decoded;

  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    throw err; // caught by errorHandler (JsonWebTokenError / TokenExpiredError)
  }

  const user = await UserRepository.findById(decoded.id);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isVerified) throw ApiError.forbidden('Please verify your email first');

  req.user = user;
  next();
});

module.exports = authenticate;
