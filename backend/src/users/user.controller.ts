import { Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { CreateUserSchema, UpdateUserSchema } from './user.dto';
import { AuthenticatedRequest, getParam } from '../common/types';
import { sendPaginatedSuccess, sendSuccess } from '../common/response';
import { UnauthorizedError } from '../common/errors';

export class UserController {
  private userService = UserService.getInstance();

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.userService.list(req.user, {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        role: req.query.role as any,
        status: req.query.status as any,
        search: req.query.search as string,
      });
      sendPaginatedSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const user = await this.userService.getById(req.user, getParam(req, 'id'));
      sendSuccess(req, res, user);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = CreateUserSchema.parse(req.body);
      const user = await this.userService.create(req.user, validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, user, 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = UpdateUserSchema.parse(req.body);
      const user = await this.userService.update(req.user, getParam(req, 'id'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, user);
    } catch (err) {
      next(err);
    }
  };

  disable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const user = await this.userService.disable(req.user, getParam(req, 'id'), {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, user);
    } catch (err) {
      next(err);
    }
  };
}
