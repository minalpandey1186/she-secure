import request from 'supertest';
import { app } from '../src/app';
import { encryptionService } from '../src/services/encryption/encryption.service';
import { authService } from '../src/services/authentication/auth.service';
import { alertRepository } from '../src/repositories/alert.repository';
import { authorityRepository } from '../src/repositories/authority.repository';
import { auditRepository } from '../src/repositories/audit.repository';

describe('Alert Processing & Authority API Integration Tests', () => {
  let adminToken: string;
  let operatorToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    // Clear and seed authority users
    authorityRepository.clearMemoryStore();
    alertRepository.clearMemoryStore();
    auditRepository.clearMemoryStore();
    await authService.seedDefaultAuthorities();

    // Generate tokens
    const adminLogin = await authService.login('admin@shesecure.org', 'AdminPassword123!');
    adminToken = adminLogin.token;

    const opLogin = await authService.login('operator@shesecure.org', 'OperatorPassword123!');
    operatorToken = opLogin.token;

    const viewerLogin = await authService.login('viewer@shesecure.org', 'ViewerPassword123!');
    viewerToken = viewerLogin.token;
  });

  it('should accept and decrypt a valid emergency alert JSON payload', async () => {
    const alertId = 'alert-test-e2e-001';
    const rawPayload = {
      alertId,
      deviceId: 'mobile-android-01',
      timestamp: new Date().toISOString(),
      triggerType: 'STEALTH_GESTURE',
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 3.2,
        capturedAt: new Date().toISOString()
      },
      batteryLevel: 76,
      notes: 'Silent trigger from covert pocket gesture'
    };

    const encryptedPayload = encryptionService.encrypt(rawPayload);

    const response = await request(app)
      .post('/api/v1/alerts')
      .send({
        alertId,
        deviceId: 'mobile-android-01',
        timestamp: rawPayload.timestamp,
        triggerType: 'STEALTH_GESTURE',
        encryptedPayload
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(alertId);
    expect(response.body.data.status).toBe('ACTIVE');
    expect(response.body.data.latitude).toBeCloseTo(28.6139);
    expect(response.body.data.longitude).toBeCloseTo(77.2090);
    expect(response.body.data.decryptedPayload.batteryLevel).toBe(76);
  });

  it('should enforce idempotency and not re-alert on duplicate submissions', async () => {
    const alertId = 'alert-test-e2e-001'; // Same ID
    const rawPayload = { alertId, deviceId: 'mobile-android-01', timestamp: new Date().toISOString() };
    const encryptedPayload = encryptionService.encrypt(rawPayload);

    const response = await request(app)
      .post('/api/v1/alerts')
      .send({
        alertId,
        deviceId: 'mobile-android-01',
        timestamp: rawPayload.timestamp,
        triggerType: 'STEALTH_GESTURE',
        encryptedPayload
      });

    expect(response.status).toBe(200);
    expect(response.body.isDuplicate).toBe(true);
    expect(response.body.data.id).toBe(alertId);
  });

  it('should allow Operator to acknowledge an alert and record audit log', async () => {
    const alertId = 'alert-test-e2e-001';

    const response = await request(app)
      .post(`/api/v1/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ notes: 'Dispatch unit #4 en route to coordinates' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ACKNOWLEDGED');

    // Verify audit log
    const auditRes = await request(app)
      .get(`/api/v1/audit/alerts/${alertId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    const actions = auditRes.body.data.map((l: any) => l.action);
    expect(actions).toContain('ALERT_ACKNOWLEDGED');
  });

  it('should allow Operator to progress alert status to RESOLVED', async () => {
    const alertId = 'alert-test-e2e-001';

    const response = await request(app)
      .patch(`/api/v1/alerts/${alertId}/status`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: 'RESOLVED', reason: 'Victim confirmed safe by emergency team' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('RESOLVED');
  });

  it('should reject Viewer role from modifying status (RBAC enforcement)', async () => {
    const alertId = 'alert-test-e2e-001';

    const response = await request(app)
      .patch(`/api/v1/alerts/${alertId}/status`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ status: 'RESOLVED' });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('insufficient permissions');
  });

  it('should return overview dashboard statistics', async () => {
    const response = await request(app)
      .get('/api/v1/alerts/stats')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('active');
    expect(response.body.data).toHaveProperty('resolved');
    expect(response.body.data.resolved).toBeGreaterThanOrEqual(1);
  });
});
