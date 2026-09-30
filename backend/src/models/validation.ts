import { z } from 'zod';

export const encryptedEnvelopeSchema = z.object({
  version: z.number().int().min(1),
  keyId: z.string().min(1),
  nonce: z.string().min(1),
  ciphertext: z.string().min(1),
  tag: z.string().min(1)
});

export const createAlertSchema = z.object({
  alertId: z.string().min(1, 'alertId is required'),
  deviceId: z.string().min(1, 'deviceId is required'),
  timestamp: z.string().datetime({ offset: true }).or(z.string().min(1)),
  triggerType: z.enum(['STEALTH_GESTURE', 'SILENT_SEQUENCE', 'MANUAL', 'DEMO']).default('STEALTH_GESTURE'),
  encryptedPayload: encryptedEnvelopeSchema,
  transportType: z.enum(['DIRECT_JSON', 'STEGO_IMAGE', 'BLE_MESH_RELAY', 'SMS_FALLBACK']).optional(),
  relayedByDeviceId: z.string().optional(),
  relayHopCount: z.number().int().min(0).max(20).optional()
});

export const smsAlertSchema = z.object({
  smsText: z.string().min(10, 'SMS payload must contain formatted SHES text'),
  fromNumber: z.string().optional()
});

export const updateAlertStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'DISMISSED']),
  reason: z.string().max(500).optional()
});

export const acknowledgeAlertSchema = z.object({
  notes: z.string().max(1000).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const queryAlertsSchema = z.object({
  status: z.string().optional(),
  triggerType: z.string().optional(),
  transportProtocol: z.string().optional(),
  deviceId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});
