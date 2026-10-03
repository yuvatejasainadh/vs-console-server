import { Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import { AuthenticatedRequest, getParam } from '../common/types';
import { sendPaginatedSuccess, sendSuccess } from '../common/response';
import { UnauthorizedError, NotFoundError } from '../common/errors';

export class AuditController {
  private auditService = AuditService.getInstance();

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.auditService.list({
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        actorId: req.query.actorId as string,
        eventType: req.query.eventType as string,
        resourceType: req.query.resourceType as string,
        resourceId: req.query.resourceId as string,
      });
      sendPaginatedSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const log = await this.auditService.getById(getParam(req, 'id'));
      if (!log) throw new NotFoundError('Audit log record not found');
      sendSuccess(req, res, log);
    } catch (err) {
      next(err);
    }
  };
}
