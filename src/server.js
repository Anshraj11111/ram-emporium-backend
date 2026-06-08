'use strict';
// Load env FIRST before anything else
require('./config/env');

const http      = require('http');
const app       = require('./app');
const connectDB = require('./config/database');
const logger    = require('./utils/logger');
const env       = require('./config/env');

const server = http.createServer(app);

// ── Graceful shutdown ─────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    require('mongoose').connection.close().then(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    }).catch(() => process.exit(0));
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled rejections / exceptions ────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
  // Don't exit in production – let the process recover
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException');
});

// ── Bootstrap ─────────────────────────────────────
const start = async () => {
  // Startup diagnostics — helps debug Render deploy issues
  console.log(`[BOOT] Node.js ${process.version}`);
  console.log(`[BOOT] NODE_ENV = ${process.env.NODE_ENV}`);
  console.log(`[BOOT] PORT     = ${process.env.PORT}`);
  console.log(`[BOOT] MONGO_URI set: ${!!process.env.MONGO_URI}`);
  console.log(`[BOOT] JWT_ACCESS_SECRET set: ${!!process.env.JWT_ACCESS_SECRET}`);

  await connectDB();

  server.listen(env.PORT, () => {
    logger.info(`🚀 RAM EMPORIUM API running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`   Health: http://localhost:${env.PORT}/health`);
    logger.info(`   API:    http://localhost:${env.PORT}/api/v1`);
  });
};

start().catch(err => {
  console.error('[BOOT] Fatal startup error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
