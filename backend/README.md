# VoiceShield Console Backend

Production-ready, secure, modular backend API service for **VoiceShield Console** — an internal engineering, testing, operations, developer documentation, compatible-device management, and privileged PostgreSQL RDS administration platform.

---

## 🏛️ Architecture & Database

- **Database Engine:** AWS RDS PostgreSQL (18.3 compatible)
- **Target RDS Host:** `voiceshield-prod-db.chcku4ke2u3b.ap-south-2.rds.amazonaws.com`
- **Target Database:** `voiceshield_console`
- **Region:** `ap-south-2`
- **Container Target:** Render Free Tier (Docker: `backend/Dockerfile`)

```text
backend/
├── src/
│   ├── config/              # Centralized environment config and database validation
│   ├── auth/                # Authentication, JWT, token rotation, password hashing
│   ├── users/               # User account administration (SUPER_ADMIN & ADMIN)
│   ├── roles/               # Core roles (SUPER_ADMIN, ADMIN, DEVELOPER, TESTER)
│   ├── permissions/         # Explicit permission constants & role-permission matrix
│   ├── work/                # Engineering work assignments & strict state transitions
│   ├── documentation/       # Developer documentation, versioning snapshots, & Admin reviews
│   ├── testing/             # Testing objectives, Quick Test sessions, manual submissions, reviews
│   ├── devices/             # Compatible device inventory & soft-deactivation protection
│   ├── files/               # Evidence management (S3 / local storage, signed streams, MIME validation)
│   ├── database/            # PostgreSQL RDS connection pool, explorer, migration runner, backup/restore
│   ├── exports/             # SQL, CSV, and JSON database export generators
│   ├── audit/               # Append-only audit trail and structured logging
│   ├── notifications/       # Multi-event notifications with read tracking
│   ├── health/              # Health, readiness, and liveness endpoints
│   ├── common/              # Security guards, error filters, structured logger, standard responses
│   ├── app.ts               # Express application initialization & router mounting
│   └── main.ts              # Server bootstrap with graceful shutdown hooks
│
├── migrations/              # PostgreSQL schema migrations (001_create_core_tables.sql)
├── tests/                   # Automated test suites (Jest / Supertest)
├── scripts/                 # Migration execution and seed data scripts
├── docs/                    # OpenAPI 3.0 specification & deployment documentation
├── Dockerfile               # Multi-stage production container
└── docker-compose.yml       # Local stack with Backend & PostgreSQL
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

## 🚀 Getting Started

### 1. Installation
```bash
cd backend
npm install
```

### 2. Running Automated Tests
```bash
npm test
```

### 3. Running Database Migrations
```bash
npm run migration:run
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

### 6. Interactive OpenAPI Documentation
Once running, open your browser to:
- **Swagger UI**: `http://localhost:4000/api/docs`
- **OpenAPI JSON Spec**: `http://localhost:4000/api/docs.json`
- **Health Check**: `http://localhost:4000/health`
- **Readiness Check**: `http://localhost:4000/health/ready`
