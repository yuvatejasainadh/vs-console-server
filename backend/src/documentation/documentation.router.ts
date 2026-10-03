import { Router } from 'express';
import { DocumentationController } from './documentation.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { requireRoles } from '../common/guards/rbac.guard';
import { UserRole } from '../roles/roles.enum';

export function createDocumentationRouter(): Router {
  const router = Router();
  const controller = new DocumentationController();

  router.use(authMiddleware);
  // Testers cannot access developer documentation
  router.use(requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER));

  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.post('/:id/submit', controller.submit);
  router.get('/:id/history', controller.getHistory);
  router.post(
    '/:id/review',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
    controller.review
  );

  return router;
}
