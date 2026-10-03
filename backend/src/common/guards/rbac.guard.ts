import { Response, NextFunction } from 'express';
import { UserRole } from '../../roles/roles.enum';
import { Permission } from '../../permissions/permissions.enum';
import { hasPermission } from '../../permissions/role-permissions.matrix';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError, ForbiddenError } from '../errors';

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }

    next();
  };
}

export function requirePermissions(...requiredPermissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const hasAll = requiredPermissions.every((perm) => hasPermission(req.user!.role, perm));

    if (!hasAll) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }

    next();
  };
}
