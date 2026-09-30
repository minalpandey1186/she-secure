# SheSecure Backend Gateway

Node.js, TypeScript, Express, Prisma ORM, and PostgreSQL emergency gateway service.

## Features
- **AES-256-GCM Decryption Engine**: Authenticated decryption of incoming distress payloads.
- **LSB Steganography Decoder**: Binary frame extraction with CRC32 integrity checks.
- **Idempotent Ingestion**: Duplicate suppression using UUID idempotency keys.
- **Telegram Gateway**: Emergency dispatch notification service.
- **RBAC & Audit Logging**: Multi-tier access control with tamper-evident audit trail.

## Local Setup
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Running Tests
```bash
npm test
```
