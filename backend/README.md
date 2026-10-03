# VoiceShield Console Backend

Production-ready, secure, modular backend API service for **VoiceShield Console** — an internal engineering, testing, operations, developer documentation, compatible-device management, and privileged PostgreSQL RDS administration platform.

---

## 🏛️ Architecture Overview

The backend is built with TypeScript and Node.js using a modular architecture with strict separation of concerns:

```text
backend/
├── src/
│   ├── config/              # Centralized environment config and security constants
│   ├── auth/                # Authentication, JWT, token rotation, password hashing, MFA readiness
│   ├── users/               # User account administration (SUPER_ADMIN & ADMIN)
│   ├── roles/               # Core roles (SUPER_ADMIN, ADMIN, DEVELOPER, TESTER)
│   ├── permissions/         # Explicit permission constants & role-permission matrix
│   ├── work/                # Engineering work assignments & strict state transitions
│   ├── documentation/       # Developer documentation, versioning snapshots, & Admin reviews
│   ├── testing/             # Testing objectives, Quick Test sessions, manual submissions, reviews
│   ├── devices/             # Compatible device inventory & soft-deactivation protection
│   ├── files/               # Evidence management (S3 / local storage, signed streams, MIME validation)
│   ├── database/            # Privileged PostgreSQL RDS administration (status, explorer, users, migrations, backup/restore)
│   ├── exports/             # SQL, CSV, and JSON database export generators
│   ├── audit/               # Append-only audit trail and structured logging
│   ├── notifications/       # Multi-event notifications with read tracking
│   ├── health/              # Health, readiness, and liveness endpoints
│   ├── common/              # Security guards, error filters, structured logger, standard responses
│   ├── app.ts               # Express application initialization & router mounting
│   └── main.ts              # Server bootstrap with graceful shutdown hooks
│
├── migrations/              # PostgreSQL schema migrations (001_create_core_tables.sql)
├── tests/                   # Automated test suites (41 tests across 6 suites)
├── scripts/                 # Migration execution and seed data scripts
├── docs/                    # OpenAPI 3.0 specification
├── Dockerfile               # Multi-stage production container
└── docker-compose.yml       # Local stack with Backend & PostgreSQL 16
```

---

## 🛡️ Role-Based Access Control (RBAC) & Boundaries

Authorization is strictly enforced **server-side** on every endpoint:

| Feature / Subsystem | `SUPER_ADMIN` | `ADMIN` | `DEVELOPER` | `TESTER` |
|:---|:---:|:---:|:---:|:---:|
| **Assign Work to Self** | ✅ | ✅ | ❌ | ❌ |
| **Assign Work to Admin** | ✅ | ❌ | ❌ | ❌ |
| **Assign Work to Developer** | ✅ | ✅ | ❌ | ❌ |
| **Manage Admin Accounts** | ✅ | ❌ | ❌ | ❌ |
| **Manage Non-Admin Accounts** | ✅ | ✅ | ❌ | ❌ |
| **Manage Compatible Devices** | ✅ | ✅ | ❌ | ❌ |
| **View Compatible Devices** | ✅ | ✅ | ❌ | ✅ |
| **Create Documentation** | ✅ | ✅ | ✅ | ❌ |
| **Review Documentation** | ✅ | ✅ | ❌ | ❌ |
| **Assign/Monitor Testing Objectives** | ✅ | ✅ | ✅ | ❌ |
| **Start Quick Test Session** | ✅ | ✅ | ❌ | ✅ |
| **Submit Manual Test Results** | ✅ | ✅ | ❌ | ✅ |
| **Review Test Submissions** | ✅ | ✅ | ❌ | ❌ |
| **PostgreSQL RDS Admin** | ✅ | ✅ | ❌ | ❌ |
| **Database Exports (SQL/CSV/JSON)** | ✅ | ✅ | ❌ | ❌ |
| **Full Audit Logs** | ✅ | ✅ | ❌ | ❌ |

---

## 🔑 Seed Development Accounts

Pre-seeded development accounts available for instant testing:

| Role | Email | Default Password |
|:---|:---|:---|
| **SUPER_ADMIN** | `sainadh@voiceshield.internal` | `SuperAdmin123!` |
| **ADMIN** | `admin@voiceshield.internal` | `AdminPass123!` |
| **DEVELOPER** (1) | `dev1@voiceshield.internal` | `DevPass123!` |
| **DEVELOPER** (2) | `dev2@voiceshield.internal` | `DevPass123!` |
| **TESTER** | `tester1@voiceshield.internal` | `TesterPass123!` |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js `>= 20.0.0`
- npm `>= 10.0.0`
- PostgreSQL 16 (optional locally; in-memory data store is active by default)

### 2. Installation
```bash
cd backend
npm install
```

### 3. Running Automated Tests
```bash
npm test
```

### 4. Running Development Server
```bash
npm run dev
```

### 5. Building for Production
```bash
npm run build
npm start
```

### 6. Interactive OpenAPI / Swagger Documentation
Once running, open your browser to:
- **Swagger UI**: `http://localhost:4000/api/docs`
- **OpenAPI JSON Spec**: `http://localhost:4000/api/docs.json`
- **Health Check**: `http://localhost:4000/health`

---

## 🐳 Docker Deployment

To launch the backend along with a PostgreSQL 16 instance:

```bash
docker-compose up --build
```
