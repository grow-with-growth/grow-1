import { PrismaClient } from '@prisma/client';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

/**
 * Prisma client instance with logging and error handling
 */
class DatabaseManager {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url,
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    this.setupEventListeners();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Setup Prisma event listeners for logging
   */
  private setupEventListeners(): void {
    this.prisma.$on('query', (e) => {
      logger.debug('Database Query', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
        target: e.target,
      });
    });

    this.prisma.$on('error', (e) => {
      logger.error('Database Error', {
        message: e.message,
        target: e.target,
      });
    });

    this.prisma.$on('info', (e) => {
      logger.info('Database Info', {
        message: e.message,
        target: e.target,
      });
    });

    this.prisma.$on('warn', (e) => {
      logger.warn('Database Warning', {
        message: e.message,
        target: e.target,
      });
    });
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      logger.info('✅ Database connected successfully');
      
      // Test the connection
      await this.healthCheck();
    } catch (error) {
      this.isConnected = false;
      logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Health check for database connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get Prisma client instance
   */
  public getClient(): PrismaClient {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  /**
   * Check if database is connected
   */
  public isDbConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Execute transaction
   */
  public async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
    }
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      maxWait: options?.maxWait || 5000,
      timeout: options?.timeout || 10000,
    });
  }

  /**
   * Get database metrics
   */
  public async getMetrics(): Promise<any> {
    try {
      const metrics = await this.prisma.$metrics.json();
      return metrics;
    } catch (error) {
      logger.error('Failed to get database metrics:', error);
      return null;
    }
  }
}

// Export singleton instance
const databaseManager = DatabaseManager.getInstance();

/**
 * Connect to database
 */
export const connectDatabase = async (): Promise<void> => {
  await databaseManager.connect();
};

/**
 * Disconnect from database
 */
export const disconnectDatabase = async (): Promise<void> => {
  await databaseManager.disconnect();
};

/**
 * Get Prisma client
 */
export const getPrismaClient = (): PrismaClient => {
  return databaseManager.getClient();
};

/**
 * Database health check
 */
export const databaseHealthCheck = async (): Promise<boolean> => {
  return databaseManager.healthCheck();
};

/**
 * Execute database transaction
 */
export const executeTransaction = async <T>(
  fn: (prisma: PrismaClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
  }
): Promise<T> => {
  return databaseManager.transaction(fn, options);
};

/**
 * Get database metrics
 */
export const getDatabaseMetrics = async (): Promise<any> => {
  return databaseManager.getMetrics();
};

// Export the database manager instance
export { databaseManager };
export default databaseManager;
