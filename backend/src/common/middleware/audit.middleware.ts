import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../types';
import { Logger } from '../logger';

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  const incomingRequestId = req.header('X-Request-ID');
  authReq.requestId = incomingRequestId && incomingRequestId.length < 64 ? incomingRequestId : `req_${uuidv4()}`;

  res.setHeader('X-Request-ID', authReq.requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.info(`${req.method} ${req.originalUrl || req.url} ${res.statusCode} [${duration}ms]`, {
      requestId: authReq.requestId,
      method: req.method,
      route: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
      userId: authReq.user?.id,
      role: authReq.user?.role,
    });
  });

  next();
}
