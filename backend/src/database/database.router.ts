import { Router } from 'express';
import { DatabaseController } from './database.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { requireRoles } from '../common/guards/rbac.guard';
import { UserRole } from '../roles/roles.enum';
import { privilegedApiRateLimiter } from '../common/middleware/rate-limiter.middleware';

export function createDatabaseRouter(): Router {
  const router = Router();
  const controller = new DatabaseController();

  router.use(authMiddleware);
  // Strictly restricted to Super Admin and Admin
  router.use(requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));
  router.use(privilegedApiRateLimiter);

  // Dashboard status & schemas
  router.get('/status', controller.getStatus);
  router.get('/info', controller.getInfo);
  router.get('/schemas', controller.getSchemas);
  router.get('/tables', controller.getTables);

  // Database Explorer
  router.get('/schemas/:schema/tables', controller.getSchemaTables);
  router.get('/tables/:table', controller.getTableDetails);
  router.get('/tables/:table/rows', controller.getTableRows);
  router.post('/tables/:table/rows', controller.createRow);
  router.patch('/tables/:table/rows/:id', controller.updateRow);
  router.delete('/tables/:table/rows/:id', controller.deleteRow);

  // Database Users & Roles
  router.get('/users', controller.listUsers);
  router.post('/users', controller.createUser);
  router.patch('/users/:id', controller.updateUser);
  router.post('/users/:id/disable', controller.disableUser);

  // Migrations
  router.get('/migrations', controller.listMigrations);
  router.get('/migrations/:id', controller.getMigrationById);
  router.post('/migrations/:id/apply', controller.applyMigration);

  // Backup & Restore
  router.get('/backups', controller.listBackups);
  router.post('/backups', controller.createBackup);
  router.post('/backups/:backupId/restore-token', controller.getRestoreToken);
  router.post('/restore', controller.restore);

  return router;
}
