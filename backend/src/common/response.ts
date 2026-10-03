import { Response } from 'express';
import { AuthenticatedRequest, StandardApiResponse, PaginatedResult } from './types';

export function sendSuccess<T>(
  req: AuthenticatedRequest,
  res: Response,
  data: T,
  statusCode = 200,
  pagination?: PaginatedResult<any>['pagination']
): Response {
  const response: StandardApiResponse<T> = {
    success: true,
    data,
    requestId: req.requestId || 'req_unknown',
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
}

export function sendPaginatedSuccess<T>(
  req: AuthenticatedRequest,
  res: Response,
  paginated: PaginatedResult<T>,
  statusCode = 200
): Response {
  const response: StandardApiResponse<T[]> = {
    success: true,
    data: paginated.data,
    pagination: paginated.pagination,
    requestId: req.requestId || 'req_unknown',
  };

  return res.status(statusCode).json(response);
}

export function sendError(
  req: AuthenticatedRequest,
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any
): Response {
  const response: StandardApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    requestId: req.requestId || 'req_unknown',
  };

  return res.status(statusCode).json(response);
}
