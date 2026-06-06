'use strict';
module.exports = {
  testEnvironment:    'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testMatch:          ['**/tests/**/*.test.js'],
  testTimeout:        120000,   // 2 min per test (replset can be slow)
  forceExit:          true,
  detectOpenHandles:  true,
  verbose:            true,
  fakeTimers:         { enableGlobally: false },
};
