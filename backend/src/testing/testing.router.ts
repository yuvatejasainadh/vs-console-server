import { Router } from 'express';
import { TestingController } from './testing.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { requireRoles } from '../common/guards/rbac.guard';
import { UserRole } from '../roles/roles.enum';

export function createTestingRouter(): Router {
  const router = Router();
  const controller = new TestingController();

  router.use(authMiddleware);

  // Objectives
  router.get('/objectives', controller.listObjectives);
  router.post(
    '/objectives',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER),
    controller.createObjective
  );
  router.get('/objectives/:id', controller.getObjectiveById);
  router.patch(
    '/objectives/:id',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER),
    controller.updateObjective
  );
  router.post(
    '/objectives/:id/assign',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER),
    controller.assignObjective
  );

  // Quick Test Sessions
  router.post('/sessions', controller.startSession);
  router.get('/sessions/:id', controller.getSessionById);
  router.patch('/sessions/:id', controller.updateSession);
  router.post('/sessions/:id/submit', controller.submitSession);

  // Submissions & Reviews
  router.get('/submissions', controller.listSubmissions);
  router.post('/submissions', controller.createSubmission);
  router.get('/submissions/:id', controller.getSubmissionById);
  router.patch('/:id', controller.updateSubmission); // generic patch or below
  router.patch('/submissions/:id', controller.updateSubmission);

  // Privileged Review Actions (Admin & Super Admin only)
  router.post(
    '/submissions/:id/review',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
    controller.reviewSubmission
  );
  router.post(
    '/submissions/:id/approve',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
    controller.approveSubmission
  );
  router.post(
    '/submissions/:id/reject',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
    controller.rejectSubmission
  );
  router.post(
    '/submissions/:id/request-retest',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN),
    controller.requestRetest
  );

  return router;
}
