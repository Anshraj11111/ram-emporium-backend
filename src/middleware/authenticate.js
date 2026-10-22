'use strict';
const jwt          = require('jsonwebtoken');
const env          = require('../config/env');
const ApiError     = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verify JWT access token and attach user to req.user.
 * We trust the JWT payload — no DB call needed on every request.
 * The token already carries id, role, and is signed with our secret.
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
    throw err; // caught by errorHandler (JsonWebTokenError / TokenExpiredError → 401)
  }

  // Attach minimal user object from token payload — no DB round-trip
  req.user = {
    _id:        decoded.id,
    id:         decoded.id,
    role:       decoded.role,
    isVerified: true,
  };

  next();
});

module.exports = authenticate;
