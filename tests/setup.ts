import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock logger in tests to reduce noise
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logError: jest.fn(),
  logPerformance: jest.fn(),
  logSecurity: jest.fn(),
  logDatabase: jest.fn(),
}));

// Global test setup
beforeAll(async () => {
  // Setup test database if needed
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test database if needed
  console.log('Cleaning up test environment...');
});

// Global test configuration
jest.setTimeout(30000); // 30 seconds timeout for tests

// Mock external services
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-message-id' })),
  })),
}));

// Mock Redis in tests
jest.mock('@/config/redis', () => ({
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    incr: jest.fn(),
    hSet: jest.fn(),
    hGet: jest.fn(),
    hGetAll: jest.fn(),
    lPush: jest.fn(),
    rPop: jest.fn(),
  })),
  redisHealthCheck: jest.fn(() => Promise.resolve(true)),
}));

// Global error handler for unhandled promises in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};
