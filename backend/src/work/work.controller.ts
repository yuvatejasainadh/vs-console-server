import { Response, NextFunction } from 'express';
import { WorkService } from './work.service';
import {
  CreateWorkItemSchema,
  UpdateWorkItemSchema,
  AssignWorkSchema,
  WorkTransitionNotesSchema,
} from './work.dto';
import { AuthenticatedRequest, getParam } from '../common/types';
import { sendPaginatedSuccess, sendSuccess } from '../common/response';
import { UnauthorizedError } from '../common/errors';

export class WorkController {
  private workService = WorkService.getInstance();

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.workService.list(req.user, {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        status: req.query.status as any,
        assignedTo: req.query.assignedTo as string,
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
      const item = await this.workService.getById(req.user, getParam(req, 'id'));
      sendSuccess(req, res, item);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = CreateWorkItemSchema.parse(req.body);
      const item = await this.workService.create(req.user, validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, item, 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = UpdateWorkItemSchema.parse(req.body);
      const item = await this.workService.update(req.user, getParam(req, 'id'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, item);
    } catch (err) {
      next(err);
    }
  };

  assign = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = AssignWorkSchema.parse(req.body);
      const item = await this.workService.assign(req.user, getParam(req, 'id'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, item);
    } catch (err) {
      next(err);
    }
  };

  accept = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const notes = req.body?.notes;
      const item = await this.workService.transitionStatus(req.user, getParam(req, 'id'), 'ACCEPTED', notes, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, item);
    } catch (err) {
      next(err);
    }
  };

  start = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const notes = req.body?.notes;
      const item = await this.workService.transitionStatus(req.user, getParam(req, 'id'), 'IN_PROGRESS', notes, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, item);
    } catch (err) {
      next(err);
    }
  };

  submitDocumentation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const notes = req.body?.notes;
      const item = await this.workService.transitionStatus(
        req.user,
        getParam(req, 'id'),
        'DOCUMENTATION_SUBMITTED',
        notes,
        {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          requestId: req.requestId,
        }
      );
      sendSuccess(req, res, item);
    } catch (err) {
      next(err);
    }
  };

  complete = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = WorkTransitionNotesSchema.parse(req.body || {});
      const item = await this.workService.transitionStatus(
        req.user,
        getParam(req, 'id'),
        'COMPLETED',
        validated.notes,
        {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          requestId: req.requestId,
        }
      );
      sendSuccess(req, res, item);
    } catch (err) {
      next(err);
    }
  };

  getHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const history = await this.workService.getHistory(req.user, getParam(req, 'id'));
      sendSuccess(req, res, history);
    } catch (err) {
      next(err);
    }
  };
}
