import { Response, NextFunction } from 'express';
import { TestingService } from './testing.service';
import {
  CreateTestingObjectiveSchema,
  UpdateTestingObjectiveSchema,
  AssignObjectiveSchema,
  StartTestSessionSchema,
  UpdateTestSessionSchema,
  CreateTestSubmissionSchema,
  UpdateTestSubmissionSchema,
  ReviewTestSubmissionSchema,
} from './testing.dto';
import { AuthenticatedRequest, getParam } from '../common/types';
import { sendPaginatedSuccess, sendSuccess } from '../common/response';
import { UnauthorizedError } from '../common/errors';

export class TestingController {
  private testingService = TestingService.getInstance();

  // --- Objectives ---

  listObjectives = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.testingService.listObjectives(req.user, {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        status: req.query.status as string,
        assignedTo: req.query.assignedTo as string,
        search: req.query.search as string,
      });
      sendPaginatedSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };

  getObjectiveById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const objective = await this.testingService.getObjectiveById(req.user, getParam(req, 'id'));
      sendSuccess(req, res, objective);
    } catch (err) {
      next(err);
    }
  };

  createObjective = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = CreateTestingObjectiveSchema.parse(req.body);
      const objective = await this.testingService.createObjective(req.user, validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, objective, 201);
    } catch (err) {
      next(err);
    }
  };

  updateObjective = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = UpdateTestingObjectiveSchema.parse(req.body);
      const objective = await this.testingService.updateObjective(req.user, getParam(req, 'id'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, objective);
    } catch (err) {
      next(err);
    }
  };

  assignObjective = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = AssignObjectiveSchema.parse(req.body);
      const objective = await this.testingService.assignObjective(req.user, getParam(req, 'id'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, objective);
    } catch (err) {
      next(err);
    }
  };

  // --- Sessions ---

  startSession = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = StartTestSessionSchema.parse(req.body);
      const session = await this.testingService.startSession(req.user, validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, session, 201);
    } catch (err) {
      next(err);
    }
  };

  getSessionById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const session = await this.testingService.getSessionById(req.user, getParam(req, 'id'));
      sendSuccess(req, res, session);
    } catch (err) {
      next(err);
    }
  };

  updateSession = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = UpdateTestSessionSchema.parse(req.body);
      const session = await this.testingService.updateSession(req.user, getParam(req, 'id'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, session);
    } catch (err) {
      next(err);
    }
  };

  submitSession = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const bodyWithSession = {
        ...req.body,
        sessionId: getParam(req, 'id'),
      };
      const validated = CreateTestSubmissionSchema.parse(bodyWithSession);
      const submission = await this.testingService.createSubmission(req.user, validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, submission, 201);
    } catch (err) {
      next(err);
    }
  };

  // --- Submissions & Reviews ---

  createSubmission = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = CreateTestSubmissionSchema.parse(req.body);
      const submission = await this.testingService.createSubmission(req.user, validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, submission, 201);
    } catch (err) {
      next(err);
    }
  };

  listSubmissions = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.testingService.listSubmissions(req.user, {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        status: req.query.status as any,
        outcome: req.query.outcome as string,
        search: req.query.search as string,
      });
      sendPaginatedSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };

  getSubmissionById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const submission = await this.testingService.getSubmissionById(req.user, getParam(req, 'id'));
      sendSuccess(req, res, submission);
    } catch (err) {
      next(err);
    }
  };

  updateSubmission = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = UpdateTestSubmissionSchema.parse(req.body);
      const submission = await this.testingService.updateSubmission(
        req.user,
        getParam(req, 'id'),
        validated,
        {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          requestId: req.requestId,
        }
      );
      sendSuccess(req, res, submission);
    } catch (err) {
      next(err);
    }
  };

  reviewSubmission = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = ReviewTestSubmissionSchema.parse(req.body);
      const submission = await this.testingService.reviewSubmission(
        req.user,
        getParam(req, 'id'),
        validated,
        {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          requestId: req.requestId,
        }
      );
      sendSuccess(req, res, submission);
    } catch (err) {
      next(err);
    }
  };

  approveSubmission = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const feedback = req.body?.feedback || 'Approved';
      const submission = await this.testingService.reviewSubmission(
        req.user,
        getParam(req, 'id'),
        { action: 'APPROVE', feedback },
        {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          requestId: req.requestId,
        }
      );
      sendSuccess(req, res, submission);
    } catch (err) {
      next(err);
    }
  };

  rejectSubmission = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const feedback = req.body?.feedback || 'Rejected';
      const submission = await this.testingService.reviewSubmission(
        req.user,
        getParam(req, 'id'),
        { action: 'REJECT', feedback },
        {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          requestId: req.requestId,
        }
      );
      sendSuccess(req, res, submission);
    } catch (err) {
      next(err);
    }
  };

  requestRetest = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const feedback = req.body?.feedback || 'Re-testing required';
      const submission = await this.testingService.reviewSubmission(
        req.user,
        getParam(req, 'id'),
        { action: 'REQUEST_RETEST', feedback },
        {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          requestId: req.requestId,
        }
      );
      sendSuccess(req, res, submission);
    } catch (err) {
      next(err);
    }
  };
}
