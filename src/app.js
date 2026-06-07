'use strict';
const express         = require('express');
const helmet          = require('helmet');
const cors            = require('cors');
const compression     = require('compression');
const mongoSanitize   = require('express-mongo-sanitize');
const hpp             = require('hpp');
const path            = require('path');

const env             = require('./config/env');
const requestLogger   = require('./middleware/requestLogger');
const errorHandler    = require('./middleware/errorHandler');
const { defaultLimiter } = require('./middleware/rateLimiter');
const ApiResponse     = require('./utils/ApiResponse');
const routes          = require('./routes');

const app = express();

// ── Security middleware ───────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow PDF serving
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    const allowed = [
      env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'https://ram-emporium-88t4.vercel.app',
      'https://ram-emporium.vercel.app',
      'https://ram-emporium-frontend.vercel.app',
    ].filter(Boolean)
    if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true)
    }
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Performance ───────────────────────────────────
app.use(compression());

// ── Body parsers ──────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Sanitisation ─────────────────────────────────
app.use(mongoSanitize());  // Prevent NoSQL injection
app.use(hpp());             // Prevent HTTP parameter pollution

// ── Logging ───────────────────────────────────────
app.use(requestLogger);

// ── Static files (PDFs) ───────────────────────────
app.use('/pdfs', express.static(path.resolve(env.PDF_STORAGE_PATH)));

// ── Rate limiting ─────────────────────────────────
app.use('/api', defaultLimiter);

// ── Health check ──────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success:     true,
    status:      'OK',
    environment: env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────
app.use('/api/v1', routes);

// ── 404 handler ───────────────────────────────────
app.use((req, res) => {
  ApiResponse.error(res, 404, `Route ${req.originalUrl} not found`, 'NOT_FOUND');
});

// ── Central error handler (must be last) ──────────
app.use(errorHandler);

module.exports = app;
