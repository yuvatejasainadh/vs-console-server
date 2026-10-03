import { Router } from 'express';
import { DeviceController } from './device.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { requireRoles } from '../common/guards/rbac.guard';
import { UserRole } from '../roles/roles.enum';

export function createDeviceRouter(): Router {
  const router = Router();
  const controller = new DeviceController();

  router.use(authMiddleware);

  // Read endpoints accessible to Super Admin, Admin, and Tester
  router.get('/', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TESTER), controller.list);
  router.get('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TESTER), controller.getById);

  // Mutation endpoints strictly restricted to Super Admin and Admin
  router.post('/', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), controller.create);
  router.patch('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), controller.update);
  router.post('/:id/deactivate', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), controller.deactivate);

  return router;
}
