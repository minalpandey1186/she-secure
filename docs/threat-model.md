# SheSecure Comprehensive Threat Model

This document systematically analyzes potential threat vectors against the SheSecure covert emergency response platform, evaluating their impact, technical mitigations, and residual risks.

---

## Threat Analysis Matrix

### 1. Stolen or Seized User Device
* **Threat**: An adversary physically seizes the user's mobile device after an emergency event.
* **Impact**: Adversary attempts to discover if an emergency distress signal was transmitted or locate contacts.
* **Mitigation**: The mobile app presents a legitimate, functioning decoy utility interface (Personal Notes). Alerts are encrypted with AES-256-GCM before local disk caching. Delivered alerts can be purged or stored only in encrypted form. No plaintext credentials or emergency contact lists are visible on the main UI.
* **Residual Risk**: Forensic memory analysis on a running rooted device could recover recently cached volatile state.

### 2. Network Interception & Man-in-the-Middle (MitM)
* **Threat**: Adversary monitors local WiFi or cellular base stations (e.g. IMSI catchers) to intercept distress payloads.
* **Impact**: Adversary gains awareness of emergency activation and victim location.
* **Mitigation**: End-to-end payload encryption using authenticated AES-256-GCM prior to transport. Payloads are transmitted over TLS/HTTPS. Optional LSB steganography conceals the transmission as an innocent image upload.
* **Residual Risk**: Traffic analysis (timing and packet size) could reveal that an upload took place, mitigated by carrier image padding.

### 3. Replay Attacks & Alert Duplication
* **Threat**: Adversary captures a valid encrypted payload from the wire and resends it repeatedly to flood emergency dispatchers.
* **Impact**: Denial of Service (DoS) and emergency operator confusion.
* **Mitigation**: Every alert payload contains a client-generated UUID `alertId` and ISO-8601 timestamp. The backend enforces idempotency: repeated submissions with the same `alertId` return a cached acknowledgment without triggering duplicate notifications or alarms.
* **Residual Risk**: If an adversary modifies the `alertId` on an intercepted ciphertext without the key, AES-256-GCM decryption and tag verification will fail, causing immediate rejection.

### 4. Malicious or Compromised Authority Dashboard User
* **Threat**: An unauthorized person acquires operator login credentials or an insider attempts unauthorized actions.
* **Impact**: Unauthorized viewing of distress coordinates or tampering with emergency incident status.
* **Mitigation**: Strict Role-Based Access Control (RBAC: `ADMIN`, `OPERATOR`, `VIEWER`). All operator actions (`ALERT_VIEWED`, `ALERT_ACKNOWLEDGED`, `STATUS_CHANGED`, `ALERT_RESOLVED`) are cryptographically recorded in an immutable, tamper-evident audit log with actor ID, IP address, and timestamp.
* **Residual Risk**: A compromised Admin account could view current active alerts until revoked.

### 5. Compromised Telegram Bot Credentials
* **Threat**: The Telegram bot token is leaked or intercepted.
* **Impact**: Attacker could intercept Telegram notifications or spam the emergency channel.
* **Mitigation**: The Telegram Bot token and chat IDs are stored strictly in backend server environment variables and are never distributed in mobile client APKs or frontend web bundles. The dashboard operates as an independent primary response channel.
* **Residual Risk**: Server-level compromise of backend environment files requires credential rotation.

### 6. Corrupted Steganographic Image or Channel Loss
* **Threat**: Network compression, image cropping, or transit corruption damages embedded LSB bits.
* **Impact**: Inability to extract the emergency payload.
* **Mitigation**: The Stego framing protocol embeds a 4-byte `SHES` magic signature, version header, big-endian payload length, and a 4-byte CRC32 checksum. The decoder validates the checksum before attempting decryption. If corrupted, the system fails safely and requests fallback/JSON retry.
* **Residual Risk**: Severe lossy compression (such as aggressive JPEG recompression by social platforms) will destroy LSB bits; lossless PNG transport is enforced.

### 7. Temporary Connectivity Loss / Offline Scenario
* **Threat**: Victim triggers SOS in an elevator, basement, or rural area without cellular coverage.
* **Impact**: Emergency alert fails to reach backend servers.
* **Mitigation**: Offline persistence queue in local storage. State transitions from `CREATED` -> `ENCRYPTED` -> `QUEUED`. Background connectivity monitor listens for network restoration and automatically dispatches queued alerts with exponential backoff and idempotency.
* **Residual Risk**: If the device is destroyed before any network is restored, the queued alert remains on the local disk.

### 8. Reverse Engineering of Mobile Client Binary
* **Threat**: Adversary decompiles the mobile application APK to inspect internal mechanisms.
* **Impact**: Adversary inspects source code for hardcoded secrets or backdoor mechanisms.
* **Mitigation**: Zero hardcoded secrets in source code. Cryptographic keys are configured dynamically or injected securely via platform keychains. Code adheres to clean feature-based modularity without spyware or unauthorized background surveillance.
* **Residual Risk**: Adversary can observe standard application logic flow.
