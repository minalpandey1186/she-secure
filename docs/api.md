# SheSecure API Specification (v1)

Base URL: `http://localhost:4000/api/v1`

---

## 1. Authentication Endpoints

### `POST /auth/login`
Authenticates authority responders and returns a signed JWT.

**Request Body:**
```json
{
  "email": "operator@shesecure.org",
  "password": "OperatorPassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "auth-operator-01",
      "email": "operator@shesecure.org",
      "name": "Dispatch Operator Alex Rivera",
      "role": "OPERATOR"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "tokenType": "Bearer",
      "expiresIn": "24h"
    }
  }
}
```

### `GET /auth/me`
Retrieves currently authenticated authority user profile.
* **Headers**: `Authorization: Bearer <TOKEN>`

---

## 2. Emergency Alert Endpoints

### `POST /alerts`
Submits an encrypted emergency alert (JSON or multipart steganographic image).

**JSON Request Body:**
```json
{
  "alertId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceId": "device-mobile-alpha-01",
  "timestamp": "2026-08-18T18:00:00.000Z",
  "triggerType": "STEALTH_GESTURE",
  "encryptedPayload": {
    "version": 1,
    "keyId": "key-v1",
    "nonce": "k7...base64...",
    "ciphertext": "p9...base64...",
    "tag": "m1...base64..."
  }
}
```

**Multipart Form Upload (Stego Carrier):**
* `stegoImage`: Binary PNG file containing embedded frame.
* `deviceId`: String identifier.
* `triggerType`: `STEALTH_GESTURE` | `DEMO`.

**Response (201 Created / 200 OK on Duplicate):**
```json
{
  "success": true,
  "message": "Emergency alert received and processed",
  "isDuplicate": false,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "device-mobile-alpha-01",
    "timestamp": "2026-08-18T18:00:00.000Z",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "accuracy": 3.5,
    "triggerType": "STEALTH_GESTURE",
    "status": "ACTIVE",
    "isEncrypted": true,
    "deliveries": [
      {
        "channel": "TELEGRAM",
        "status": "DELIVERED",
        "attempts": 1
      }
    ]
  }
}
```

### `GET /alerts`
Lists emergency alerts with filtering and pagination.
* **Auth**: Required (`ADMIN`, `OPERATOR`, `VIEWER`).
* **Query Params**: `status`, `triggerType`, `limit`, `offset`.

### `GET /alerts/stats`
Retrieves dashboard summary statistics (`active`, `unacknowledged`, `responding`, `resolved`, `total`).

### `GET /alerts/:alertId`
Retrieves single alert record with decrypted payload, delivery channels, and associated audit trail.

### `POST /alerts/:alertId/acknowledge`
Acknowledges an active alert.
* **Auth**: Required (`ADMIN`, `OPERATOR`).
* **Body**: `{ "notes": "Dispatched unit #3" }`.

### `PATCH /alerts/:alertId/status`
Updates lifecycle status (`ACTIVE` -> `RESPONDING` -> `RESOLVED` / `DISMISSED`).
* **Auth**: Required (`ADMIN`, `OPERATOR`).
* **Body**: `{ "status": "RESOLVED", "reason": "User confirmed safe" }`.

---

## 3. Audit Log Endpoints

### `GET /audit`
Queries system-wide tamper-evident audit logs.
* **Auth**: Required (`ADMIN`, `OPERATOR`, `VIEWER`).

### `GET /audit/alerts/:alertId`
Queries chronological audit history for a specific incident.
