import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { authRateLimiter } from '../common/middleware/rate-limiter.middleware';

export function createAuthRouter(): Router {
  const router = Router();
  const controller = new AuthController();

  router.post('/login', authRateLimiter, controller.login);
  router.post('/refresh', authRateLimiter, controller.refreshToken);
  router.post('/logout', authMiddleware, controller.logout);
  router.get('/me', authMiddleware, controller.me);
  router.post('/change-password', authMiddleware, authRateLimiter, controller.changePassword);

  return router;
}
