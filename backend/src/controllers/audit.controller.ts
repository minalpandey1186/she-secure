import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit/audit.service';

export class AuditController {
  public async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string || '100', 10);
      const offset = parseInt(req.query.offset as string || '0', 10);

      const result = await auditService.getAuditLogs(limit, offset);
      res.status(200).json({
        success: true,
        data: result.logs,
        pagination: {
          total: result.total,
          limit,
          offset
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public async getAlertAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { alertId } = req.params;
      const logs = await auditService.getAlertAuditLogs(alertId);
      res.status(200).json({
        success: true,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
