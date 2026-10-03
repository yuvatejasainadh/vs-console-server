import { Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { AuthenticatedRequest, getParam } from '../common/types';
import { sendPaginatedSuccess, sendSuccess } from '../common/response';
import { UnauthorizedError } from '../common/errors';

export class NotificationController {
  private notificationService = NotificationService.getInstance();

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const readParam = req.query.read !== undefined ? req.query.read === 'true' : undefined;
      const result = await this.notificationService.list(req.user, {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        read: readParam,
      });
      sendPaginatedSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };

  markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const item = await this.notificationService.markAsRead(req.user, getParam(req, 'id'));
      sendSuccess(req, res, item);
    } catch (err) {
      next(err);
    }
  };

  markAllAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.notificationService.markAllAsRead(req.user);
      sendSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };
}
