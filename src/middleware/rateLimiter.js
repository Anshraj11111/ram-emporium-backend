'use strict';
const rateLimit = require('express-rate-limit');
const env       = require('../config/env');

const defaultLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' } },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Please wait 15 minutes.' } },
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Search rate limit exceeded.' } },
});

module.exports = { defaultLimiter, loginLimiter, searchLimiter };
