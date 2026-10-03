import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { requestContextMiddleware } from './common/middleware/audit.middleware';
import { errorHandler } from './common/middleware/error.middleware';
import { standardRateLimiter } from './common/middleware/rate-limiter.middleware';
import { openApiSpec } from './docs/openapi';
import { NotFoundError } from './common/errors';

// Routers
import { createAuthRouter } from './auth/auth.router';
import { createUserRouter } from './users/user.router';
import { createWorkRouter } from './work/work.router';
import { createDocumentationRouter } from './documentation/documentation.router';
import { createDeviceRouter } from './devices/device.router';
import { createTestingRouter } from './testing/testing.router';
import { createFileRouter } from './files/file.router';
import { createDatabaseRouter } from './database/database.router';
import { createExportRouter } from './exports/export.router';
import { createAuditRouter } from './audit/audit.router';
import { createNotificationRouter } from './notifications/notification.router';
import { createHealthRouter } from './health/health.router';
import { DocumentationController } from './documentation/documentation.controller';
import { authMiddleware } from './common/middleware/auth.middleware';

export function createApp(): Express {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI inline scripts
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow configured origins in development
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
  );

  // Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request ID & Structured Logging Middleware
  app.use(requestContextMiddleware);

  // Standard Rate Limiter
  app.use(standardRateLimiter);

  // Health Checks (Public)
  app.use('/health', createHealthRouter());

  // Swagger Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/api/docs.json', (req: Request, res: Response) => {
    res.json(openApiSpec);
  });

  // API v1 Modules
  const apiV1 = express.Router();
  apiV1.use('/auth', createAuthRouter());
  apiV1.use('/users', createUserRouter());
  apiV1.use('/work', createWorkRouter());

  // Nested routes for work documentation
  const docController = new DocumentationController();
  apiV1.post('/work/:workId/documentation', authMiddleware, docController.createForWork);
  apiV1.get('/work/:workId/documentation', authMiddleware, docController.getByWorkId);

  apiV1.use('/documentation', createDocumentationRouter());
  apiV1.use('/devices', createDeviceRouter());
  apiV1.use('/testing', createTestingRouter());
  apiV1.use('/files', createFileRouter());
  apiV1.use('/database', createDatabaseRouter());
  apiV1.use('/exports', createExportRouter());
  apiV1.use('/audit', createAuditRouter());
  apiV1.use('/notifications', createNotificationRouter());

  app.use('/api/v1', apiV1);

  // 404 Handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
