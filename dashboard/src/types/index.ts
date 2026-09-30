export type AuthorityRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export type AlertStatus =
  | 'CREATED'
  | 'ENCRYPTED'
  | 'QUEUED'
  | 'SENDING'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETRYING'
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'RESPONDING'
  | 'RESOLVED'
  | 'DISMISSED';

export type TriggerType = 'STEALTH_GESTURE' | 'SILENT_SEQUENCE' | 'MANUAL' | 'DEMO';

export type TransportProtocol =
  | 'INTERNET_DIRECT'
  | 'BLE_MESH_RELAY'
  | 'SMS_FALLBACK'
  | 'STEGO_IMAGE';

export interface AuthorityUser {
  id: string;
  email: string;
  name: string;
  role: AuthorityRole;
}

export interface AlertDelivery {
  id: string;
  channel: 'TELEGRAM' | 'DASHBOARD' | 'SMS_BACKUP' | 'BLE_MESH';
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'RETRYING';
  attempts: number;
  lastError?: string | null;
  deliveredAt?: string | null;
}

export interface AuditLog {
  id: string;
  authorityId?: string | null;
  authorityEmail?: string | null;
  authorityRole?: string | null;
  alertId?: string | null;
  action: string;
  timestamp: string;
  ipAddress?: string | null;
  metadata?: Record<string, any> | null;
}

export interface AlertItem {
  id: string;
  deviceId: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  triggerType: TriggerType;
  status: AlertStatus;
  isEncrypted: boolean;
  transportProtocol?: TransportProtocol;
  relayedByDeviceId?: string | null;
  relayHopCount?: number | null;
  rawPayload?: any;
  decryptedPayload?: {
    alertId: string;
    deviceId: string;
    userId?: string;
    timestamp: string;
    triggerType: string;
    location: {
      latitude: number | null;
      longitude: number | null;
      accuracy: number | null;
      locationUnavailable?: boolean;
    };
    batteryLevel?: number;
    emergencyContacts?: string[];
    notes?: string;
    isDemo?: boolean;
    relayedByDeviceId?: string;
    relayHopCount?: number;
  };
  deliveries?: AlertDelivery[];
  auditLogs?: AuditLog[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  active: number;
  unacknowledged: number;
  responding: number;
  resolved: number;
  total: number;
}
