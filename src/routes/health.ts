import { Router } from 'express';
import { databaseHealthCheck } from '@/config/database';
import { redisHealthCheck } from '@/config/redis';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic application health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Application uptime in seconds
 *                 environment:
 *                   type: string
 *                 version:
 *                   type: string
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
    version: config.app.version,
  });
});

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Returns detailed health status including database and Redis connectivity
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 *                 version:
 *                   type: string
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         responseTime:
 *                           type: number
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         responseTime:
 *                           type: number
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: number
 *                     total:
 *                       type: number
 *                     percentage:
 *                       type: number
 *       503:
 *         description: Service unavailable
 */
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  const healthStatus = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
    version: config.app.version,
    services: {
      database: { status: 'unknown', responseTime: 0 },
      redis: { status: 'unknown', responseTime: 0 },
    },
    memory: {
      used: 0,
      total: 0,
      percentage: 0,
    },
  };

  // Check database health
  try {
    const dbStart = Date.now();
    const dbHealthy = await databaseHealthCheck();
    const dbResponseTime = Date.now() - dbStart;
    
    healthStatus.services.database = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      responseTime: dbResponseTime,
    };
    
    if (!dbHealthy) {
      healthStatus.status = 'unhealthy';
    }
  } catch (error) {
    healthStatus.services.database = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
    };
    healthStatus.status = 'unhealthy';
    logger.error('Database health check failed:', error);
  }

  // Check Redis health
  try {
    const redisStart = Date.now();
    const redisHealthy = await redisHealthCheck();
    const redisResponseTime = Date.now() - redisStart;
    
    healthStatus.services.redis = {
      status: redisHealthy ? 'healthy' : 'degraded',
      responseTime: redisResponseTime,
    };
    
    if (!redisHealthy && healthStatus.status === 'healthy') {
      healthStatus.status = 'degraded';
    }
  } catch (error) {
    healthStatus.services.redis = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
    };
    if (healthStatus.status === 'healthy') {
      healthStatus.status = 'degraded';
    }
    logger.error('Redis health check failed:', error);
  }

  // Memory usage
  const memoryUsage = process.memoryUsage();
  healthStatus.memory = {
    used: memoryUsage.heapUsed,
    total: memoryUsage.heapTotal,
    percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
  };

  // Set appropriate status code
  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                    healthStatus.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(healthStatus);
});

/**
 * @swagger
 * /api/health/readiness:
 *   get:
 *     summary: Readiness probe
 *     description: Kubernetes readiness probe endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready to accept traffic
 *       503:
 *         description: Service is not ready
 */
router.get('/readiness', async (req, res) => {
  try {
    // Check if critical services are available
    const dbHealthy = await databaseHealthCheck();
    
    if (dbHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'database unavailable' });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({ status: 'not ready', reason: 'internal error' });
  }
});

/**
 * @swagger
 * /api/health/liveness:
 *   get:
 *     summary: Liveness probe
 *     description: Kubernetes liveness probe endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/liveness', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
