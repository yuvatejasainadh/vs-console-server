import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { sendError } from '../response';
import { Logger } from '../logger';
import { AuthenticatedRequest } from '../types';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response {
  const authReq = req as AuthenticatedRequest;
  const requestId = authReq.requestId || 'req_unknown';

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      Logger.error(`[AppError] ${err.message}`, {
        requestId,
        status: err.statusCode,
        error: err.stack,
      });
    }
    return sendError(authReq, res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(authReq, res, 400, 'VALIDATION_ERROR', 'Request validation failed', formattedErrors);
  }

  // Handle SyntaxError for bad JSON in request body
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(authReq, res, 400, 'INVALID_JSON', 'Malformed JSON in request body');
  }

  // Unhandled internal server error
  Logger.error(`[UnhandledError] ${err?.message || 'Unknown error'}`, {
    requestId,
    status: 500,
    error: err?.stack || err,
  });

  return sendError(
    authReq,
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    'An unexpected internal server error occurred.'
  );
}
