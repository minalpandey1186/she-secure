import { alertRepository, AlertRecord, FindAlertsFilter } from '../../repositories/alert.repository';
import { auditService } from '../audit/audit.service';
import { encryptionService, EncryptedEnvelope } from '../encryption/encryption.service';
import { steganographyService } from '../steganography/stego.service';
import { telegramService } from '../telegram/telegram.service';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface ProcessAlertInput {
  alertId: string; // Idempotency key
  deviceId: string;
  timestamp: string;
  triggerType: 'STEALTH_GESTURE' | 'SILENT_SEQUENCE' | 'MANUAL' | 'DEMO';
  encryptedPayload: EncryptedEnvelope;
  carrierImageBuffer?: Buffer;
  transportProtocol?: 'INTERNET_DIRECT' | 'BLE_MESH_RELAY' | 'SMS_FALLBACK' | 'STEGO_IMAGE';
  relayedByDeviceId?: string | null;
  relayHopCount?: number | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface DecryptedAlertData {
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
    capturedAt?: string;
  };
  batteryLevel?: number;
  emergencyContacts?: string[];
  notes?: string;
  isDemo?: boolean;
}

export class AlertService {
  /**
   * Idempotently processes an emergency alert submission.
   */
  public async processAlert(input: ProcessAlertInput): Promise<{ alert: AlertRecord; isDuplicate: boolean }> {
    const {
      alertId,
      deviceId,
      timestamp,
      triggerType,
      encryptedPayload,
      carrierImageBuffer,
      transportProtocol = 'INTERNET_DIRECT',
      relayedByDeviceId = null,
      relayHopCount = null,
      ipAddress,
      userAgent
    } = input;

    // 1. Idempotency Check
    const existing = await alertRepository.findById(alertId);
    if (existing) {
      logger.info('Duplicate alert submission received (idempotency key matched)', { alertId, deviceId });
      return { alert: existing, isDuplicate: true };
    }

    // 2. Decrypt Payload (tries master key or HKDF context)
    let decrypted: DecryptedAlertData;
    try {
      try {
        decrypted = encryptionService.decrypt<DecryptedAlertData>(encryptedPayload);
      } catch {
        // Test HKDF session key derivation fallback: shesecure:alert:<alertId>:<deviceId>
        const sessionKey = encryptionService.deriveHardwareKey(
          encryptedPayload.keyId,
          `shesecure:alert:${alertId}:${deviceId}`
        );
        decrypted = encryptionService.decrypt<DecryptedAlertData>(encryptedPayload, sessionKey);
      }
    } catch (err: any) {
      logger.error('Failed to decrypt alert payload during ingestion', { alertId, deviceId, error: err.message });
      throw new BadRequestError(`Failed to decrypt alert payload: ${err.message}`);
    }

    // 3. Extract coordinates & metadata
    const lat = decrypted.location?.latitude ?? null;
    const lng = decrypted.location?.longitude ?? null;
    const accuracy = decrypted.location?.accuracy ?? null;
    const isDemo = decrypted.isDemo || triggerType === 'DEMO';

    const alertDate = new Date(timestamp || decrypted.timestamp || Date.now());

    // 4. Persist Normalized Alert
    const createdAlert = await alertRepository.create({
      id: alertId,
      deviceId,
      timestamp: alertDate,
      latitude: lat,
      longitude: lng,
      accuracy: accuracy,
      triggerType: (isDemo ? 'DEMO' : triggerType) as any,
      status: 'ACTIVE',
      isEncrypted: true,
      transportProtocol: carrierImageBuffer ? 'STEGO_IMAGE' : transportProtocol,
      relayedByDeviceId,
      relayHopCount,
      rawPayload: encryptedPayload as any,
      decryptedPayload: decrypted as any
    });

    // 5. Create Delivery Records
    const telegramDelivery = await alertRepository.createDelivery({
      alertId,
      channel: 'TELEGRAM',
      status: 'PENDING',
      attempts: 0
    });

    await alertRepository.createDelivery({
      alertId,
      channel: 'DASHBOARD',
      status: 'DELIVERED',
      attempts: 1,
      deliveredAt: new Date()
    });

    if (transportProtocol === 'BLE_MESH_RELAY') {
      await alertRepository.createDelivery({
        alertId,
        channel: 'BLE_MESH',
        status: 'DELIVERED',
        attempts: 1,
        deliveredAt: new Date()
      });
    }

    if (transportProtocol === 'SMS_FALLBACK') {
      await alertRepository.createDelivery({
        alertId,
        channel: 'SMS_BACKUP',
        status: 'DELIVERED',
        attempts: 1,
        deliveredAt: new Date()
      });
    }

    // 6. Log Audit Trail
    await auditService.logAction({
      alertId,
      action: 'ALERT_CREATED',
      ipAddress,
      userAgent,
      metadata: {
        deviceId,
        triggerType,
        isDemo,
        transportProtocol,
        relayedByDeviceId,
        relayHopCount,
        hasLocation: Boolean(lat && lng),
        hasStegoCarrier: Boolean(carrierImageBuffer)
      }
    });

    // 7. Dispatch Telegram Notification
    try {
      const tgResult = await telegramService.sendEmergencyNotification({
        alertId,
        deviceId,
        triggerType: isDemo ? 'DEMO' : triggerType,
        timestamp: alertDate.toISOString(),
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
        batteryLevel: decrypted.batteryLevel,
        isDemo,
        notes: [
          decrypted.notes,
          transportProtocol === 'BLE_MESH_RELAY' ? `📡 Relayed via Peer Device [${relayedByDeviceId}] (${relayHopCount} hops)` : null,
          transportProtocol === 'SMS_FALLBACK' ? `📱 Transmitted via Cellular SMS Fallback Gateway` : null
        ].filter(Boolean).join(' | '),
        imageBuffer: carrierImageBuffer
      });

      if (tgResult.success) {
        await alertRepository.updateDelivery(telegramDelivery.id, {
          status: 'DELIVERED',
          attempts: 1,
          deliveredAt: new Date()
        });
      } else {
        await alertRepository.updateDelivery(telegramDelivery.id, {
          status: 'FAILED',
          attempts: 1,
          lastError: tgResult.error
        });
      }
    } catch (tgErr: any) {
      logger.error('Telegram notification attempt failed', { alertId, error: tgErr.message });
      await alertRepository.updateDelivery(telegramDelivery.id, {
        status: 'FAILED',
        attempts: 1,
        lastError: tgErr.message
      });
    }

    const finalAlert = await alertRepository.findById(alertId);
    return { alert: finalAlert || createdAlert, isDuplicate: false };
  }

  /**
   * Processes an alert uploaded as an LSB steganographic image.
   */
  public async processStegoAlert(imageBuffer: Buffer, meta: { deviceId: string; triggerType?: string; ipAddress?: string; userAgent?: string }): Promise<{ alert: AlertRecord; isDuplicate: boolean }> {
    const encryptedPayload = steganographyService.decode(imageBuffer);
    const decrypted = encryptionService.decrypt<DecryptedAlertData>(encryptedPayload);
    const alertId = decrypted.alertId;
    const triggerType = (meta.triggerType || decrypted.triggerType || 'STEALTH_GESTURE') as any;

    return await this.processAlert({
      alertId,
      deviceId: meta.deviceId || decrypted.deviceId,
      timestamp: decrypted.timestamp || new Date().toISOString(),
      triggerType,
      encryptedPayload,
      carrierImageBuffer: imageBuffer,
      transportProtocol: 'STEGO_IMAGE',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }

  /**
   * Ingests a compact SMS fallback string payload
   * Format: SHES:1:<keyId>:<nonce>:<ciphertext>:<tag>
   */
  public async processSmsAlert(smsText: string, meta: { fromNumber?: string; ipAddress?: string; userAgent?: string }): Promise<{ alert: AlertRecord; isDuplicate: boolean }> {
    const cleanText = smsText.trim();
    const parts = cleanText.split(':');
    if (parts.length < 6 || parts[0] !== 'SHES') {
      throw new BadRequestError('Invalid SMS fallback format: missing SHES header or fields');
    }

    const version = parseInt(parts[1], 10);
    const keyId = parts[2];
    const nonce = parts[3];
    const ciphertext = parts[4];
    const tag = parts[5];

    const encryptedPayload: EncryptedEnvelope = {
      version,
      keyId,
      nonce,
      ciphertext,
      tag
    };

    let decrypted: DecryptedAlertData;
    try {
      decrypted = encryptionService.decrypt<DecryptedAlertData>(encryptedPayload);
    } catch {
      throw new BadRequestError('Failed to decrypt emergency SMS payload: MAC validation failure');
    }

    return await this.processAlert({
      alertId: decrypted.alertId,
      deviceId: decrypted.deviceId,
      timestamp: decrypted.timestamp || new Date().toISOString(),
      triggerType: (decrypted.triggerType || 'STEALTH_GESTURE') as any,
      encryptedPayload,
      transportProtocol: 'SMS_FALLBACK',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent || `SMS Gateway [${meta.fromNumber || 'cellular'}]`
    });
  }

  public async getAlerts(filter: FindAlertsFilter) {
    return await alertRepository.findMany(filter);
  }

  public async getAlertById(alertId: string, viewingAuthority?: { id: string; email: string; role: string }): Promise<AlertRecord> {
    const alert = await alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundError(`Alert with ID '${alertId}' not found`);
    }

    if (viewingAuthority) {
      await auditService.logAction({
        authorityId: viewingAuthority.id,
        authorityEmail: viewingAuthority.email,
        authorityRole: viewingAuthority.role,
        alertId,
        action: 'ALERT_VIEWED'
      });
    }

    return alert;
  }

  public async acknowledgeAlert(alertId: string, authority: { id: string; email: string; role: string; name: string }, notes?: string): Promise<AlertRecord> {
    const alert = await alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundError(`Alert with ID '${alertId}' not found`);
    }

    const updated = await alertRepository.updateStatus(alertId, 'ACKNOWLEDGED');

    await auditService.logAction({
      authorityId: authority.id,
      authorityEmail: authority.email,
      authorityRole: authority.role,
      alertId,
      action: 'ALERT_ACKNOWLEDGED',
      metadata: { notes, authorityName: authority.name }
    });

    return updated!;
  }

  public async updateAlertStatus(
    alertId: string,
    newStatus: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESPONDING' | 'RESOLVED' | 'DISMISSED',
    authority: { id: string; email: string; role: string },
    reason?: string
  ): Promise<AlertRecord> {
    const alert = await alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundError(`Alert with ID '${alertId}' not found`);
    }

    const previousStatus = alert.status;
    const updated = await alertRepository.updateStatus(alertId, newStatus);

    let action = 'STATUS_CHANGED';
    if (newStatus === 'RESOLVED') action = 'ALERT_RESOLVED';
    if (newStatus === 'DISMISSED') action = 'ALERT_DISMISSED';

    await auditService.logAction({
      authorityId: authority.id,
      authorityEmail: authority.email,
      authorityRole: authority.role,
      alertId,
      action,
      metadata: {
        previousStatus,
        newStatus,
        reason
      }
    });

    return updated!;
  }

  public async getDashboardStats() {
    return await alertRepository.getActiveStats();
  }
}

export const alertService = new AlertService();
