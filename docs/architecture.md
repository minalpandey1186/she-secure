# SheSecure System Architecture

SheSecure is a production-grade covert emergency communication and response platform designed for high-risk situations. It enables silent distress triggers, zero-knowledge payload encryption, hardware-derived key protection (HSM / Android Keystore), peer-to-peer Bluetooth Low Energy (BLE) mesh routing, automated SMS cellular fallback, covert steganographic transmission, resilient offline persistence with automatic retry, and authoritative situational response.

---

## 1. High-Level Multi-Path Emergency Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Victim as User / Device (Offline)
    participant Mobile as Mobile App (Flutter)
    participant HSM as Android Keystore / HKDF
    participant BLEMesh as P2P BLE Mesh Network
    actor Peer as Peer Device (Online)
    participant SMS as SMS Cellular Gateway
    participant Backend as Node.js Backend Gateway
    participant Postgres as PostgreSQL DB
    participant Telegram as Telegram Bot API
    actor Authority as Authority Responder (React Dashboard)

    Victim->>Mobile: Stealth Trigger (Triple-Tap on Decoy Header)
    Mobile->>Mobile: Start 5s Silent Cancellation Window
    alt User Cancels
        Victim->>Mobile: Tap Cancel
        Mobile-->>Victim: Reset to Decoy Mode (No Alert Sent)
    else Countdown Elapses
        Mobile->>Mobile: Capture GPS Coordinates & Accuracy
        Mobile->>HSM: Derive Hardware Session Key (HKDF-SHA256)
        Mobile->>Mobile: Encrypt Payload (AES-256-GCM)
        
        alt Mode 1: Direct Internet (When Online)
            Mobile->>Backend: POST /api/v1/alerts (JSON / Stego)
        else Mode 2: Zero-Connectivity BLE Mesh Relay (When Offline)
            Mobile->>BLEMesh: Broadcast BleMeshPacket (TTL: 5 hops)
            BLEMesh->>Peer: Peer scans BLE packet
            Peer->>Backend: POST /api/v1/alerts (transport: BLE_MESH_RELAY, relayedBy: Peer)
        else Mode 3: Cellular SMS Fallback (When Data Severed)
            Mobile->>SMS: Send Compact Encrypted SMS (SHES:1:<keyId>:<nonce>:<cipher>:<tag>)
            SMS->>Backend: POST /api/v1/alerts/sms (Webhook Ingestion)
        else Mode 4: Local Storage Queue
            Mobile->>Mobile: Store in Local SQLite/Prefs Queue for Auto-Replay
        end

        Backend->>Backend: Deduplicate with Idempotency Key (alertId)
        Backend->>Backend: Decrypt AES-256-GCM Payload & Verify MAC
        Backend->>Postgres: Store Alert (Status: ACTIVE, Protocol Tagged)
        Backend->>Postgres: Log Immutable Audit Entry
        Backend->>Telegram: Send Markdown Emergency Card + Google Maps Pin
        Backend-->>Authority: Realtime Alert Stream
        Authority->>Authority: Render Alert Pin, Accuracy Radius & Relay Badge on Map
        Authority->>Backend: POST /api/v1/alerts/:id/acknowledge
        Backend->>Postgres: Update Status -> ACKNOWLEDGED & Log Audit Entry
    end
```

---

## 2. Advanced Resiliency & Security Pillars

### 2.1 Peer-to-Peer BLE Mesh Relay (`BleMeshRelayService`)
* **Decentralized Multi-Hop Routing**: Operates with a default 5-hop Time-To-Live (TTL).
* **Loop Prevention**: Implements an LRU cache of recently seen packet IDs and alert IDs to prevent broadcast storms.
* **Auto-Bridging Gateway**: Any nearby peer device running SheSecure with active internet connectivity automatically forwards received mesh packets to the backend API.

### 2.2 Hardware Security Module / Android Keystore (`KeystoreService`)
* **Hardware-Backed Storage**: Root cryptographic seeds stored in Android Keystore (`EncryptedSharedPreferences`) or iOS Keychain.
* **HKDF-SHA256 Key Derivation**: Derives unique, ephemeral 256-bit encryption keys per incident session context (`shesecure:alert:<alertId>:<deviceId>`).

### 2.3 Automated SMS Fallback Gateway (`SmsFallbackService`)
* **Compact Framing Protocol**: `SHES:1:<keyId>:<nonce_b64>:<ciphertext_b64>:<tag_b64>`.
* **Zero Data Dependency**: Dispatches distress telemetry over standard GSM/cellular SMS when data and mesh peers are unavailable.
* **Backend Webhook Ingestion**: Endpoint `POST /api/v1/alerts/sms` ingests and processes SMS-transmitted distress signals.
