import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export type AuthorityRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export function requireRole(...allowedRoles: AuthorityRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = req.user.role as AuthorityRole;
    if (!allowedRoles.includes(userRole)) {
      return next(
        new ForbiddenError(
          `Insufficient permissions: role '${userRole}' is not authorized to perform this action. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}
