import request from 'supertest';
import express from 'express';
import healthRoutes from '@/routes/health';

// Mock dependencies
jest.mock('@/config/database', () => ({
  databaseHealthCheck: jest.fn(),
}));

jest.mock('@/config/redis', () => ({
  redisHealthCheck: jest.fn(),
}));

import { databaseHealthCheck } from '@/config/database';
import { redisHealthCheck } from '@/config/redis';

const mockDatabaseHealthCheck = databaseHealthCheck as jest.MockedFunction<typeof databaseHealthCheck>;
const mockRedisHealthCheck = redisHealthCheck as jest.MockedFunction<typeof redisHealthCheck>;

describe('Health Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRoutes);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
        version: expect.any(String),
      });
    });

    it('should return valid timestamp format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health status when all services are healthy', async () => {
      mockDatabaseHealthCheck.mockResolvedValue(true);
      mockRedisHealthCheck.mockResolvedValue(true);

      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
        version: expect.any(String),
        services: {
          database: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
          redis: {
            status: 'healthy',
            responseTime: expect.any(Number),
          },
        },
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        },
      });
    });

    it('should return degraded status when Redis is unhealthy', async () => {
      mockDatabaseHealthCheck.mockResolvedValue(true);
      mockRedisHealthCheck.mockResolvedValue(false);

      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.status).toBe('degraded');
      expect(response.body.services.database.status).toBe('healthy');
      expect(response.body.services.redis.status).toBe('degraded');
    });

    it('should return unhealthy status when database is unhealthy', async () => {
      mockDatabaseHealthCheck.mockResolvedValue(false);
      mockRedisHealthCheck.mockResolvedValue(true);

      const response = await request(app)
        .get('/health/detailed')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.services.database.status).toBe('unhealthy');
    });

    it('should handle database health check errors', async () => {
      mockDatabaseHealthCheck.mockRejectedValue(new Error('Database connection failed'));
      mockRedisHealthCheck.mockResolvedValue(true);

      const response = await request(app)
        .get('/health/detailed')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.services.database.status).toBe('unhealthy');
    });

    it('should handle Redis health check errors', async () => {
      mockDatabaseHealthCheck.mockResolvedValue(true);
      mockRedisHealthCheck.mockRejectedValue(new Error('Redis connection failed'));

      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.status).toBe('degraded');
      expect(response.body.services.redis.status).toBe('unhealthy');
    });
  });

  describe('GET /health/readiness', () => {
    it('should return ready when database is healthy', async () => {
      mockDatabaseHealthCheck.mockResolvedValue(true);

      const response = await request(app)
        .get('/health/readiness')
        .expect(200);

      expect(response.body).toEqual({ status: 'ready' });
    });

    it('should return not ready when database is unhealthy', async () => {
      mockDatabaseHealthCheck.mockResolvedValue(false);

      const response = await request(app)
        .get('/health/readiness')
        .expect(503);

      expect(response.body).toEqual({
        status: 'not ready',
        reason: 'database unavailable',
      });
    });

    it('should handle database health check errors', async () => {
      mockDatabaseHealthCheck.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .get('/health/readiness')
        .expect(503);

      expect(response.body).toEqual({
        status: 'not ready',
        reason: 'internal error',
      });
    });
  });

  describe('GET /health/liveness', () => {
    it('should always return alive', async () => {
      const response = await request(app)
        .get('/health/liveness')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });
});
