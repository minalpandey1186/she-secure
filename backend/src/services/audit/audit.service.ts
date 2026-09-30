import { auditRepository, AuditLogRecord } from '../../repositories/audit.repository';
import { logger } from '../../utils/logger';

export interface RecordAuditParams {
  authorityId?: string | null;
  authorityEmail?: string | null;
  authorityRole?: string | null;
  alertId?: string | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

export class AuditService {
  public async logAction(params: RecordAuditParams): Promise<AuditLogRecord> {
    logger.info(`Audit Log: [${params.action}]`, {
      authorityId: params.authorityId,
      alertId: params.alertId,
      action: params.action
    });

    return await auditRepository.create({
      authorityId: params.authorityId || null,
      authorityEmail: params.authorityEmail || null,
      authorityRole: params.authorityRole || null,
      alertId: params.alertId || null,
      action: params.action,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      metadata: params.metadata || null
    });
  }

  public async getAlertAuditLogs(alertId: string): Promise<AuditLogRecord[]> {
    return await auditRepository.findByAlertId(alertId);
  }

  public async getAuditLogs(limit = 100, offset = 0): Promise<{ logs: AuditLogRecord[]; total: number }> {
    return await auditRepository.findMany(limit, offset);
  }
}

export const auditService = new AuditService();
