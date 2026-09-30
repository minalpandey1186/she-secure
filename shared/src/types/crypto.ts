export interface KeyMetadata {
  keyId: string;
  algorithm: 'AES-256-GCM';
  version: number;
  createdAt: string;
  isActive: boolean;
}

export interface EncryptedDataPackage {
  version: number; // e.g. 1
  keyId: string;
  nonce: string; // Base64 96-bit (12 bytes)
  ciphertext: string; // Base64 encrypted UTF-8 JSON
  tag: string; // Base64 128-bit authentication tag (16 bytes)
}

export interface CryptoEngineConfig {
  defaultKeyId: string;
  keys: Record<string, Buffer | Uint8Array>;
}
