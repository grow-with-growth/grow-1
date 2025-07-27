import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@/middleware/errorHandler';

/**
 * 404 Not Found handler middleware
 * This should be the last middleware before the error handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};
