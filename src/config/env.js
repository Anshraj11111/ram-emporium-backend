'use strict';
require('dotenv').config();

/**
 * Centralised environment configuration.
 * All process.env references live HERE – never elsewhere.
 */
const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // MongoDB
  MONGO_URI: process.env.MONGO_URI,

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Email
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT, 10) || 587,
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,

  // PDF
  PDF_STORAGE_PATH: process.env.PDF_STORAGE_PATH || './public/pdfs',
  PDF_BASE_URL: process.env.PDF_BASE_URL || 'http://localhost:5000/pdfs',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  LOGIN_RATE_LIMIT_MAX: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5,

  // Bcrypt
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,

  // OTP
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  isProd: () => process.env.NODE_ENV === 'production',
  isDev:  () => process.env.NODE_ENV === 'development',
};

/**
 * Validate critical environment variables at startup.
 * Log warning instead of crash — Render injects vars at runtime.
 */
if (process.env.NODE_ENV !== 'test') {
  const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!env[key]) {
      console.error(`[FATAL] Missing required environment variable: ${key}`);
      console.error('[FATAL] Please set this in Render → Environment → Add Environment Variable');
      process.exit(1);
    }
  }
}

module.exports = env;
