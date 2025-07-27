import type { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '@/middleware/errorHandler';

/**
 * Validation schema interface
 */
interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

/**
 * Validation options
 */
interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

/**
 * Request validation middleware
 */
export const validateRequest = (
  schema: ValidationSchema,
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationOptions: Joi.ValidationOptions = {
      abortEarly: options.abortEarly ?? false,
      allowUnknown: options.allowUnknown ?? false,
      stripUnknown: options.stripUnknown ?? true,
    };

    const errors: any[] = [];

    // Validate request body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: 'body',
        })));
      } else {
        req.body = value;
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: 'query',
        })));
      } else {
        req.query = value;
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: 'params',
        })));
      } else {
        req.params = value;
      }
    }

    // Validate headers
    if (schema.headers) {
      const { error, value } = schema.headers.validate(req.headers, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: 'headers',
        })));
      } else {
        req.headers = value;
      }
    }

    // If there are validation errors, throw ValidationError
    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    next();
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // ID parameter validation
  id: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.uuid': 'ID must be a valid UUID',
      'any.required': 'ID is required',
    }),
  }),

  // Pagination query validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Search query validation
  search: Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    filter: Joi.string().optional(),
  }),

  // Date range validation
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  }),

  // Email validation
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),

  // Password validation
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),

  // Name validation
  name: Joi.string().min(1).max(100).trim().required().messages({
    'string.min': 'Name cannot be empty',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  }),

  // Phone number validation
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),

  // URL validation
  url: Joi.string().uri().optional().messages({
    'string.uri': 'Please provide a valid URL',
  }),

  // File upload validation
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().max(10 * 1024 * 1024).required(), // 10MB max
    buffer: Joi.binary().required(),
  }),
};

/**
 * User validation schemas
 */
export const userSchemas = {
  register: Joi.object({
    firstName: commonSchemas.name,
    lastName: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password,
    phone: commonSchemas.phone,
    organizationName: Joi.string().min(1).max(100).optional(),
  }),

  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
    rememberMe: Joi.boolean().default(false),
  }),

  updateProfile: Joi.object({
    firstName: commonSchemas.name.optional(),
    lastName: commonSchemas.name.optional(),
    phone: commonSchemas.phone,
    avatar: Joi.string().uri().optional(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: commonSchemas.password,
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match',
        'any.required': 'Password confirmation is required',
      }),
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email,
  }),

  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required',
    }),
    password: commonSchemas.password,
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match',
        'any.required': 'Password confirmation is required',
      }),
  }),
};

/**
 * Analytics validation schemas
 */
export const analyticsSchemas = {
  createMetric: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    type: Joi.string().valid('counter', 'gauge', 'histogram').required(),
    value: Joi.number().required(),
    tags: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
    timestamp: Joi.date().iso().default(() => new Date()),
  }),

  updateMetric: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    value: Joi.number().optional(),
    tags: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  }),

  getMetrics: Joi.object({
    ...commonSchemas.pagination.describe().keys,
    ...commonSchemas.dateRange.describe().keys,
    type: Joi.string().valid('counter', 'gauge', 'histogram').optional(),
    tags: Joi.string().optional(),
  }),
};
