import { Router } from 'express';
import { HealthController } from './health.controller';

export function createHealthRouter(): Router {
  const router = Router();
  const controller = new HealthController();

  router.get('/', controller.getHealth);
  router.get('/live', controller.getLive);
  router.get('/ready', controller.getReady);

  return router;
}
