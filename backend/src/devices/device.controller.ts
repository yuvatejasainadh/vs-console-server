import { Response, NextFunction } from 'express';
import { DeviceService } from './device.service';
import { CreateDeviceSchema, UpdateDeviceSchema, DeactivateDeviceSchema } from './device.dto';
import { AuthenticatedRequest, getParam } from '../common/types';
import { sendPaginatedSuccess, sendSuccess } from '../common/response';
import { UnauthorizedError } from '../common/errors';

export class DeviceController {
  private deviceService = DeviceService.getInstance();

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await this.deviceService.list(req.user, {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
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
      const device = await this.deviceService.getById(req.user, getParam(req, 'id'));
      sendSuccess(req, res, device);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = CreateDeviceSchema.parse(req.body);
      const device = await this.deviceService.create(req.user, validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, device, 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = UpdateDeviceSchema.parse(req.body);
      const device = await this.deviceService.update(req.user, getParam(req, 'id'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, device);
    } catch (err) {
      next(err);
    }
  };

  deactivate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const validated = DeactivateDeviceSchema.parse(req.body || {});
      const device = await this.deviceService.deactivate(req.user, getParam(req, 'id'), validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });
      sendSuccess(req, res, device);
    } catch (err) {
      next(err);
    }
  };
}
