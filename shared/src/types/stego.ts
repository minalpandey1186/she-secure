export const STEGO_MAGIC = 'SHES'; // 4 ASCII bytes
export const STEGO_VERSION = 1; // 1 byte
export const STEGO_HEADER_SIZE = 4 + 1 + 4; // MAGIC (4) + VERSION (1) + LENGTH (4) = 9 bytes
export const STEGO_FOOTER_SIZE = 4; // CRC32 Checksum (4 bytes)

export interface StegoExtractionResult {
  version: number;
  payloadLength: number;
  encryptedPayload: string; // Serialized JSON string of EncryptedEnvelope
  checksumValid: boolean;
  rawBytesLength: number;
}

export interface StegoCapacityInfo {
  imageWidth: number;
  imageHeight: number;
  channels: number;
  maxPayloadBytes: number;
  availableBits: number;
}
