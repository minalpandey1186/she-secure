# SheSecure Deployment Guide

---

## 1. Prerequisites
* **Docker & Docker Compose** (v2+)
* **Node.js** (v20+) & **npm**
* **Flutter SDK** (v3.16+)

---

## 2. Fast Deployment via Docker Compose

1. **Clone repository and configure environment:**
   ```bash
   cp .env.example .env
   ```

2. **Launch all services (PostgreSQL, Backend, Dashboard):**
   ```bash
   docker-compose up --build -d
   ```

3. **Verify running containers:**
   ```bash
   docker-compose ps
   ```

4. **Access endpoints:**
   * **Authority Dashboard**: `http://localhost:5173`
   * **Backend API**: `http://localhost:4000/api/v1`
   * **Backend Health Check**: `http://localhost:4000/api/v1/health`

---

## 3. Local Development Mode

### 3.1 Start PostgreSQL
```bash
docker run --name shesecure-postgres -e POSTGRES_DB=shesecure -e POSTGRES_USER=shesecure_user -e POSTGRES_PASSWORD=shesecure_secret_password -p 5432:5432 -d postgres:15-alpine
```

### 3.2 Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 3.3 Dashboard Setup
```bash
cd dashboard
npm install
npm run dev
```

### 3.4 Mobile Application Setup
```bash
cd mobile
flutter pub get
flutter run
```
