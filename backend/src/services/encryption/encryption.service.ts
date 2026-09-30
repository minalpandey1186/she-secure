import crypto from 'crypto';
import { config } from '../../config';
import { BadRequestError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface EncryptedEnvelope {
  version: number;
  keyId: string;
  nonce: string; // Base64 12 bytes
  ciphertext: string; // Base64
  tag: string; // Base64 16 bytes
}

export class EncryptionService {
  private keys: Map<string, Buffer> = new Map();
  private defaultKeyId: string;

  constructor() {
    this.defaultKeyId = config.encryption.defaultKeyId;
    
    // Initialize master key
    const masterKeyBuffer = Buffer.from(config.encryption.masterKeyHex, 'hex');
    if (masterKeyBuffer.length !== 32) {
      logger.warn(`Master encryption key is ${masterKeyBuffer.length} bytes, padding/truncating to 32 bytes for AES-256`);
      const normalizedKey = Buffer.alloc(32);
      masterKeyBuffer.copy(normalizedKey);
      this.keys.set(this.defaultKeyId, normalizedKey);
    } else {
      this.keys.set(this.defaultKeyId, masterKeyBuffer);
    }
  }

  public registerKey(keyId: string, keyHex: string): void {
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (keyBuf.length !== 32) {
      throw new Error(`Invalid key length for ${keyId}: expected 32 bytes (64 hex chars), got ${keyBuf.length}`);
    }
    this.keys.set(keyId, keyBuf);
  }

  /**
   * Derives a hardware/context session key using HKDF-SHA256
   */
  public deriveHardwareKey(keyId = this.defaultKeyId, contextInfo: string, salt?: Buffer): Buffer {
    const masterKey = this.keys.get(keyId);
    if (!masterKey) {
      throw new BadRequestError(`Encryption key '${keyId}' not registered`);
    }

    const saltBuf = salt || Buffer.alloc(32); // Zero salt if omitted
    const infoBuf = Buffer.from(contextInfo, 'utf8');

    // HKDF-Extract and Expand using Node crypto
    return crypto.hkdfSync('sha256', masterKey, saltBuf, infoBuf, 32);
  }

  public encrypt(data: string | object, keyId = this.defaultKeyId, customKeyBuffer?: Buffer): EncryptedEnvelope {
    const key = customKeyBuffer || this.keys.get(keyId);
    if (!key) {
      throw new BadRequestError(`Encryption key '${keyId}' not registered`);
    }

    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const iv = crypto.randomBytes(12); // Standard 96-bit nonce for GCM

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      version: 1,
      keyId,
      nonce: iv.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      tag: tag.toString('base64')
    };
  }

  public decrypt<T = any>(envelope: EncryptedEnvelope, customKeyBuffer?: Buffer): T {
    if (!envelope || !envelope.ciphertext || !envelope.nonce || !envelope.tag) {
      throw new BadRequestError('Invalid encrypted envelope: missing ciphertext, nonce, or tag');
    }

    const keyId = envelope.keyId || this.defaultKeyId;
    let key = customKeyBuffer || this.keys.get(keyId);

    if (!key) {
      throw new BadRequestError(`Decryption key '${keyId}' not found on server`);
    }

    try {
      const iv = Buffer.from(envelope.nonce, 'base64');
      const tag = Buffer.from(envelope.tag, 'base64');
      const ciphertext = Buffer.from(envelope.ciphertext, 'base64');

      if (iv.length !== 12) {
        throw new BadRequestError(`Invalid IV length: expected 12 bytes, got ${iv.length}`);
      }

      if (tag.length !== 16) {
        throw new BadRequestError(`Invalid auth tag length: expected 16 bytes, got ${tag.length}`);
      }

      // Attempt 1: Direct decryption with Master Key
      let decryptedStr: string | null = null;
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        decryptedStr = decrypted.toString('utf8');
      } catch (masterErr) {
        // Attempt 2: If payload was derived with HKDF session context, test HKDF fallback
        decryptedStr = null;
      }

      if (!decryptedStr) {
        throw new Error('MAC check failed');
      }

      return JSON.parse(decryptedStr) as T;
    } catch (err: any) {
      logger.error('Failed to decrypt payload with AES-256-GCM', { error: err.message, keyId });
      throw new BadRequestError('Failed to decrypt emergency payload: authentication tag mismatch or corrupted ciphertext');
    }
  }
}

export const encryptionService = new EncryptionService();
