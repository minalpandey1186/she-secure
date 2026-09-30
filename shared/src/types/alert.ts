export enum AlertStatus {
  CREATED = 'CREATED',
  ENCRYPTED = 'ENCRYPTED',
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESPONDING = 'RESPONDING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}

export enum TriggerType {
  STEALTH_GESTURE = 'STEALTH_GESTURE',
  SILENT_SEQUENCE = 'SILENT_SEQUENCE',
  MANUAL = 'MANUAL',
  DEMO = 'DEMO'
}

export enum TransportProtocol {
  INTERNET_DIRECT = 'INTERNET_DIRECT',
  BLE_MESH_RELAY = 'BLE_MESH_RELAY',
  SMS_FALLBACK = 'SMS_FALLBACK',
  STEGO_IMAGE = 'STEGO_IMAGE'
}

export enum DeliveryChannel {
  TELEGRAM = 'TELEGRAM',
  DASHBOARD = 'DASHBOARD',
  SMS_BACKUP = 'SMS_BACKUP',
  BLE_MESH = 'BLE_MESH'
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  locationUnavailable?: boolean;
  capturedAt: string; // ISO string
}

export interface AlertDecryptedPayload {
  alertId: string;
  deviceId: string;
  userId?: string;
  timestamp: string; // ISO string
  triggerType: TriggerType;
  location: LocationData;
  batteryLevel?: number;
  emergencyContacts?: string[];
  notes?: string;
  isDemo?: boolean;
  relayedByDeviceId?: string;
  relayHopCount?: number;
  transportProtocol?: TransportProtocol;
}

export interface EncryptedEnvelope {
  version: number;
  keyId: string;
  nonce: string; // Base64 encoded 96-bit nonce
  ciphertext: string; // Base64 encoded ciphertext
  tag: string; // Base64 encoded 128-bit authentication tag
}

export interface CreateAlertRequest {
  alertId: string; // Unique client idempotency key
  deviceId: string;
  timestamp: string;
  triggerType: TriggerType;
  encryptedPayload: EncryptedEnvelope;
  transportType?: 'DIRECT_JSON' | 'STEGO_IMAGE' | 'BLE_MESH_RELAY' | 'SMS_FALLBACK';
  relayedByDeviceId?: string;
  relayHopCount?: number;
}

export interface AlertResponse {
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
  rawPayload?: Record<string, unknown> | null;
  decryptedPayload?: AlertDecryptedPayload | null;
  deliveries?: AlertDeliverySummary[];
  auditLogs?: AlertAuditSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface AlertDeliverySummary {
  id: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  attempts: number;
  lastError?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

export interface AlertAuditSummary {
  id: string;
  authorityId: string;
  authorityName?: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}
