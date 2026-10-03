import { Response, NextFunction } from 'express';
import { ExportService } from './export.service';
import { CreateExportSchema } from './export.dto';
import { AuthenticatedRequest, getParam } from '../common/types';
import { sendPaginatedSuccess, sendSuccess } from '../common/response';
import { UnauthorizedError } from '../common/errors';

export class ExportController {
  private exportService = ExportService.getInstance();

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = CreateExportSchema.parse(req.body);
      const result = await this.exportService.create(req.user, validated, {
        requestId: req.requestId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      sendSuccess(req, res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.exportService.list(req.user, {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      });
      sendPaginatedSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.exportService.getById(req.user, getParam(req, 'id'));
      sendSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  };

  download = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { stream, filename, exportRecord } = await this.exportService.getDownloadStream(
        req.user,
        getParam(req, 'id'),
        {
          requestId: req.requestId,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );

      const mimeType =
        exportRecord.format === 'JSON'
          ? 'application/json'
          : exportRecord.format === 'CSV'
          ? 'text/csv'
          : 'application/sql';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  };
}
