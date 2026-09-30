import { prisma } from './prisma.client';

export interface AuditLogRecord {
  id: string;
  authorityId?: string | null;
  authorityEmail?: string | null;
  authorityRole?: string | null;
  alertId?: string | null;
  action: string;
  timestamp: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
}

export class AuditRepository {
  private memAuditLogs: AuditLogRecord[] = [];

  public async create(data: Omit<AuditLogRecord, 'id' | 'timestamp'>): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      ...data,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date()
    };

    try {
      if (prisma.auditLog) {
        const created = await prisma.auditLog.create({
          data: {
            id: record.id,
            authorityId: record.authorityId,
            alertId: record.alertId,
            action: record.action,
            timestamp: record.timestamp,
            ipAddress: record.ipAddress,
            userAgent: record.userAgent,
            metadata: record.metadata
          }
        });
        return created as unknown as AuditLogRecord;
      }
    } catch {
      // fallback
    }

    this.memAuditLogs.unshift(record);
    return record;
  }

  public async findByAlertId(alertId: string): Promise<AuditLogRecord[]> {
    try {
      if (prisma.auditLog) {
        return (await prisma.auditLog.findMany({
          where: { alertId },
          include: { authority: { select: { email: true, name: true, role: true } } },
          orderBy: { timestamp: 'desc' }
        })) as unknown as AuditLogRecord[];
      }
    } catch {
      // fallback
    }

    return this.memAuditLogs.filter(a => a.alertId === alertId);
  }

  public async findMany(limit = 100, offset = 0): Promise<{ logs: AuditLogRecord[]; total: number }> {
    try {
      if (prisma.auditLog) {
        const [logs, total] = await Promise.all([
          prisma.auditLog.findMany({
            include: { authority: { select: { email: true, name: true, role: true } } },
            orderBy: { timestamp: 'desc' },
            take: limit,
            skip: offset
          }),
          prisma.auditLog.count()
        ]);
        return { logs: logs as unknown as AuditLogRecord[], total };
      }
    } catch {
      // fallback
    }

    const total = this.memAuditLogs.length;
    const sliced = this.memAuditLogs.slice(offset, offset + limit);
    return { logs: sliced, total };
  }

  public clearMemoryStore(): void {
    this.memAuditLogs = [];
  }
}

export const auditRepository = new AuditRepository();
