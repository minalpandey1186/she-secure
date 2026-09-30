import { Request, Response, NextFunction } from 'express';
import { authService, JwtPayload } from '../services/authentication/auth.service';
import { UnauthorizedError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticateJwt(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authorization header missing or malformed (Bearer token required)'));
  }

  const token = authHeader.substring(7).trim();
  try {
    const payload = authService.verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuthenticateJwt(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      req.user = authService.verifyToken(token);
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
