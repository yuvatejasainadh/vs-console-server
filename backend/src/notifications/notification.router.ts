import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';

export function createNotificationRouter(): Router {
  const router = Router();
  const controller = new NotificationController();

  router.use(authMiddleware);

  router.get('/', controller.list);
  router.post('/:id/read', controller.markAsRead);
  router.post('/read-all', controller.markAllAsRead);

  return router;
}
