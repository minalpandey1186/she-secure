import request from 'supertest';
import { app } from '../src/app';
import { encryptionService } from '../src/services/encryption/encryption.service';
import { alertRepository } from '../src/repositories/alert.repository';
import { authorityRepository } from '../src/repositories/authority.repository';
import { authService } from '../src/services/authentication/auth.service';

describe('Advanced Resiliency Suite: BLE Mesh Relay, SMS Fallback & Keystore', () => {
  beforeAll(async () => {
    authorityRepository.clearMemoryStore();
    alertRepository.clearMemoryStore();
    await authService.seedDefaultAuthorities();
  });

  describe('1. Peer-to-Peer BLE Mesh Relay Ingestion', () => {
    it('should accept and tag an alert forwarded by a peer device over BLE Mesh', async () => {
      const alertId = 'ble-mesh-alert-001';
      const rawPayload = {
        alertId,
        deviceId: 'victim-device-alpha',
        timestamp: new Date().toISOString(),
        triggerType: 'STEALTH_GESTURE',
        location: { latitude: 37.7749, longitude: -122.4194, accuracy: 4.0 },
        notes: 'Broadcasted over zero-connectivity BLE mesh'
      };

      const encryptedPayload = encryptionService.encrypt(rawPayload);

      const res = await request(app)
        .post('/api/v1/alerts')
        .send({
          alertId,
          deviceId: 'victim-device-alpha',
          timestamp: rawPayload.timestamp,
          triggerType: 'STEALTH_GESTURE',
          encryptedPayload,
          transportType: 'BLE_MESH_RELAY',
          relayedByDeviceId: 'peer-relay-device-bravo',
          relayHopCount: 3
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transportProtocol).toBe('BLE_MESH_RELAY');
      expect(res.body.data.relayedByDeviceId).toBe('peer-relay-device-bravo');
      expect(res.body.data.relayHopCount).toBe(3);
    });
  });

  describe('2. Automated SMS Fallback Gateway', () => {
    it('should ingest, parse, and decrypt a compact SMS fallback distress message', async () => {
      const alertId = 'sms-fallback-001';
      const rawPayload = {
        alertId,
        deviceId: 'device-sms-user',
        timestamp: new Date().toISOString(),
        triggerType: 'MANUAL',
        location: { latitude: 51.5074, longitude: -0.1278, accuracy: 10.0 },
        notes: 'Data connection severed - SMS fallback transmitted'
      };

      const envelope = encryptionService.encrypt(rawPayload);
      const smsPayload = `SHES:1:${envelope.keyId}:${envelope.nonce}:${envelope.ciphertext}:${envelope.tag}`;

      const res = await request(app)
        .post('/api/v1/alerts/sms')
        .send({
          smsText: smsPayload,
          fromNumber: '+15551234567'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(alertId);
      expect(res.body.data.transportProtocol).toBe('SMS_FALLBACK');
      expect(res.body.data.latitude).toBeCloseTo(51.5074);
    });

    it('should reject malformed SMS fallback payloads safely', async () => {
      const res = await request(app)
        .post('/api/v1/alerts/sms')
        .send({
          smsText: 'INVALID_SMS_MESSAGE_NOT_SHES'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid SMS fallback format');
    });
  });

  describe('3. Hardware Keystore / HKDF Key Derivation', () => {
    it('should derive consistent 256-bit session keys using HKDF-SHA256', () => {
      const context1 = 'shesecure:alert:incident-01:device-01';
      const context2 = 'shesecure:alert:incident-02:device-01';

      const key1 = encryptionService.deriveHardwareKey('key-v1', context1);
      const key1Repeat = encryptionService.deriveHardwareKey('key-v1', context1);
      const key2 = encryptionService.deriveHardwareKey('key-v1', context2);

      expect(key1.length).toBe(32);
      expect(key1.equals(key1Repeat)).toBe(true);
      expect(key1.equals(key2)).toBe(false); // Different context produces isolated key
    });
  });
});
