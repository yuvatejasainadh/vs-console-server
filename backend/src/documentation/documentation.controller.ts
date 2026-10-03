import { Response, NextFunction } from 'express';
import { DocumentationService } from './documentation.service';
import {
  CreateDocumentationSchema,
  UpdateDocumentationSchema,
  ReviewDocumentationSchema,
} from './documentation.dto';
import { AuthenticatedRequest, getParam } from '../common/types';
import { sendSuccess } from '../common/response';
import { UnauthorizedError } from '../common/errors';

export class DocumentationController {
  private docService = DocumentationService.getInstance();

  getByWorkId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const doc = await this.docService.getByWorkId(req.user, getParam(req, 'workId'));
      sendSuccess(req, res, doc);
    } catch (err) {
      next(err);
    }
  };

  createForWork = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = CreateDocumentationSchema.parse(req.body);
      const doc = await this.docService.create(req.user, getParam(req, 'workId'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, doc, 201);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const doc = await this.docService.getById(req.user, getParam(req, 'id'));
      sendSuccess(req, res, doc);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = UpdateDocumentationSchema.parse(req.body);
      const doc = await this.docService.update(req.user, getParam(req, 'id'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, doc);
    } catch (err) {
      next(err);
    }
  };

  submit = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const doc = await this.docService.submit(req.user, getParam(req, 'id'), {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, doc);
    } catch (err) {
      next(err);
    }
  };

  review = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = ReviewDocumentationSchema.parse(req.body);
      const doc = await this.docService.review(req.user, getParam(req, 'id'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, doc);
    } catch (err) {
      next(err);
    }
  };

  getHistory = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const history = await this.docService.getHistory(req.user, getParam(req, 'id'));
      sendSuccess(req, res, history);
    } catch (err) {
      next(err);
    }
  };
}
