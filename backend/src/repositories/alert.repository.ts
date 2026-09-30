import { prisma } from './prisma.client';

export interface AlertRecord {
  id: string; // client idempotency key / UUID
  deviceId: string;
  timestamp: Date;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  triggerType: 'STEALTH_GESTURE' | 'SILENT_SEQUENCE' | 'MANUAL' | 'DEMO';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESPONDING' | 'RESOLVED' | 'DISMISSED';
  isEncrypted: boolean;
  transportProtocol?: 'INTERNET_DIRECT' | 'BLE_MESH_RELAY' | 'SMS_FALLBACK' | 'STEGO_IMAGE';
  relayedByDeviceId?: string | null;
  relayHopCount?: number | null;
  rawPayload: any;
  decryptedPayload: any;
  createdAt: Date;
  updatedAt: Date;
  deliveries?: AlertDeliveryRecord[];
  auditLogs?: any[];
}

export interface AlertDeliveryRecord {
  id: string;
  alertId: string;
  channel: 'TELEGRAM' | 'DASHBOARD' | 'SMS_BACKUP' | 'BLE_MESH';
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'RETRYING';
  attempts: number;
  lastError?: string | null;
  deliveredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FindAlertsFilter {
  status?: string;
  triggerType?: string;
  transportProtocol?: string;
  deviceId?: string;
  limit?: number;
  offset?: number;
}

export class AlertRepository {
  private memAlerts: Map<string, AlertRecord> = new Map();
  private memDeliveries: Map<string, AlertDeliveryRecord> = new Map();

  public async findById(id: string): Promise<AlertRecord | null> {
    try {
      if (prisma.alert) {
        const found = await prisma.alert.findUnique({
          where: { id },
          include: { deliveries: true, auditLogs: { orderBy: { timestamp: 'desc' } } }
        });
        if (found) return found as unknown as AlertRecord;
      }
    } catch {
      // fallback
    }

    const alert = this.memAlerts.get(id);
    if (!alert) return null;

    const deliveries = Array.from(this.memDeliveries.values()).filter(d => d.alertId === id);
    return { ...alert, deliveries };
  }

  public async create(data: Omit<AlertRecord, 'createdAt' | 'updatedAt' | 'deliveries' | 'auditLogs'>): Promise<AlertRecord> {
    const record: AlertRecord = {
      ...data,
      transportProtocol: data.transportProtocol || 'INTERNET_DIRECT',
      createdAt: new Date(),
      updatedAt: new Date(),
      deliveries: []
    };

    try {
      if (prisma.alert) {
        const created = await prisma.alert.create({
          data: {
            id: record.id,
            deviceId: record.deviceId,
            timestamp: record.timestamp,
            latitude: record.latitude,
            longitude: record.longitude,
            accuracy: record.accuracy,
            triggerType: record.triggerType as any,
            status: record.status as any,
            isEncrypted: record.isEncrypted,
            transportProtocol: record.transportProtocol as any,
            relayedByDeviceId: record.relayedByDeviceId,
            relayHopCount: record.relayHopCount,
            rawPayload: record.rawPayload,
            decryptedPayload: record.decryptedPayload
          },
          include: { deliveries: true }
        });
        return created as unknown as AlertRecord;
      }
    } catch {
      // fallback
    }

    this.memAlerts.set(record.id, record);
    return record;
  }

  public async updateStatus(id: string, status: AlertRecord['status']): Promise<AlertRecord | null> {
    try {
      if (prisma.alert) {
        const updated = await prisma.alert.update({
          where: { id },
          data: { status: status as any },
          include: { deliveries: true, auditLogs: true }
        });
        return updated as unknown as AlertRecord;
      }
    } catch {
      // fallback
    }

    const existing = this.memAlerts.get(id);
    if (!existing) return null;
    existing.status = status;
    existing.updatedAt = new Date();
    this.memAlerts.set(id, existing);
    return existing;
  }

  public async findMany(filter: FindAlertsFilter = {}): Promise<{ alerts: AlertRecord[]; total: number }> {
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    try {
      if (prisma.alert) {
        const whereClause: any = {};
        if (filter.status) whereClause.status = filter.status;
        if (filter.triggerType) whereClause.triggerType = filter.triggerType;
        if (filter.transportProtocol) whereClause.transportProtocol = filter.transportProtocol;
        if (filter.deviceId) whereClause.deviceId = filter.deviceId;

        const [alerts, total] = await Promise.all([
          prisma.alert.findMany({
            where: whereClause,
            include: { deliveries: true, auditLogs: { take: 5, orderBy: { timestamp: 'desc' } } },
            orderBy: { timestamp: 'desc' },
            take: limit,
            skip: offset
          }),
          prisma.alert.count({ where: whereClause })
        ]);

        return { alerts: alerts as unknown as AlertRecord[], total };
      }
    } catch {
      // fallback
    }

    let all = Array.from(this.memAlerts.values());
    if (filter.status) all = all.filter(a => a.status === filter.status);
    if (filter.triggerType) all = all.filter(a => a.triggerType === filter.triggerType);
    if (filter.transportProtocol) all = all.filter(a => a.transportProtocol === filter.transportProtocol);
    if (filter.deviceId) all = all.filter(a => a.deviceId === filter.deviceId);

    all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const total = all.length;
    const sliced = all.slice(offset, offset + limit);

    return { alerts: sliced, total };
  }

  public async createDelivery(data: Omit<AlertDeliveryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertDeliveryRecord> {
    const id = `del-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record: AlertDeliveryRecord = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      if (prisma.alertDelivery) {
        const created = await prisma.alertDelivery.create({
          data: {
            id,
            alertId: record.alertId,
            channel: record.channel as any,
            status: record.status as any,
            attempts: record.attempts,
            lastError: record.lastError,
            deliveredAt: record.deliveredAt
          }
        });
        return created as unknown as AlertDeliveryRecord;
      }
    } catch {
      // fallback
    }

    this.memDeliveries.set(id, record);
    return record;
  }

  public async updateDelivery(id: string, updates: Partial<AlertDeliveryRecord>): Promise<AlertDeliveryRecord | null> {
    try {
      if (prisma.alertDelivery) {
        const updated = await prisma.alertDelivery.update({
          where: { id },
          data: updates as any
        });
        return updated as unknown as AlertDeliveryRecord;
      }
    } catch {
      // fallback
    }

    const existing = this.memDeliveries.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.memDeliveries.set(id, updated);
    return updated;
  }

  public async getActiveStats(): Promise<{ active: number; unacknowledged: number; responding: number; resolved: number; total: number }> {
    const { alerts } = await this.findMany({ limit: 1000 });
    return {
      active: alerts.filter(a => a.status === 'ACTIVE').length,
      unacknowledged: alerts.filter(a => a.status === 'ACTIVE' || a.status === 'CREATED' as any).length,
      responding: alerts.filter(a => a.status === 'RESPONDING').length,
      resolved: alerts.filter(a => a.status === 'RESOLVED').length,
      total: alerts.length
    };
  }

  public clearMemoryStore(): void {
    this.memAlerts.clear();
    this.memDeliveries.clear();
  }
}

export const alertRepository = new AlertRepository();
