# VoiceShield Console Security & Least Privilege Architecture

---

## 1. Authentication & Session Security

- **JWT Tokens:** Signed using HMAC-SHA256 with minimum 256-bit entropy secret (`JWT_SECRET`). Tokens expire in 15 minutes.
- **Refresh Token Rotation:** Issued with 7-day expiration. Upon token refresh, the previous refresh token is immediately invalidated (`revoked = true`). Single-use refresh token prevents replay attacks.
- **Password Security:** Hashed with Bcrypt (cost factor 12 in production, salt rounds 4 in test mode).
- **Failed Login Lockout:** Accounts are temporarily locked for 15 minutes after 5 consecutive failed attempts to thwart online brute force attacks.
- **MFA Architecture Readiness:** The auth service is designed with extensible multi-factor hooks (`mfaEnabled`, `mfaSecret`) for privileged `SUPER_ADMIN` and `ADMIN` accounts.

---

## 2. Server-Side RBAC & Resource Isolation

Authorization is never delegated to the frontend:

```text
HTTP Request
     ↓
Authentication Middleware (Validates JWT signature, expiration, active user status)
     ↓
RBAC Role & Permission Guard (Verifies required permissions in matrix)
     ↓
Resource-Level Ownership Check (Ensures user has access to specific entity ID)
     ↓
Controller / Service Execution
     ↓
Append-Only Audit Recording
```

### Invariants:
1. **Admin Separation:** Admins cannot assign engineering work to other Admins or manage Admin accounts.
2. **Developer Isolation:** Developers can only access their own assigned work items and documentation. Developers cannot access RDS, generate exports, or manage users/devices.
3. **Tester Isolation:** Testers can only view/update their own sessions, submissions, and evidence. Testers cannot review submissions or access database administration.

---

## 3. Privileged RDS Subsystem Protections

1. **No Raw SQL Execution Endpoint:** Normal users and clients cannot submit arbitrary SQL strings over the API.
2. **Parameterized Explorer Queries:** Table and schema identifiers are validated strictly against an allowlist; all row queries use parameterized placeholders (`$1, $2, ...`) preventing SQL injection.
3. **Destructive Operation Safeguards:** Database restoration requires an explicit, server-generated, time-limited `confirmation_token` (`CONFIRM_RESTORE_*`).
4. **Sensitive Data Masking:** Password hashes, tokens, and internal database connection strings are never exposed through API outputs or database exports.

---

## 4. File Upload & Object Storage Security

- Uploaded files are validated for allowed MIME types (`image/*`, `video/*`, `text/plain`, `text/csv`, `application/json`, `application/zip`) and size (<50MB).
- User-supplied filenames are sanitized and stored under randomized UUID storage keys (`evidence/{submissionId}/{uuid}.ext`) to prevent path traversal attacks.
- Uploaded binaries are never directly executed by the server; downloads are streamed through authenticated endpoints.

---

## 5. Audit Immutability & Traceability

- Every request is tagged with a unique `X-Request-ID` (UUIDv4) header and correlated in structured application logs.
- All state transitions, assignments, test reviews, privileged RDS operations, and export downloads generate immutable records in the `audit_logs` table.
- No `UPDATE` or `DELETE` API endpoints exist for audit records.
