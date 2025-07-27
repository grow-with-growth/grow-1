import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { AuthenticationError, AuthorizationError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

/**
 * User interface for authenticated requests
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  organizationId?: string;
  isActive: boolean;
}

/**
 * Extended Request interface with user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * JWT payload interface
 */
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  organizationId?: string;
  isActive: boolean;
  iat: number;
  exp: number;
}

/**
 * Extract token from request headers
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check for token in cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
};

/**
 * Verify JWT token
 */
const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    } else {
      throw new AuthenticationError('Token verification failed');
    }
  }
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }
    
    const payload = verifyToken(token);
    
    // Check if user is active
    if (!payload.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }
    
    // Attach user to request
    (req as AuthenticatedRequest).user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      organizationId: payload.organizationId,
      isActive: payload.isActive,
    };
    
    // Log authentication success
    logger.debug('User authenticated', {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      path: req.path,
      method: req.method,
    });
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require authentication
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const payload = verifyToken(token);
      
      if (payload.isActive) {
        (req as AuthenticatedRequest).user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions,
          organizationId: payload.organizationId,
          isActive: payload.isActive,
        };
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
    
    if (!roles.includes(user.role)) {
      throw new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`);
    }
    
    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
    
    const hasPermission = permissions.some(permission => 
      user.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      throw new AuthorizationError(`Access denied. Required permissions: ${permissions.join(', ')}`);
    }
    
    next();
  };
};

/**
 * Organization-based authorization middleware
 */
export const requireOrganization = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }
  
  if (!user.organizationId) {
    throw new AuthorizationError('Organization membership required');
  }
  
  next();
};

/**
 * Resource ownership middleware
 * Checks if user owns the resource or has admin privileges
 */
export const requireOwnership = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
    
    // Admin users can access any resource
    if (user.role === 'admin' || user.permissions.includes('admin:all')) {
      return next();
    }
    
    // Check resource ownership
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId !== user.id) {
      throw new AuthorizationError('Access denied. You can only access your own resources');
    }
    
    next();
  };
};

/**
 * Rate limiting by user
 */
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      return next();
    }
    
    const now = Date.now();
    const userKey = user.id;
    const userLimit = userRequests.get(userKey);
    
    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }
    
    if (userLimit.count >= maxRequests) {
      throw new AuthorizationError('User rate limit exceeded');
    }
    
    userLimit.count++;
    next();
  };
};

/**
 * Generate JWT token
 */
export const generateToken = (user: Omit<AuthenticatedUser, 'id'> & { userId: string }): string => {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    organizationId: user.organizationId,
    isActive: user.isActive,
  };
  
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, config.auth.jwtRefreshSecret, {
    expiresIn: config.auth.jwtRefreshExpiresIn,
  });
};
