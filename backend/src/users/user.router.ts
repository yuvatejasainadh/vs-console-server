import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { requireRoles } from '../common/guards/rbac.guard';
import { UserRole } from '../roles/roles.enum';

export function createUserRouter(): Router {
  const router = Router();
  const controller = new UserController();

  router.use(authMiddleware);
  // Only Super Admin and Admin can access user management endpoints
  router.use(requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.post('/:id/disable', controller.disable);

  return router;
}
