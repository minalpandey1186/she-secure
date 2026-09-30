export enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  ALERT_CREATED = 'ALERT_CREATED',
  ALERT_VIEWED = 'ALERT_VIEWED',
  ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ALERT_RESOLVED = 'ALERT_RESOLVED',
  ALERT_DISMISSED = 'ALERT_DISMISSED',
  EXPORT_INITIATED = 'EXPORT_INITIATED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED'
}

export interface AuditLogEntry {
  id: string;
  authorityId?: string | null;
  authorityEmail?: string | null;
  authorityRole?: string | null;
  alertId?: string | null;
  action: AuditAction;
  timestamp: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}
