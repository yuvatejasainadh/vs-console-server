import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { requireRoles } from '../common/guards/rbac.guard';
import { UserRole } from '../roles/roles.enum';

export function createAuditRouter(): Router {
  const router = Router();
  const controller = new AuditController();

  router.use(authMiddleware);
  // Strictly restricted to Super Admin and Admin
  router.use(requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));

  router.get('/', controller.list);
  router.get('/:id', controller.getById);

  return router;
}
