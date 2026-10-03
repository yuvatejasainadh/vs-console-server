import { Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { LoginSchema, RefreshTokenSchema, ChangePasswordSchema } from './auth.dto';
import { AuthenticatedRequest } from '../common/types';
import { sendSuccess } from '../common/response';
import { UnauthorizedError } from '../common/errors';

export class AuthController {
  private authService = AuthService.getInstance();

  login = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = LoginSchema.parse(req.body);
      const result = await this.authService.login(validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      sendSuccess(req, res, result, 200);
    } catch (err) {
      next(err);
    }
  };

  refreshToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = RefreshTokenSchema.parse(req.body);
      const tokens = await this.authService.refreshToken(validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      sendSuccess(req, res, tokens, 200);
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      await this.authService.logout(req.user, req.body?.refreshToken, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      sendSuccess(req, res, { message: 'Successfully logged out' }, 200);
    } catch (err) {
      next(err);
    }
  };

  me = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      sendSuccess(req, res, { user: req.user }, 200);
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const validated = ChangePasswordSchema.parse(req.body);
      await this.authService.changePassword(req.user, validated, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      sendSuccess(req, res, { message: 'Password successfully changed' }, 200);
    } catch (err) {
      next(err);
    }
  };
}
