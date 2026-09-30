# SheSecure Security Architecture & Cryptographic Specification

---

## 1. Cryptographic Primitives

### 1.1 Authenticated AES-256-GCM
SheSecure uses **AES-256-GCM (Galois/Counter Mode)** for all emergency payload encryption.
* **Confidentiality**: 256-bit symmetric key.
* **Integrity & Authenticity**: 128-bit MAC tag generated per encryption operation.
* **Replay Protection**: Unique 96-bit (12-byte) cryptographically secure pseudorandom nonce generated for every single alert.

### 1.2 Hardware Keystore & HKDF-SHA256 Key Derivation
To protect against root key compromise and physical device extraction:
* **Hardware Storage**: Root master keys are provisioned into the **Android Keystore** (utilizing hardware-backed TEE / StrongBox where available) via `EncryptedSharedPreferences`.
* **HKDF-SHA256 Derivation**: Each alert session derives an isolated, ephemeral 256-bit encryption key using HMAC-based Extract-and-Expand Key Derivation:
  $$\text{SessionKey} = \text{HKDF-SHA256}(\text{MasterKey}, \text{Salt}=0, \text{Info}="shesecure:alert:<alertId>:<deviceId>")$$
* **Isolation**: Even if an attacker captures one session key, previous and future alert payloads remain cryptographically protected.

---

## 2. Multi-Path Resilient Transport Security

```
+---------------------+      +---------------------+      +---------------------+
|   Direct Internet   |      |    P2P BLE Mesh     |      |    Cellular SMS     |
|   (HTTPS / TLS)     |      |  (Encrypted Packets)|      |  (Encrypted SHES:1) |
+----------+----------+      +----------+----------+      +----------+----------+
           |                            |                            |
           +----------------------------+----------------------------+
                                        |
                             +----------v----------+
                             |   AES-256-GCM MAC   |
                             |   Authentication    |
                             +---------------------+
```

### 2.1 Peer-to-Peer BLE Mesh Protocol
* Packets broadcast over BLE contain only the encrypted envelope (`version`, `keyId`, `nonce`, `ciphertext`, `tag`), origin device ID, and a 5-hop TTL counter.
* Mesh peers forwarding the packet cannot decrypt the payload; they act as blind zero-knowledge relays.

### 2.2 Compact SMS Fallback Protocol
* Standard SMS format: `SHES:1:<keyId>:<nonce_b64>:<ciphertext_b64>:<tag_b64>`.
* Raw plaintext coordinates are never transmitted over unencrypted SMS.

### 2.3 LSB Steganography Protocol
* Binary frame layout: `[MAGIC 4B: 'SHES'][VERSION 1B: 0x01][PAYLOAD_LEN 4B][PAYLOAD NB][CRC32 4B]`.
* Fail-safe verification: Rejects non-SheSecure images and corrupted pixels via CRC32 checksums.
