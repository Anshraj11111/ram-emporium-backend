'use strict';
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, errors, json, colorize, printf } = format;

const LOG_DIR = path.join(__dirname, '../../logs');

const consoleFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // Combined log (all levels)
    new DailyRotateFile({
      filename:      path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern:   'YYYY-MM-DD',
      zippedArchive: true,
      maxSize:       '20m',
      maxFiles:      '30d',
      level:         'info',
    }),
    // Error-only log
    new DailyRotateFile({
      filename:      path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern:   'YYYY-MM-DD',
      zippedArchive: true,
      maxSize:       '20m',
      maxFiles:      '30d',
      level:         'error',
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename:    path.join(LOG_DIR, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles:    '30d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename:    path.join(LOG_DIR, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles:    '30d',
    }),
  ],
});

// Pretty console output in non-production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      errors({ stack: true }),
      consoleFormat
    ),
  }));
}

module.exports = logger;
