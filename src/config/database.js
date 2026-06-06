'use strict';
const mongoose = require('mongoose');
const env      = require('./env');
const logger   = require('../utils/logger');

const MONGOOSE_OPTIONS = {
  maxPoolSize: 20,       // connection pool
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,             // IPv4
};

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  // In test env, MongoMemoryServer connects mongoose directly in setup.js
  if (process.env.NODE_ENV === 'test') return;

  try {
    const conn = await mongoose.connect(env.MONGO_URI, MONGOOSE_OPTIONS);
    isConnected = true;
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error('MongoDB connection error', { error: err.message });
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('MongoDB reconnected');
});

module.exports = connectDB;
