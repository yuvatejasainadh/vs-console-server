import { Router } from 'express';
import { WorkController } from './work.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { requireRoles } from '../common/guards/rbac.guard';
import { UserRole } from '../roles/roles.enum';

export function createWorkRouter(): Router {
  const router = Router();
  const controller = new WorkController();

  router.use(authMiddleware);
  // Testers cannot access engineering work
  router.use(requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER));

  router.get('/', controller.list);
  router.post('/', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.post('/:id/accept', controller.accept);
  router.post('/:id/start', controller.start);
  router.post('/:id/submit-documentation', controller.submitDocumentation);
  router.post('/:id/complete', controller.complete);
  router.post('/:id/assign', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), controller.assign);
  router.get('/:id/history', controller.getHistory);

  return router;
}
