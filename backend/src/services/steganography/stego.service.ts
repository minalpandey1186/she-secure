import { PNG } from 'pngjs';
import { calculateCRC32 } from '../../utils/crc32';
import { BadRequestError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { EncryptedEnvelope } from '../encryption/encryption.service';

const STEGO_MAGIC = Buffer.from('SHES', 'ascii'); // 4 bytes: 0x53, 0x48, 0x45, 0x53
const STEGO_VERSION = 1; // 1 byte
const HEADER_SIZE = 4 + 1 + 4; // 9 bytes: MAGIC (4) + VERSION (1) + LENGTH (4)
const FOOTER_SIZE = 4; // CRC32 (4 bytes)

export interface StegoEncodeOptions {
  carrierImagePng?: Buffer; // Optional custom carrier PNG
  width?: number; // Default 100
  height?: number; // Default 100
}

export class SteganographyService {
  /**
   * Embeds an encrypted envelope into a PNG image using LSB (Least Significant Bit) encoding.
   */
  public encode(envelope: EncryptedEnvelope | string, options: StegoEncodeOptions = {}): Buffer {
    const payloadStr = typeof envelope === 'string' ? envelope : JSON.stringify(envelope);
    const payloadBytes = Buffer.from(payloadStr, 'utf8');
    const payloadLen = payloadBytes.length;

    // Calculate CRC32 checksum of payload
    const crc32Val = calculateCRC32(payloadBytes);

    // Frame: [MAGIC 4B][VERSION 1B][LEN 4B][PAYLOAD NB][CRC32 4B]
    const totalFrameSize = HEADER_SIZE + payloadLen + FOOTER_SIZE;
    const frame = Buffer.alloc(totalFrameSize);

    // Write header
    STEGO_MAGIC.copy(frame, 0);
    frame.writeUInt8(STEGO_VERSION, 4);
    frame.writeUInt32BE(payloadLen, 5);

    // Write payload
    payloadBytes.copy(frame, HEADER_SIZE);

    // Write CRC32 footer
    frame.writeUInt32BE(crc32Val, HEADER_SIZE + payloadLen);

    const totalBits = totalFrameSize * 8;

    let png: PNG;
    if (options.carrierImagePng) {
      png = PNG.sync.read(options.carrierImagePng);
    } else {
      // Create minimal synthetic solid image if carrier not provided
      const minPixels = Math.ceil(totalBits / 3); // 3 channels per pixel (RGB)
      const side = Math.max(100, Math.ceil(Math.sqrt(minPixels)) + 10);
      png = new PNG({ width: side, height: side });
      // Fill with subtle textured background
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          const idx = (side * y + x) << 2;
          png.data[idx] = (x * 3 + y * 5) % 200 + 40;     // R
          png.data[idx + 1] = (x * 7 + y * 2) % 200 + 40; // G
          png.data[idx + 2] = (x * 4 + y * 9) % 200 + 40; // B
          png.data[idx + 3] = 255;                         // Alpha
        }
      }
    }

    const availableRgbChannels = png.width * png.height * 3;
    if (totalBits > availableRgbChannels) {
      throw new BadRequestError(
        `Carrier image capacity exceeded: requires ${totalBits} bits (${totalFrameSize} bytes), but image only has capacity for ${availableRgbChannels} bits`
      );
    }

    // Embed bits into R, G, B channels (ignoring Alpha)
    let bitIdx = 0;
    for (let y = 0; y < png.height && bitIdx < totalBits; y++) {
      for (let x = 0; x < png.width && bitIdx < totalBits; x++) {
        const pixelIdx = (png.width * y + x) << 2;

        // Iterate through R, G, B (0, 1, 2)
        for (let c = 0; c < 3 && bitIdx < totalBits; c++) {
          const bytePos = Math.floor(bitIdx / 8);
          const bitPosInByte = 7 - (bitIdx % 8); // MSB to LSB
          const bit = (frame[bytePos] >>> bitPosInByte) & 1;

          // Set LSB of pixel channel
          png.data[pixelIdx + c] = (png.data[pixelIdx + c] & ~1) | bit;
          bitIdx++;
        }
      }
    }

    return PNG.sync.write(png);
  }

  /**
   * Extracts and verifies an encrypted envelope from an LSB encoded PNG image.
   */
  public decode(imageBuffer: Buffer): EncryptedEnvelope {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new BadRequestError('Invalid or empty image buffer provided for steganography extraction');
    }

    let png: PNG;
    try {
      png = PNG.sync.read(imageBuffer);
    } catch (err: any) {
      logger.error('Failed to parse PNG carrier image', { error: err.message });
      throw new BadRequestError('Failed to parse carrier image: invalid PNG format');
    }

    const availableBits = png.width * png.height * 3;
    const headerBits = HEADER_SIZE * 8;

    if (availableBits < headerBits) {
      throw new BadRequestError('Image is too small to contain SheSecure steganography header');
    }

    // 1. Extract Header bits
    const headerBytes = this.extractBytesFromImage(png, 0, HEADER_SIZE);

    // Verify Magic bytes "SHES"
    const magic = headerBytes.subarray(0, 4);
    if (!magic.equals(STEGO_MAGIC)) {
      throw new BadRequestError(
        `Invalid steganographic carrier: magic header mismatch. Expected 'SHES', got '${magic.toString('ascii')}'`
      );
    }

    // Verify Version
    const version = headerBytes.readUInt8(4);
    if (version !== STEGO_VERSION) {
      throw new BadRequestError(`Unsupported steganography version: ${version}`);
    }

    // Read Payload Length
    const payloadLen = headerBytes.readUInt32BE(5);
    const totalRequiredBytes = HEADER_SIZE + payloadLen + FOOTER_SIZE;
    const totalRequiredBits = totalRequiredBytes * 8;

    if (totalRequiredBits > availableBits) {
      throw new BadRequestError(
        `Corrupted steganography header: advertised length ${payloadLen} bytes exceeds image capacity`
      );
    }

    // 2. Extract Payload bytes
    const payloadBytes = this.extractBytesFromImage(png, HEADER_SIZE, payloadLen);

    // 3. Extract Footer (CRC32 Checksum)
    const footerBytes = this.extractBytesFromImage(png, HEADER_SIZE + payloadLen, FOOTER_SIZE);
    const expectedCrc32 = footerBytes.readUInt32BE(0);

    // 4. Verify Checksum
    const actualCrc32 = calculateCRC32(payloadBytes);
    if (expectedCrc32 !== actualCrc32) {
      logger.warn('Steganography CRC32 checksum mismatch', { expectedCrc32, actualCrc32 });
      throw new BadRequestError('Corrupted steganographic payload: CRC32 checksum mismatch');
    }

    // 5. Parse EncryptedEnvelope JSON
    try {
      const payloadJson = payloadBytes.toString('utf8');
      const envelope = JSON.parse(payloadJson) as EncryptedEnvelope;
      
      if (!envelope.ciphertext || !envelope.nonce || !envelope.tag) {
        throw new BadRequestError('Decoded steganography content is not a valid EncryptedEnvelope');
      }

      return envelope;
    } catch (err: any) {
      logger.error('Failed to parse steganography payload JSON', { error: err.message });
      throw new BadRequestError('Failed to parse decrypted steganographic payload JSON');
    }
  }

  private extractBytesFromImage(png: PNG, startByteOffset: number, byteCount: number): Buffer {
    const buffer = Buffer.alloc(byteCount);
    const startBit = startByteOffset * 8;
    const endBit = startBit + (byteCount * 8);

    let currentBitIdx = 0;
    let targetBitIdx = 0;

    for (let y = 0; y < png.height && targetBitIdx < byteCount * 8; y++) {
      for (let x = 0; x < png.width && targetBitIdx < byteCount * 8; x++) {
        const pixelIdx = (png.width * y + x) << 2;

        for (let c = 0; c < 3 && targetBitIdx < byteCount * 8; c++) {
          if (currentBitIdx >= startBit && currentBitIdx < endBit) {
            const bit = png.data[pixelIdx + c] & 1;
            const destByte = Math.floor(targetBitIdx / 8);
            const destBitPos = 7 - (targetBitIdx % 8);

            if (bit === 1) {
              buffer[destByte] |= (1 << destBitPos);
            }
            targetBitIdx++;
          }
          currentBitIdx++;
        }
      }
    }

    return buffer;
  }
}

export const steganographyService = new SteganographyService();
