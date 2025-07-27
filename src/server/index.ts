import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { authMiddleware } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { apiRoutes } from '@/routes';
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';
import { gracefulShutdown } from '@/utils/gracefulShutdown';

/**
 * Grow Analytics Platform Server
 * Production-ready Express.js server with comprehensive middleware stack
 */
class GrowServer {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware stack
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // Body parsing and compression
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan(config.log.format, {
      stream: { write: (message: string) => logger.info(message.trim()) },
    }));

    // Trust proxy for production deployments
    if (config.app.trustProxy) {
      this.app.set('trust proxy', 1);
    }
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.app.env,
        version: config.app.version,
      });
    });

    // Metrics endpoint for monitoring
    this.app.get('/metrics', (req, res) => {
      res.status(200).json({
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    this.app.use('/api', apiRoutes);

    // Serve static files in production
    if (config.app.env === 'production') {
      this.app.use(express.static('build'));
      this.app.get('*', (req, res) => {
        res.sendFile('index.html', { root: 'build' });
      });
    }
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Connect to databases
      await connectDatabase();
      await connectRedis();

      // Start HTTP server
      this.server = this.app.listen(config.app.port, () => {
        logger.info(`🚀 Grow Analytics Platform started successfully!`);
        logger.info(`📊 Server running on port ${config.app.port}`);
        logger.info(`🌍 Environment: ${config.app.env}`);
        logger.info(`📝 API Documentation: http://localhost:${config.app.port}/api/docs`);
        logger.info(`❤️  Health Check: http://localhost:${config.app.port}/health`);
      });

      // Setup graceful shutdown
      gracefulShutdown(this.server);

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Server stopped successfully');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new GrowServer();
  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { GrowServer };
export default GrowServer;
