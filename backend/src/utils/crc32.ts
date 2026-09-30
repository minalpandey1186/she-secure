// Standard CRC-32 (IEEE 802.3 / ISO 3309) implementation
const CRC_TABLE: Uint32Array = new Uint32Array(256);

(function initCrcTable() {
  for (let i = 0; i < 256; i++) {
    let c = i >>> 0;
    for (let j = 0; j < 8; j++) {
      if ((c & 1) !== 0) {
        c = (0xEDB88320 ^ (c >>> 1)) >>> 0;
      } else {
        c = (c >>> 1) >>> 0;
      }
    }
    CRC_TABLE[i] = c >>> 0;
  }
})();

export function calculateCRC32(buffer: Buffer | Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    crc = (CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8)) >>> 0;
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0);
}
