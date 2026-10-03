import { Response, NextFunction } from 'express';
import { FileService } from './file.service';
import { AuthenticatedRequest, getParam } from '../common/types';
import { sendSuccess } from '../common/response';
import { UnauthorizedError, BadRequestError } from '../common/errors';

export class FileController {
  private fileService = FileService.getInstance();

  upload = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const submissionId = req.body?.submissionId || (req.query?.submissionId as string);
      if (!submissionId) {
        throw new BadRequestError('submissionId is required');
      }

      const file = req.file;
      if (!file) {
        throw new BadRequestError('File must be uploaded in "file" field');
      }

      const result = await this.fileService.uploadEvidenceFile(req.user, submissionId, file, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      sendSuccess(req, res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const file = await this.fileService.getById(req.user, getParam(req, 'id'));
      sendSuccess(req, res, file);
    } catch (err) {
      next(err);
    }
  };

  download = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { stream, file } = await this.fileService.getFileStream(req.user, getParam(req, 'id'), {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  };

  listForSubmission = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const files = await this.fileService.listForSubmission(req.user, getParam(req, 'submissionId'));
      sendSuccess(req, res, files);
    } catch (err) {
      next(err);
    }
  };
}
