import { EncryptionService } from '../src/services/encryption/encryption.service';

describe('EncryptionService (AES-256-GCM)', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  it('should encrypt and decrypt a structured emergency payload correctly', () => {
    const payload = {
      alertId: 'test-alert-123',
      deviceId: 'device-xyz',
      timestamp: new Date().toISOString(),
      triggerType: 'STEALTH_GESTURE',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 4.5,
        capturedAt: new Date().toISOString()
      },
      batteryLevel: 88,
      notes: 'Covert test trigger'
    };

    const envelope = encryptionService.encrypt(payload);

    expect(envelope.version).toBe(1);
    expect(envelope.keyId).toBe('key-v1');
    expect(Buffer.from(envelope.nonce, 'base64').length).toBe(12);
    expect(Buffer.from(envelope.tag, 'base64').length).toBe(16);
    expect(typeof envelope.ciphertext).toBe('string');

    const decrypted = encryptionService.decrypt<typeof payload>(envelope);
    expect(decrypted).toEqual(payload);
  });

  it('should fail to decrypt if the authentication tag is tampered', () => {
    const payload = { message: 'Distress Alert' };
    const envelope = encryptionService.encrypt(payload);

    // Tamper with authentication tag
    const corruptedTag = Buffer.from(envelope.tag, 'base64');
    corruptedTag[0] ^= 0xFF; // Flip bits
    envelope.tag = corruptedTag.toString('base64');

    expect(() => {
      encryptionService.decrypt(envelope);
    }).toThrow('Failed to decrypt emergency payload: authentication tag mismatch or corrupted ciphertext');
  });

  it('should fail to decrypt if ciphertext is corrupted', () => {
    const payload = { message: 'Distress Alert' };
    const envelope = encryptionService.encrypt(payload);

    const corruptedCipher = Buffer.from(envelope.ciphertext, 'base64');
    corruptedCipher[0] ^= 0x55;
    envelope.ciphertext = corruptedCipher.toString('base64');

    expect(() => {
      encryptionService.decrypt(envelope);
    }).toThrow('Failed to decrypt emergency payload: authentication tag mismatch or corrupted ciphertext');
  });

  it('should fail if keyId is not registered', () => {
    const payload = { message: 'Distress Alert' };
    const envelope = encryptionService.encrypt(payload);
    envelope.keyId = 'non-existent-key-v99';

    expect(() => {
      encryptionService.decrypt(envelope);
    }).toThrow("Decryption key 'non-existent-key-v99' not found");
  });
});
