# VoiceShield Console API Contract Specification

**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Security Scheme:** HTTP Bearer JWT (`Authorization: Bearer <access_token>`)

---

## 1. Standard Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 100,
    "totalPages": 4
  },
  "requestId": "req_8f12a3bc-1b2c-4d5e-9f0a-1234567890ab"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action.",
    "details": []
  },
  "requestId": "req_8f12a3bc-1b2c-4d5e-9f0a-1234567890ab"
}
```

---

## 2. Authentication Endpoints

### `POST /api/v1/auth/login`
- **Auth:** None (Public)
- **Request:**
  ```json
  { "email": "user@voiceshield.internal", "password": "SecurePassword123!" }
  ```
- **Response (200):**
  ```json
  {
    "user": { "id": "uuid", "email": "...", "displayName": "...", "role": "SUPER_ADMIN", "status": "ACTIVE" },
    "tokens": { "accessToken": "jwt...", "refreshToken": "base64...", "expiresIn": "15m", "tokenType": "Bearer" }
  }
  ```

### `POST /api/v1/auth/refresh`
- **Auth:** None
- **Request:** `{ "refreshToken": "..." }`
- **Response (200):** `{ "accessToken": "...", "refreshToken": "...", "expiresIn": "15m", "tokenType": "Bearer" }`

### `POST /api/v1/auth/logout`
- **Auth:** Bearer Token
- **Response (200):** `{ "message": "Successfully logged out" }`

### `GET /api/v1/auth/me`
- **Auth:** Bearer Token
- **Response (200):** `{ "user": { ... } }`

### `POST /api/v1/auth/change-password`
- **Auth:** Bearer Token
- **Request:** `{ "currentPassword": "...", "newPassword": "..." }`
- **Response (200):** `{ "message": "Password successfully changed" }`

---

## 3. Work Management Endpoints

### `GET /api/v1/work`
- **Auth:** `SUPER_ADMIN`, `ADMIN`, `DEVELOPER`
- **Query Params:** `page`, `pageSize`, `status`, `assignedTo`, `search`
- **Response (200):** Paginated list of work items (Developers only see their own assigned work).

### `POST /api/v1/work`
- **Auth:** `SUPER_ADMIN`, `ADMIN` (Super Admin -> Self, Admin, Developer; Admin -> Self, Developer)
- **Request:**
  ```json
  { "title": "...", "description": "...", "priority": "HIGH", "assignedTo": "user-uuid" }
  ```
- **Response (201):** Created work item in `ASSIGNED` status.

### `POST /api/v1/work/:id/accept`
- **Auth:** Assigned Developer or Super Admin
- **Response (200):** Work item updated to `ACCEPTED` status.

### `POST /api/v1/work/:id/start`
- **Auth:** Assigned Developer or Super Admin
- **Response (200):** Work item updated to `IN_PROGRESS` status.

### `POST /api/v1/work/:id/complete`
- **Auth:** Assigned Developer, Admin, or Super Admin (Work item must be `APPROVED`)
- **Response (200):** Work item updated to `COMPLETED` status.

---

## 4. Developer Documentation Endpoints

### `POST /api/v1/work/:workId/documentation`
- **Auth:** Assigned Developer or Super Admin
- **Request:**
  ```json
  {
    "what_i_did": "...",
    "why_i_did_it": "...",
    "changes_made": "...",
    "files_affected": ["src/main.cpp", "src/interop.dart"],
    "testing_performed": "...",
    "result": "..."
  }
  ```
- **Response (201):** Documentation entity in `DRAFT` status.

### `POST /api/v1/documentation/:id/submit`
- **Auth:** Assigned Developer
- **Response (200):** Document marked `SUBMITTED`, version snapshot created, work status updated to `DOCUMENTATION_SUBMITTED`.

### `POST /api/v1/documentation/:id/review`
- **Auth:** `SUPER_ADMIN`, `ADMIN`
- **Request:**
  ```json
  { "action": "APPROVE" | "REQUEST_CHANGES" | "FEEDBACK", "feedback": "Detailed review notes" }
  ```
- **Response (200):** Document updated and work status synchronized.

---

## 5. Testing & Quick Test Endpoints

### `GET /api/v1/testing/objectives`
- **Auth:** All Roles (Testers see assigned objectives)
- **Response (200):** List of testing objectives.

### `POST /api/v1/testing/sessions` (Start Quick Test)
- **Auth:** `TESTER`, `ADMIN`, `SUPER_ADMIN`
- **Request:**
  ```json
  { "objectiveId": "uuid", "deviceId": "uuid", "appVersion": "v1.4", "androidVersion": "14" }
  ```
- **Response (201):** Created session with generated `test_id`.

### `POST /api/v1/testing/submissions`
- **Auth:** `TESTER`, `ADMIN`, `SUPER_ADMIN`
- **Request:**
  ```json
  {
    "sessionId": "uuid",
    "scenarioName": "...",
    "description": "...",
    "expectedResult": "...",
    "actualResult": "...",
    "outcome": "PASS" | "FAIL" | "BLOCKED" | "NOT_TESTED",
    "testerNotes": "..."
  }
  ```
- **Response (201):** Test submission recorded in `SUBMITTED` status.

### `POST /api/v1/testing/submissions/:id/review`
- **Auth:** `SUPER_ADMIN`, `ADMIN`
- **Request:** `{ "action": "APPROVE" | "REJECT" | "REQUEST_RETEST", "feedback": "..." }`
- **Response (200):** Review recorded in history and submission status updated.

---

## 6. PostgreSQL RDS Administration (Privileged)

- **Auth:** Strictly `SUPER_ADMIN` and `ADMIN`
- **Endpoints:**
  - `GET /api/v1/database/status`
  - `GET /api/v1/database/info`
  - `GET /api/v1/database/schemas`
  - `GET /api/v1/database/tables`
  - `GET /api/v1/database/tables/:table/rows`
  - `POST /api/v1/database/tables/:table/rows`
  - `PATCH /api/v1/database/tables/:table/rows/:id`
  - `DELETE /api/v1/database/tables/:table/rows/:id`
  - `GET /api/v1/database/users`
  - `POST /api/v1/database/users`
  - `GET /api/v1/database/migrations`
  - `POST /api/v1/database/migrations/:id/apply`
  - `GET /api/v1/database/backups`
  - `POST /api/v1/database/backups/:backupId/restore-token`
  - `POST /api/v1/database/restore` (Requires `confirmation_token`)

---

## 7. Database Exports

- **Auth:** Strictly `SUPER_ADMIN` and `ADMIN`
- `POST /api/v1/exports`: Request `SQL`, `CSV`, or `JSON` export.
- `GET /api/v1/exports/:id/download`: Authenticated file stream.

---

## 8. Audit & Health

- `GET /api/v1/audit`: Append-only audit trail query (`SUPER_ADMIN` and `ADMIN`).
- `GET /health`, `GET /health/live`, `GET /health/ready`: System & infrastructure readiness checks.
