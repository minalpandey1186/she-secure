import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authentication/auth.service';
import { auditService } from '../services/audit/audit.service';
import { loginSchema } from '../models/validation';

export class AuthController {
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const { user, token } = await authService.login(validated.email, validated.password);

      await auditService.logAction({
        authorityId: user.id,
        authorityEmail: user.email,
        authorityRole: user.role,
        action: 'LOGIN_SUCCESS',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.status(200).json({
        success: true,
        data: {
          user,
          tokens: {
            accessToken: token,
            tokenType: 'Bearer',
            expiresIn: '24h'
          }
        }
      });
    } catch (err: any) {
      if (req.body?.email) {
        await auditService.logAction({
          authorityEmail: req.body.email,
          action: 'LOGIN_FAILURE',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: { reason: err.message }
        });
      }
      next(err);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
