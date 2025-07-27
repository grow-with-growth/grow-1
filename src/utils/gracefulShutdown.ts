import { Server } from 'http';
import { logger } from '@/utils/logger';
import { disconnectDatabase } from '@/config/database';
import { disconnectRedis } from '@/config/redis';

/**
 * Graceful shutdown handler for the application
 */
export const gracefulShutdown = (server: Server): void => {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async (error) => {
      if (error) {
        logger.error('Error during server shutdown:', error);
        process.exit(1);
      }

      logger.info('HTTP server closed');

      try {
        // Close database connections
        await disconnectDatabase();
        logger.info('Database connections closed');

        // Close Redis connections
        await disconnectRedis();
        logger.info('Redis connections closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (shutdownError) {
        logger.error('Error during graceful shutdown:', shutdownError);
        process.exit(1);
      }
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Graceful shutdown timeout. Forcing exit...');
      process.exit(1);
    }, 30000); // 30 seconds timeout
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
};
