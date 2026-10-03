import { Response, NextFunction } from 'express';
import { RdsService } from './services/rds.service';
import { DatabaseExplorerService } from './services/explorer.service';
import { DatabaseUserService } from './services/db-user.service';
import { MigrationService } from './services/migration.service';
import { BackupRestoreService } from './services/backup-restore.service';
import { AuthenticatedRequest, getParam } from '../common/types';
import { sendPaginatedSuccess, sendSuccess } from '../common/response';
import { UnauthorizedError, BadRequestError } from '../common/errors';

export class DatabaseController {
  private rdsService = RdsService.getInstance();
  private explorerService = DatabaseExplorerService.getInstance();
  private dbUserService = DatabaseUserService.getInstance();
  private migrationService = MigrationService.getInstance();
  private backupService = BackupRestoreService.getInstance();

  // --- Dashboard ---

  getStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const status = await this.rdsService.getStatus(req.user, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, status);
    } catch (err) {
      next(err);
    }
  };

  getInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const info = await this.rdsService.getInfo(req.user, { requestId: req.requestId });
      sendSuccess(req, res, info);
    } catch (err) {
      next(err);
    }
  };

  getSchemas = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const schemas = await this.rdsService.getSchemas(req.user);
      sendSuccess(req, res, schemas);
    } catch (err) {
      next(err);
    }
  };

  getTables = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const tables = await this.rdsService.getTables(req.user);
      sendSuccess(req, res, tables);
    } catch (err) {
      next(err);
    }
  };

  // --- Explorer ---

  getSchemaTables = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const tables = await this.explorerService.getTablesBySchema(getParam(req, 'schema'));
      sendSuccess(req, res, tables);
    } catch (err) {
      next(err);
    }
  };

  getTableDetails = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const details = await this.explorerService.getTableDetails(getParam(req, 'table'));
      sendSuccess(req, res, details);
    } catch (err) {
      next(err);
    }
  };

  getTableRows = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.explorerService.getTableRows(
        req.user,
        getParam(req, 'table'),
        {
          page: req.query.page ? Number(req.query.page) : undefined,
          pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        },
        {
          requestId: req.requestId,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );
      sendPaginatedSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };

  createRow = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const row = await this.explorerService.createRow(req.user, getParam(req, 'table'), req.body, {
        requestId: req.requestId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      sendSuccess(req, res, row, 201);
    } catch (err) {
      next(err);
    }
  };

  updateRow = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const row = await this.explorerService.updateRow(
        req.user,
        getParam(req, 'table'),
        getParam(req, 'id'),
        req.body,
        {
          requestId: req.requestId,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );
      sendSuccess(req, res, row);
    } catch (err) {
      next(err);
    }
  };

  deleteRow = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.explorerService.deleteRow(
        req.user,
        getParam(req, 'table'),
        getParam(req, 'id'),
        {
          requestId: req.requestId,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );
      sendSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };

  // --- Database Users ---

  listUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const users = await this.dbUserService.list(req.user);
      sendSuccess(req, res, users);
    } catch (err) {
      next(err);
    }
  };

  createUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const user = await this.dbUserService.create(req.user, req.body, {
        requestId: req.requestId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      sendSuccess(req, res, user, 201);
    } catch (err) {
      next(err);
    }
  };

  updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const user = await this.dbUserService.update(req.user, getParam(req, 'id'), req.body, {
        requestId: req.requestId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      sendSuccess(req, res, user);
    } catch (err) {
      next(err);
    }
  };

  disableUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const user = await this.dbUserService.disable(req.user, getParam(req, 'id'), {
        requestId: req.requestId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      sendSuccess(req, res, user);
    } catch (err) {
      next(err);
    }
  };

  // --- Migrations ---

  listMigrations = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const migrations = await this.migrationService.list(req.user);
      sendSuccess(req, res, migrations);
    } catch (err) {
      next(err);
    }
  };

  getMigrationById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const migration = await this.migrationService.getById(req.user, getParam(req, 'id'));
      sendSuccess(req, res, migration);
    } catch (err) {
      next(err);
    }
  };

  applyMigration = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const migration = await this.migrationService.apply(req.user, getParam(req, 'id'), {
        requestId: req.requestId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      sendSuccess(req, res, migration);
    } catch (err) {
      next(err);
    }
  };

  // --- Backup & Restore ---

  listBackups = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const backups = await this.backupService.list(req.user);
      sendSuccess(req, res, backups);
    } catch (err) {
      next(err);
    }
  };

  createBackup = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const backup = await this.backupService.createBackup(req.user, {
        requestId: req.requestId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      sendSuccess(req, res, backup, 201);
    } catch (err) {
      next(err);
    }
  };

  getRestoreToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const backupId = getParam(req, 'backupId') || req.body?.backupId;
      if (!backupId) throw new BadRequestError('backupId is required');
      const tokenInfo = await this.backupService.generateRestoreConfirmationToken(req.user, backupId);
      sendSuccess(req, res, tokenInfo);
    } catch (err) {
      next(err);
    }
  };

  restore = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { backupId, confirmationToken } = req.body || {};
      if (!backupId || !confirmationToken) {
        throw new BadRequestError('backupId and confirmationToken are required');
      }

      const result = await this.backupService.restore(
        req.user,
        { backupId, confirmationToken },
        {
          requestId: req.requestId,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );
      sendSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };
}
