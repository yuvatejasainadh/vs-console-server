import { Router } from 'express';
import { ExportController } from './export.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { requireRoles } from '../common/guards/rbac.guard';
import { UserRole } from '../roles/roles.enum';
import { privilegedApiRateLimiter } from '../common/middleware/rate-limiter.middleware';

export function createExportRouter(): Router {
  const router = Router();
  const controller = new ExportController();

  router.use(authMiddleware);
  // Strictly restricted to Super Admin and Admin
  router.use(requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));
  router.use(privilegedApiRateLimiter);

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.get('/:id/download', controller.download);

  return router;
}
