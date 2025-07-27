import { Router } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from '@/config/environment';

// Import route modules
import authRoutes from './auth';
import userRoutes from './users';
import analyticsRoutes from './analytics';
import organizationRoutes from './organizations';
import healthRoutes from './health';

/**
 * Swagger configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Grow Analytics Platform API',
      version: config.app.version,
      description: 'A comprehensive growth analytics platform API with authentication, user management, and analytics tracking.',
      contact: {
        name: 'Grow Team',
        email: 'support@grow-platform.com',
        url: 'https://grow-platform.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: config.app.apiUrl,
        description: 'Development server',
      },
      {
        url: 'https://api.grow-platform.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                statusCode: { type: 'number' },
                timestamp: { type: 'string', format: 'date-time' },
                path: { type: 'string' },
                method: { type: 'string' },
                requestId: { type: 'string' },
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      type: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin', 'manager'] },
            isActive: { type: 'boolean' },
            organizationId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Metric: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['counter', 'gauge', 'histogram'] },
            value: { type: 'number' },
            tags: { type: 'object' },
            userId: { type: 'string', format: 'uuid' },
            organizationId: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            website: { type: 'string', format: 'uri' },
            isActive: { type: 'boolean' },
            settings: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                pages: { type: 'number' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const specs = swaggerJsdoc(swaggerOptions);

/**
 * Main API router
 */
const apiRouter = Router();

/**
 * API Documentation
 */
if (config.app.env !== 'production') {
  apiRouter.use('/docs', swaggerUi.serve);
  apiRouter.get('/docs', swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Grow Analytics Platform API',
  }));

  // Serve OpenAPI spec as JSON
  apiRouter.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}

/**
 * API Routes
 */

// Health check routes (no authentication required)
apiRouter.use('/health', healthRoutes);

// Authentication routes (no authentication required)
apiRouter.use('/auth', authRoutes);

// User management routes (authentication required)
apiRouter.use('/users', userRoutes);

// Analytics routes (authentication required)
apiRouter.use('/analytics', analyticsRoutes);

// Organization routes (authentication required)
apiRouter.use('/organizations', organizationRoutes);

/**
 * API Information endpoint
 */
apiRouter.get('/', (req, res) => {
  res.json({
    name: config.app.name,
    version: config.app.version,
    environment: config.app.env,
    documentation: `${config.app.apiUrl}/api/docs`,
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      analytics: '/api/analytics',
      organizations: '/api/organizations',
    },
    features: config.features,
    timestamp: new Date().toISOString(),
  });
});

export { apiRouter as apiRoutes };
export default apiRouter;
