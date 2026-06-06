'use strict';
// Set all required env vars BEFORE anything else loads
process.env.NODE_ENV             = 'test';
process.env.JWT_ACCESS_SECRET    = 'test_access_secret_min_32_chars_here_ok';
process.env.JWT_REFRESH_SECRET   = 'test_refresh_secret_min_32_chars_here_ok';
process.env.JWT_ACCESS_EXPIRES_IN  = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS   = '4';   // fast hashing in tests
process.env.OTP_EXPIRY_MINUTES   = '10';
process.env.RATE_LIMIT_MAX       = '1000';
process.env.LOGIN_RATE_LIMIT_MAX = '100';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.PDF_STORAGE_PATH     = './public/pdfs';
process.env.PDF_BASE_URL         = 'http://localhost:5000/pdfs';
process.env.EMAIL_HOST           = 'smtp.example.com';
process.env.EMAIL_PORT           = '587';
process.env.EMAIL_SECURE         = 'false';
process.env.EMAIL_USER           = 'test@example.com';
process.env.EMAIL_PASS           = 'testpass';
process.env.EMAIL_FROM           = 'test@example.com';
process.env.LOG_LEVEL            = 'error'; // suppress logs during tests

const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Increase timeout: replica set init can take 30-60s on first run
// (downloads binary on very first run)
beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await mongoServer.waitUntilRunning();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
}, 120000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
}, 60000);
