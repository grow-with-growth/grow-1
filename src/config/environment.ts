import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment configuration with validation
 */
const validateEnv = () => {
  const required = (name: string) => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Environment variable ${name} is required`);
    }
    return value;
  };

  const optional = (name: string, defaultValue: string) => {
    return process.env[name] || defaultValue;
  };

  const toNumber = (value: string, defaultValue: number) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  };

  const toBoolean = (value: string, defaultValue: boolean) => {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  };

  return {
    // Application settings
    NODE_ENV: optional('NODE_ENV', 'development') as 'development' | 'production' | 'test',
    PORT: toNumber(optional('PORT', '8000'), 8000),
    CLIENT_PORT: toNumber(optional('CLIENT_PORT', '3000'), 3000),
    APP_NAME: optional('APP_NAME', 'Grow Analytics Platform'),
    APP_VERSION: optional('APP_VERSION', '1.0.0'),
    APP_URL: optional('APP_URL', 'http://localhost:3000'),
    API_URL: optional('API_URL', 'http://localhost:8000'),

    // Database configuration
    DATABASE_URL: optional('DATABASE_URL', 'postgresql://username:password@localhost:5432/grow_db?schema=public'),
    DB_HOST: optional('DB_HOST', 'localhost'),
    DB_PORT: toNumber(optional('DB_PORT', '5432'), 5432),
    DB_NAME: optional('DB_NAME', 'grow_db'),
    DB_USER: optional('DB_USER', 'username'),
    DB_PASSWORD: optional('DB_PASSWORD', 'password'),
    DB_SSL: toBoolean(optional('DB_SSL', 'false'), false),

    // Redis configuration
    REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),
    REDIS_HOST: optional('REDIS_HOST', 'localhost'),
    REDIS_PORT: toNumber(optional('REDIS_PORT', '6379'), 6379),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: toNumber(optional('REDIS_DB', '0'), 0),
    REDIS_TTL: toNumber(optional('REDIS_TTL', '3600'), 3600),

    // Authentication & Security
    JWT_SECRET: optional('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production'),
    JWT_REFRESH_SECRET: optional('JWT_REFRESH_SECRET', 'your-super-secret-refresh-key-change-this-in-production'),
    JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '15m'),
    JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
    SESSION_SECRET: optional('SESSION_SECRET', 'your-super-secret-session-key-change-this-in-production'),
    SESSION_MAX_AGE: toNumber(optional('SESSION_MAX_AGE', '86400000'), 86400000),
    BCRYPT_ROUNDS: toNumber(optional('BCRYPT_ROUNDS', '12'), 12),

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: toNumber(optional('RATE_LIMIT_WINDOW_MS', '900000'), 900000),
    RATE_LIMIT_MAX_REQUESTS: toNumber(optional('RATE_LIMIT_MAX_REQUESTS', '100'), 100),

    // Email configuration
    SMTP_HOST: optional('SMTP_HOST', 'smtp.gmail.com'),
    SMTP_PORT: toNumber(optional('SMTP_PORT', '587'), 587),
    SMTP_SECURE: toBoolean(optional('SMTP_SECURE', 'false'), false),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    FROM_EMAIL: optional('FROM_EMAIL', 'noreply@grow-platform.com'),
    FROM_NAME: optional('FROM_NAME', 'Grow Analytics Platform'),
    SUPPORT_EMAIL: optional('SUPPORT_EMAIL', 'support@grow-platform.com'),

    // File storage
    UPLOAD_DIR: optional('UPLOAD_DIR', 'uploads'),
    MAX_FILE_SIZE: toNumber(optional('MAX_FILE_SIZE', '10485760'), 10485760),
    ALLOWED_FILE_TYPES: optional('ALLOWED_FILE_TYPES', 'jpg,jpeg,png,gif,pdf,csv,xlsx'),

    // AWS S3 (optional)
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: optional('AWS_REGION', 'us-east-1'),
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,

    // Logging & Monitoring
    LOG_LEVEL: optional('LOG_LEVEL', 'info') as 'error' | 'warn' | 'info' | 'debug',
    LOG_FORMAT: optional('LOG_FORMAT', 'combined'),
    LOG_FILE: optional('LOG_FILE', 'logs/app.log'),
    LOG_MAX_SIZE: optional('LOG_MAX_SIZE', '10m'),
    LOG_MAX_FILES: toNumber(optional('LOG_MAX_FILES', '5'), 5),

    // Security headers
    HELMET_ENABLED: toBoolean(optional('HELMET_ENABLED', 'true'), true),
    CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:3000'),
    TRUST_PROXY: toBoolean(optional('TRUST_PROXY', 'false'), false),

    // Feature flags
    FEATURE_ANALYTICS_DASHBOARD: toBoolean(optional('FEATURE_ANALYTICS_DASHBOARD', 'true'), true),
    FEATURE_REAL_TIME_UPDATES: toBoolean(optional('FEATURE_REAL_TIME_UPDATES', 'true'), true),
    FEATURE_EXPORT_DATA: toBoolean(optional('FEATURE_EXPORT_DATA', 'true'), true),
    FEATURE_NOTIFICATIONS: toBoolean(optional('FEATURE_NOTIFICATIONS', 'true'), true),
    FEATURE_MULTI_TENANT: toBoolean(optional('FEATURE_MULTI_TENANT', 'false'), false),
    FEATURE_API_RATE_LIMITING: toBoolean(optional('FEATURE_API_RATE_LIMITING', 'true'), true),
  };
};

// Validate environment variables
const env = validateEnv();

/**
 * Application configuration object
 */
export const config = {
  app: {
    env: env.NODE_ENV,
    port: env.PORT,
    clientPort: env.CLIENT_PORT,
    name: env.APP_NAME,
    version: env.APP_VERSION,
    url: env.APP_URL,
    apiUrl: env.API_URL,
    trustProxy: env.TRUST_PROXY,
  },
  
  database: {
    url: env.DATABASE_URL,
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL,
  },
  
  redis: {
    url: env.REDIS_URL,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    ttl: env.REDIS_TTL,
  },
  
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    sessionSecret: env.SESSION_SECRET,
    sessionMaxAge: env.SESSION_MAX_AGE,
    bcryptRounds: env.BCRYPT_ROUNDS,
  },
  
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  
  email: {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    from: {
      email: env.FROM_EMAIL,
      name: env.FROM_NAME,
    },
    support: env.SUPPORT_EMAIL,
  },
  
  storage: {
    uploadDir: env.UPLOAD_DIR,
    maxFileSize: env.MAX_FILE_SIZE,
    allowedFileTypes: env.ALLOWED_FILE_TYPES.split(','),
    aws: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION,
      s3Bucket: env.AWS_S3_BUCKET,
    },
  },
  
  log: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
    file: env.LOG_FILE,
    maxSize: env.LOG_MAX_SIZE,
    maxFiles: env.LOG_MAX_FILES,
  },
  
  security: {
    helmetEnabled: env.HELMET_ENABLED,
  },
  
  cors: {
    origin: env.CORS_ORIGIN,
  },
  
  features: {
    analyticsDashboard: env.FEATURE_ANALYTICS_DASHBOARD,
    realTimeUpdates: env.FEATURE_REAL_TIME_UPDATES,
    exportData: env.FEATURE_EXPORT_DATA,
    notifications: env.FEATURE_NOTIFICATIONS,
    multiTenant: env.FEATURE_MULTI_TENANT,
    apiRateLimiting: env.FEATURE_API_RATE_LIMITING,
  },
} as const;

export type Config = typeof config;
