# SheSecure Database Schema & Data Models

Database: **PostgreSQL (v15+)**  
ORM: **Prisma**

---

## 1. Entity-Relationship Diagram

```
+--------------------+       +--------------------+       +--------------------+
|     Authority      |       |       Device       |       |       Alert        |
+--------------------+       +--------------------+       +--------------------+
| id (PK)            |       | id (PK)            |       | id (PK - Idempotent|
| email (Unique)     |       | deviceId (Unique)  |       | deviceId (FK)      |
| passwordHash       |       | deviceModel        |       | timestamp          |
| name               |       | osVersion          |       | latitude           |
| role (Enum)        |       | status             |       | longitude          |
| isActive           |       | registeredAt       |       | accuracy           |
| createdAt          |       +---------+----------+       | triggerType (Enum) |
+---------+----------+                 |                  | status (Enum)      |
          |                            | 1                | isEncrypted        |
          | 1                          |                  | rawPayload (JSON)  |
          |                            | N                | decPayload (JSON)  |
          | N                 +--------v-----------+      | createdAt          |
+---------v----------+        |                    |      | updatedAt          |
|      AuditLog      |        |                    |      +---------+----------+
+--------------------+        |                    |                | 1
| id (PK)            |        |                    |                |
| authorityId (FK)   |        |                    |                | N
| alertId (FK)       |<-------+--------------------+--------+-------v------------+
| action             |                                      |   AlertDelivery    |
| timestamp          |                                      +--------------------+
| ipAddress          |                                      | id (PK)            |
| userAgent          |                                      | alertId (FK)       |
| metadata (JSON)    |                                      | channel (Enum)     |
+--------------------+                                      | status (Enum)      |
                                                            | attempts           |
                                                            | lastError          |
                                                            | deliveredAt        |
                                                            +--------------------+
```

---

## 2. Table Indexing Strategy

* **Alerts**:
  * `CREATE INDEX idx_alerts_timestamp ON alerts (timestamp DESC);` (Fast retrieval of recent incidents)
  * `CREATE INDEX idx_alerts_status ON alerts (status);` (Filtering active/responding alerts)
  * `CREATE INDEX idx_alerts_device ON alerts (deviceId);` (Correlating alerts by source device)
* **AuditLogs**:
  * `CREATE INDEX idx_audit_timestamp ON audit_logs (timestamp DESC);`
  * `CREATE INDEX idx_audit_alert ON audit_logs (alertId);`
  * `CREATE INDEX idx_audit_authority ON audit_logs (authorityId);`
