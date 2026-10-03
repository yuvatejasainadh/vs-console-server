import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { AuthenticatedRequest, AuthenticatedUser } from '../types';
import { UnauthorizedError, ForbiddenError } from '../errors';
import { DataStore } from '../../database/data-store';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const store = DataStore.getInstance();
    const user = store.users.get(decoded.userId);

    if (!user) {
      return next(new UnauthorizedError('User associated with token no longer exists'));
    }

    if (user.status !== 'ACTIVE') {
      return next(new ForbiddenError('Account is disabled. Please contact an administrator.'));
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      status: user.status,
    };

    req.user = authUser;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Authentication token has expired'));
    }
    return next(new UnauthorizedError('Invalid authentication token'));
  }
}
