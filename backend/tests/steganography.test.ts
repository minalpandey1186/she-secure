import { SteganographyService } from '../src/services/steganography/stego.service';
import { EncryptionService } from '../src/services/encryption/encryption.service';
import { PNG } from 'pngjs';

describe('SteganographyService (LSB Framing with CRC32 & Magic Verification)', () => {
  let stegoService: SteganographyService;
  let encryptionService: EncryptionService;

  beforeEach(() => {
    stegoService = new SteganographyService();
    encryptionService = new EncryptionService();
  });

  it('should embed and recover an encrypted envelope inside a synthetic carrier PNG', () => {
    const alertData = {
      alertId: 'stego-alert-001',
      deviceId: 'device-stealth-01',
      timestamp: '2026-08-18T18:00:00.000Z',
      triggerType: 'SILENT_SEQUENCE',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 5.0,
        capturedAt: '2026-08-18T18:00:00.000Z'
      }
    };

    const envelope = encryptionService.encrypt(alertData);

    // Encode into PNG
    const encodedPngBuffer = stegoService.encode(envelope);
    expect(Buffer.isBuffer(encodedPngBuffer)).toBe(true);
    expect(encodedPngBuffer.length).toBeGreaterThan(0);

    // Decode from PNG
    const extractedEnvelope = stegoService.decode(encodedPngBuffer);
    expect(extractedEnvelope).toEqual(envelope);

    // Decrypt the extracted envelope
    const decryptedData = encryptionService.decrypt(extractedEnvelope);
    expect(decryptedData).toEqual(alertData);
  });

  it('should reject non-SheSecure images (magic header mismatch)', () => {
    // Generate a plain unencoded PNG
    const plainPng = new PNG({ width: 50, height: 50 });
    for (let i = 0; i < plainPng.data.length; i++) plainPng.data[i] = 128;
    const plainBuffer = PNG.sync.write(plainPng);

    expect(() => {
      stegoService.decode(plainBuffer);
    }).toThrow('Invalid steganographic carrier: magic header mismatch');
  });

  it('should detect corrupted steganographic payload and fail with CRC32 mismatch', () => {
    const envelope = encryptionService.encrypt({ secret: 'distress' });
    const encodedPngBuffer = stegoService.encode(envelope);

    const png = PNG.sync.read(encodedPngBuffer);
    // Corrupt pixel channel inside embedded payload area
    // Pixel 30, channel 0 (Red)
    const corruptIdx = (png.width * 5 + 5) << 2;
    png.data[corruptIdx] ^= 1; // Flip LSB
    const corruptedBuffer = PNG.sync.write(png);

    expect(() => {
      stegoService.decode(corruptedBuffer);
    }).toThrow('Corrupted steganographic payload: CRC32 checksum mismatch');
  });
});
