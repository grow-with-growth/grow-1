import Redis from 'redis';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

/**
 * Redis client manager with connection pooling and error handling
 */
class RedisManager {
  private static instance: RedisManager;
  private client: Redis.RedisClientType;
  private isConnected: boolean = false;

  private constructor() {
    this.client = Redis.createClient({
      url: config.redis.url,
      password: config.redis.password,
      database: config.redis.db,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 50, 1000);
        },
      },
    });

    this.setupEventListeners();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /**
   * Setup Redis event listeners
   */
  private setupEventListeners(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('✅ Redis client ready');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('❌ Redis client error:', error);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis client disconnected');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('✅ Redis connected successfully');
      
      // Test the connection
      await this.healthCheck();
    } catch (error) {
      this.isConnected = false;
      logger.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  /**
   * Health check for Redis connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Get Redis client instance
   */
  public getClient(): Redis.RedisClientType {
    if (!this.isConnected) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  public isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Set key-value pair with optional TTL
   */
  public async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error:', error);
      throw error;
    }
  }

  /**
   * Get value by key
   */
  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      throw error;
    }
  }

  /**
   * Delete key
   */
  public async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      throw error;
    }
  }

  /**
   * Set expiration for key
   */
  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      throw error;
    }
  }

  /**
   * Get TTL for key
   */
  public async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL error:', error);
      throw error;
    }
  }

  /**
   * Increment counter
   */
  public async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis INCR error:', error);
      throw error;
    }
  }

  /**
   * Hash operations
   */
  public async hSet(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hSet(key, field, value);
    } catch (error) {
      logger.error('Redis HSET error:', error);
      throw error;
    }
  }

  public async hGet(key: string, field: string): Promise<string | undefined> {
    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      logger.error('Redis HGET error:', error);
      throw error;
    }
  }

  public async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error('Redis HGETALL error:', error);
      throw error;
    }
  }

  /**
   * List operations
   */
  public async lPush(key: string, ...values: string[]): Promise<number> {
    try {
      return await this.client.lPush(key, values);
    } catch (error) {
      logger.error('Redis LPUSH error:', error);
      throw error;
    }
  }

  public async rPop(key: string): Promise<string | null> {
    try {
      return await this.client.rPop(key);
    } catch (error) {
      logger.error('Redis RPOP error:', error);
      throw error;
    }
  }

  /**
   * Get Redis info
   */
  public async getInfo(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      logger.error('Redis INFO error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const redisManager = RedisManager.getInstance();

/**
 * Connect to Redis
 */
export const connectRedis = async (): Promise<void> => {
  await redisManager.connect();
};

/**
 * Disconnect from Redis
 */
export const disconnectRedis = async (): Promise<void> => {
  await redisManager.disconnect();
};

/**
 * Get Redis client
 */
export const getRedisClient = (): Redis.RedisClientType => {
  return redisManager.getClient();
};

/**
 * Redis health check
 */
export const redisHealthCheck = async (): Promise<boolean> => {
  return redisManager.healthCheck();
};

// Export the Redis manager instance
export { redisManager };
export default redisManager;
