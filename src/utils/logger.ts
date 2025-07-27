import winston from 'winston';
import path from 'path';
import { config } from '@/config/environment';

/**
 * Production-ready logger configuration with Winston
 */
const createLogger = () => {
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  );

  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
  );

  const transports: winston.transport[] = [
    // Console transport for development
    new winston.transports.Console({
      level: config.log.level,
      format: config.app.env === 'production' ? logFormat : consoleFormat,
    }),
  ];

  // File transport for production
  if (config.app.env === 'production') {
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), config.log.file),
        level: config.log.level,
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: config.log.maxFiles,
        tailable: true,
      })
    );

    // Separate error log file
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs/error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
      })
    );
  }

  return winston.createLogger({
    level: config.log.level,
    format: logFormat,
    defaultMeta: {
      service: config.app.name,
      version: config.app.version,
      environment: config.app.env,
    },
    transports,
    exitOnError: false,
  });
};

export const logger = createLogger();

/**
 * Request logger middleware
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

/**
 * Error logger
 */
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
  });
};

/**
 * Performance logger
 */
export const logPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
  logger.info('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  });
};

/**
 * Security logger
 */
export const logSecurity = (event: string, details: Record<string, any>) => {
  logger.warn('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

/**
 * Database logger
 */
export const logDatabase = (query: string, duration: number, error?: Error) => {
  const logData = {
    query: query.substring(0, 200), // Truncate long queries
    duration: `${duration}ms`,
  };

  if (error) {
    logger.error('Database Error', {
      ...logData,
      error: error.message,
    });
  } else if (duration > 1000) {
    logger.warn('Slow Database Query', logData);
  } else {
    logger.debug('Database Query', logData);
  }
};
