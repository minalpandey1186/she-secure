# SheSecure Live Presentation & Demo Walkthrough

This document outlines the exact, step-by-step procedure to demonstrate the full end-to-end SheSecure emergency pipeline.

---

## 1. Setup & Starting the Services

1. Open a terminal and start the backend & database:
   ```bash
   cd she-secure
   docker-compose up -d
   ```
2. Open the Authority Dashboard in your browser:
   * URL: `http://localhost:5173`
   * Login as **Operator**:
     * Email: `operator@shesecure.org`
     * Password: `OperatorPassword123!`

---

## 2. Demonstration Flow

### Step 1: Covert Mobile App Decoy & Stealth Trigger
1. Launch the mobile application (or inspect `SosScreen`).
2. Point out that the application presents as **Personal Notes** (clean decoy interface).
3. Tap the note icon in the header **3 times rapidly**.
4. Observe the silent 5-second cancellation bar appearing at the bottom.
5. Demonstrate the cancellation feature: tap **Cancel**. Notice the alert is aborted safely with no network transmission.

### Step 2: Triggering Emergency SOS (Demo Mode)
1. Tap the header icon **3 times** again and let the 5-second countdown finish (or click **Simulate Demo SOS** on the Dashboard/Mobile Demo Console).
2. The mobile app acquires GPS coordinates, builds the payload, and encrypts it with **AES-256-GCM**.
3. The encrypted payload is transmitted to the backend API (`POST /api/v1/alerts`).

### Step 3: Offline Resiliency Simulation
1. Turn off WiFi / mobile connectivity on the device (or trigger offline queue simulation).
2. Trigger the SOS sequence.
3. Open the **Offline Queue** screen on the mobile app. Notice the alert is safely stored with status `QUEUED`.
4. Restore internet connectivity.
5. Watch the background sync listener immediately detect connectivity and transmit the queued alert to the backend. Status transitions to `DELIVERED`.

### Step 4: Authority Command Center & Incident Response
1. Return to the **Authority Dashboard** (`http://localhost:5173`).
2. Notice the live metric card increments **Active Alerts** and **Unacknowledged**.
3. See the emergency pin and circular GPS accuracy radius appear in real time on the interactive map.
4. Click the incident in the **Emergency Alerts Table** or on the map pin to open the **Incident Inspector**.
5. Inspect the verified timestamp, GPS coordinates, device identifier, and decrypted emergency metadata.
6. Click **Acknowledge Alert**. Notice the status transitions to `ACKNOWLEDGED`.
7. Select **Mark Responding** to assign emergency dispatchers.
8. Select **Mark Resolved** once the victim is confirmed safe.

### Step 5: Audit Trail Verification
1. Navigate to the **Audit Trail** tab in the dashboard.
2. Verify that every single action (`ALERT_CREATED`, `ALERT_VIEWED`, `ALERT_ACKNOWLEDGED`, `STATUS_CHANGED`, `ALERT_RESOLVED`) is immutably logged with the operator email, timestamp, and IP address.
