# VoiceShield Console — Frontend Integration Guide

This guide defines the complete protocol, conventions, and state workflows required for the VoiceShield Console frontend to integrate with the backend service.

---

## 1. Network & Base URL

- **API Base URL:** `http://localhost:4000/api/v1` (Development) / `https://api.voiceshield-console.internal/api/v1` (Production)
- **Health Checks:** `http://localhost:4000/health`, `/health/live`, `/health/ready`
- **OpenAPI / Swagger Spec:** `http://localhost:4000/api/docs.json` (UI at `/api/docs`)

---

## 2. Request & Response Envelope

### Standard Request Headers
```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
X-Request-Id: <client-generated-uuid-or-empty>
```

### Standard Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid work item status transition.",
    "details": [
      {
        "field": "status",
        "message": "Cannot transition directly from ASSIGNED to COMPLETED."
      }
    ]
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Standard Error Codes:
- `BAD_REQUEST` (400) — Validation failure or illegal state transition.
- `UNAUTHORIZED` (401) — Missing, invalid, or expired JWT access token.
- `FORBIDDEN` (403) — Role lacks permission or target resource belongs to another user (IDOR prevention).
- `NOT_FOUND` (404) — Requested entity does not exist.
- `CONFLICT` (409) — Unique constraint violation (e.g. duplicate email).
- `INTERNAL_SERVER_ERROR` (500) — Server error (stack traces are stripped in production).

---

## 3. Authentication & Session Management Flow

### A. Login (`POST /api/v1/auth/login`)
- **Body:** `{ "email": "user@voiceshield.internal", "password": "SafePassword123!" }`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "u-1234",
        "email": "user@voiceshield.internal",
        "name": "Developer One",
        "role": "DEVELOPER",
        "permissions": ["work:read", "work:update", "doc:create", ...],
        "status": "ACTIVE"
      },
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

### B. Access Token Expiry & Automatic Refresh (`POST /api/v1/auth/refresh`)
- `accessToken` lifespan: **15 minutes**.
- `refreshToken` lifespan: **7 days**.
- Implement an HTTP client interceptor (e.g., Axios response interceptor). When a `401 UNAUTHORIZED` is received:
  1. Queue pending requests.
  2. Call `POST /api/v1/auth/refresh` with `{ "refreshToken": "<current_refresh_token>" }`.
  3. Store the new `accessToken` and `refreshToken` (Refresh Token Rotation).
  4. Retry original requests with the new Bearer token.
  5. If refresh fails (401), clear tokens and redirect to `/login`.

### C. Fetch Current User State (`GET /api/v1/auth/me`)
- Call on initial frontend boot to verify token validity and restore permissions.

### D. Logout (`POST /api/v1/auth/logout`)
- Call with `{ "refreshToken": "<current_refresh_token>" }` to invalidate the refresh token on the server and remove client tokens.

---

## 4. Role-Based Access Control (RBAC) & UI Visibility

The frontend must retrieve permissions from `user.permissions` or check `user.role`:

| Role | Permitted UI Sections | Strict Boundaries |
| :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Full access to all screens: Work, Testing, Devices, RDS, Explorer, Backups/Restore, Exports, Audit, User Roles. | None. Full system authority. |
| **`ADMIN`** | Work Assignment, Testing Management, Device Inventory, RDS Status, Database Explorer, Backups, Exports, Audit Logs, Developer/Tester User Management. | **Cannot** assign work to other Admins.<br>**Cannot** manage Admin/Super Admin user accounts.<br>**Cannot** run database restore or direct migrations. |
| **`DEVELOPER`** | Assigned Work, Work Documentation Editor, Doc Version History, Testing Objectives Creator. | **Cannot** access RDS or Explorer.<br>**Cannot** export database.<br>**Cannot** manage devices or users.<br>**Cannot** review peer work or documentation. |
| **`TESTER`** | Assigned Objectives, Quick Test Runner, Test Submission Form, Evidence Upload, Compatible Device Catalog (Read-Only). | **Cannot** access RDS or Explorer.<br>**Cannot** export database.<br>**Cannot** manage devices or users.<br>**Cannot** review test submissions. |

---

## 5. Core Workflows & State Machines

### 1. Work Item Lifecycle
```text
           [Admin creates work]
                    ↓
                ASSIGNED
                    ↓ (Developer accepts)
                ACCEPTED
                    ↓ (Developer starts coding)
               IN_PROGRESS
                    ↓ (Developer submits docs)
        DOCUMENTATION_SUBMITTED ──(Admin requests changes)──> IN_PROGRESS
                    ↓ (Admin approves)
                 APPROVED
                    ↓ (Admin completes)
                COMPLETED
```
- **Endpoints:**
  - `PATCH /api/v1/work/:id/status` `{ "status": "ACCEPTED" | "IN_PROGRESS" | "DOCUMENTATION_SUBMITTED" | "APPROVED" | "COMPLETED" }`

### 2. Developer Documentation & Versioning
- Create draft: `POST /api/v1/documentation` `{ "workId", "title", "content" }`
- Save new version: `POST /api/v1/documentation/:id/versions` `{ "content", "changeSummary" }`
- Submit for review: `POST /api/v1/documentation/:id/submit` (Transitions linked work item to `DOCUMENTATION_SUBMITTED`).

### 3. Manual Testing & Quick Test Execution
1. Developer/Admin creates objective: `POST /api/v1/testing/objectives`
2. Tester starts Quick Test: `POST /api/v1/testing/quick-test/start` `{ "objectiveId", "deviceId" }` (Validates device is `ACTIVE`).
3. Tester ends Quick Test: `POST /api/v1/testing/quick-test/:id/end` `{ "notes", "durationSeconds" }`
4. Tester uploads screenshot/log file: `POST /api/v1/files/upload` (`multipart/form-data`) -> returns `file.id`.
5. Tester submits manual test result: `POST /api/v1/testing/submissions`
   - Allowed outcomes: `PASS`, `FAIL`, `BLOCKED`, `NOT_TESTED`.
6. Attach evidence: `POST /api/v1/testing/submissions/:id/evidence` `{ "fileId", "evidenceType": "SCREENSHOT"|"LOG", "description" }`
7. Admin reviews submission: `POST /api/v1/reviews` `{ "targetType": "TEST_SUBMISSION", "targetId", "decision": "APPROVE"|"REQUEST_CHANGES"|"REJECT", "comments" }`

---

## 6. Privileged PostgreSQL RDS Administration & Exports

### Database Explorer (`POST /api/v1/database/explorer/query`)
- Frontend sends:
  ```json
  {
    "table": "devices",
    "schema": "public",
    "page": 1,
    "limit": 25,
    "sortColumn": "created_at",
    "sortOrder": "DESC",
    "filters": { "status": "ACTIVE" }
  }
  ```
- *Note: Explorer explicitly blocks mutations to `audit_logs`.*

### Database Restore (`POST /api/v1/database/restore`)
- Requires double-confirmation in UI: User must provide `backupId` and explicit `confirmation_token: "RESTORE_CONFIRM_<backupId>"`.

### Database Exports (`/api/v1/exports`)
1. Request Export: `POST /api/v1/exports` `{ "format": "SQL" | "CSV" | "JSON", "tables": ["users", "work_items"], "includeSchema": true }`
2. Poll Status: `GET /api/v1/exports/:id` until `status === "COMPLETED"`.
3. Download File: `GET /api/v1/exports/:id/download` (Streams binary attachment with JWT header).

---

## 7. Pagination, Sorting & Filtering Standard

All list endpoints support query params:
- `page`: default `1` (1-indexed)
- `limit`: default `20`, max `100`
- `sort`: field name, e.g. `created_at`
- `order`: `ASC` or `DESC` (default `DESC`)
- Custom filters: `status`, `role`, `assignedToId`, `search`
