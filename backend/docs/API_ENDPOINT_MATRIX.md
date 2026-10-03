# VoiceShield Console — API Endpoint Matrix (Frozen Contract v1.0)

> **API Contract Status:** `FROZEN`
> **Base URL:** `/api/v1` (Health endpoints at `/health`)
> **Standard Response Envelope:** `{ success: boolean, data?: T, error?: { code, message, details? }, meta?: { page, limit, total, totalPages }, requestId: string }`

---

## 1. Authentication (`/api/v1/auth`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | None | None | `{ email, password }` | None | None | `200 OK`<br>`{ user, accessToken, refreshToken }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Account Disabled` |
| `POST` | `/api/v1/auth/refresh` | Public | None | None | `{ refreshToken }` | None | None | `200 OK`<br>`{ accessToken, refreshToken }` | `400 Bad Request`<br>`401 Unauthorized` |
| `POST` | `/api/v1/auth/logout` | JWT | Any | None | `{ refreshToken }` | None | None | `200 OK`<br>`{ message: "Logged out" }` | `401 Unauthorized` |
| `GET` | `/api/v1/auth/me` | JWT | Any | None | None | None | None | `200 OK`<br>`{ user: { id, email, name, role, permissions, status } }` | `401 Unauthorized` |
| `POST` | `/api/v1/auth/change-password` | JWT | Any | None | `{ currentPassword, newPassword }` | None | None | `200 OK`<br>`{ message: "Password updated" }` | `400 Bad Request`<br>`401 Unauthorized` |

---

## 2. User Management (`/api/v1/users`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users` | JWT | `SUPER_ADMIN`, `ADMIN` | `users:read` | None | `page`, `limit`, `role`, `status`, `search` | None | `200 OK`<br>`{ users: [...], meta }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/users/:id` | JWT | `SUPER_ADMIN`, `ADMIN` | `users:read` | None | None | `id` (UUID) | `200 OK`<br>`{ user }` | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `POST` | `/api/v1/users` | JWT | `SUPER_ADMIN`, `ADMIN`* | `users:create` | `{ email, name, password, role }` | None | None | `201 Created`<br>`{ user }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`409 Conflict` |
| `PUT` | `/api/v1/users/:id` | JWT | `SUPER_ADMIN`, `ADMIN`* | `users:update` | `{ name, email }` | None | `id` (UUID) | `200 OK`<br>`{ user }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `PATCH` | `/api/v1/users/:id/status` | JWT | `SUPER_ADMIN`, `ADMIN`* | `users:update` | `{ status: "ACTIVE" \| "DISABLED" }` | None | `id` (UUID) | `200 OK`<br>`{ user }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `PATCH` | `/api/v1/users/:id/role` | JWT | `SUPER_ADMIN` | `users:manage_roles` | `{ role }` | None | `id` (UUID) | `200 OK`<br>`{ user }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |

*\*Note: `ADMIN` cannot create, update, or disable `SUPER_ADMIN` or `ADMIN` user accounts.*

---

## 3. Work Management (`/api/v1/work`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/work` | JWT | Any | `work:read` | None | `page`, `limit`, `status`, `assignedToId`, `priority` | None | `200 OK`<br>`{ workItems: [...], meta }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/work/:id` | JWT | Any | `work:read` | None | None | `id` (UUID) | `200 OK`<br>`{ workItem }` | `401 Unauthorized`<br>`403 Forbidden` (IDOR)<br>`404 Not Found` |
| `POST` | `/api/v1/work` | JWT | `SUPER_ADMIN`, `ADMIN`* | `work:create` | `{ title, description, assignedToId, priority, dueDate }` | None | None | `201 Created`<br>`{ workItem }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` |
| `PATCH` | `/api/v1/work/:id/status` | JWT | Any | `work:update` | `{ status }` | None | `id` (UUID) | `200 OK`<br>`{ workItem }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` (IDOR / Invalid transition)<br>`404 Not Found` |
| `PATCH` | `/api/v1/work/:id/assign` | JWT | `SUPER_ADMIN`, `ADMIN`* | `work:assign` | `{ assignedToId }` | None | `id` (UUID) | `200 OK`<br>`{ workItem }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` |

*\*Note: `ADMIN` cannot assign work to other `ADMIN` users.*

---

## 4. Developer Documentation (`/api/v1/documentation`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/documentation` | JWT | `SUPER_ADMIN`, `ADMIN`, `DEVELOPER` | `doc:read` | None | `page`, `limit`, `workId`, `status` | None | `200 OK`<br>`{ documents: [...], meta }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/documentation/:id` | JWT | `SUPER_ADMIN`, `ADMIN`, `DEVELOPER` | `doc:read` | None | None | `id` (UUID) | `200 OK`<br>`{ document }` | `401 Unauthorized`<br>`403 Forbidden` (IDOR)<br>`404 Not Found` |
| `POST` | `/api/v1/documentation` | JWT | `SUPER_ADMIN`, `ADMIN`, `DEVELOPER` | `doc:create` | `{ workId, title, content }` | None | None | `201 Created`<br>`{ document }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` (IDOR) |
| `PUT` | `/api/v1/documentation/:id` | JWT | `SUPER_ADMIN`, `ADMIN`, `DEVELOPER` | `doc:update` | `{ title, content }` | None | `id` (UUID) | `200 OK`<br>`{ document }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` (IDOR) |
| `POST` | `/api/v1/documentation/:id/versions` | JWT | `SUPER_ADMIN`, `ADMIN`, `DEVELOPER` | `doc:update` | `{ content, changeSummary }` | None | `id` (UUID) | `201 Created`<br>`{ version }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` (IDOR) |
| `GET` | `/api/v1/documentation/:id/versions` | JWT | `SUPER_ADMIN`, `ADMIN`, `DEVELOPER` | `doc:read` | None | None | `id` (UUID) | `200 OK`<br>`{ versions: [...] }` | `401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/documentation/:id/submit` | JWT | `SUPER_ADMIN`, `ADMIN`, `DEVELOPER` | `doc:submit` | None | None | `id` (UUID) | `200 OK`<br>`{ document }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` (IDOR) |

---

## 5. Testing & Quick Test (`/api/v1/testing`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/testing/objectives` | JWT | Any | `testing:read` | None | `page`, `limit`, `status`, `assignedToId`, `workId` | None | `200 OK`<br>`{ objectives: [...], meta }` | `401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/testing/objectives` | JWT | `SUPER_ADMIN`, `ADMIN`, `DEVELOPER` | `testing:create_objective` | `{ workId, title, description, assignedToId, targetDeviceId }` | None | None | `201 Created`<br>`{ objective }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/testing/objectives/:id` | JWT | Any | `testing:read` | None | None | `id` (UUID) | `200 OK`<br>`{ objective }` | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `POST` | `/api/v1/testing/quick-test/start` | JWT | `SUPER_ADMIN`, `ADMIN`, `TESTER` | `testing:execute` | `{ objectiveId, deviceId }` | None | None | `201 Created`<br>`{ session }` | `400 Bad Request` (e.g. Inactive Device)<br>`401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/testing/quick-test/:id/end` | JWT | `SUPER_ADMIN`, `ADMIN`, `TESTER` | `testing:execute` | `{ notes, durationSeconds }` | None | `id` (UUID) | `200 OK`<br>`{ session }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/testing/submissions` | JWT | `SUPER_ADMIN`, `ADMIN`, `TESTER` | `testing:submit` | `{ objectiveId, deviceId, outcome, notes, logs, stepsExecuted, quickTestSessionId }` | None | None | `201 Created`<br>`{ submission }` | `400 Bad Request` (invalid outcome)<br>`401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/testing/submissions` | JWT | Any | `testing:read` | None | `page`, `limit`, `objectiveId`, `outcome`, `status` | None | `200 OK`<br>`{ submissions: [...], meta }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/testing/submissions/:id` | JWT | Any | `testing:read` | None | None | `id` (UUID) | `200 OK`<br>`{ submission }` | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `POST` | `/api/v1/testing/submissions/:id/evidence` | JWT | `SUPER_ADMIN`, `ADMIN`, `TESTER` | `testing:submit` | `{ fileId, description, evidenceType }` | None | `id` (UUID) | `201 Created`<br>`{ evidence }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` |

---

## 6. Compatible Device Management (`/api/v1/devices`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/devices` | JWT | Any | `devices:read` | None | `page`, `limit`, `status`, `osType`, `search` | None | `200 OK`<br>`{ devices: [...], meta }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/devices/:id` | JWT | Any | `devices:read` | None | None | `id` (UUID) | `200 OK`<br>`{ device }` | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `POST` | `/api/v1/devices` | JWT | `SUPER_ADMIN`, `ADMIN` | `devices:create` | `{ name, model, osType, osVersion, serialNumber, notes }` | None | None | `201 Created`<br>`{ device }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` |
| `PUT` | `/api/v1/devices/:id` | JWT | `SUPER_ADMIN`, `ADMIN` | `devices:update` | `{ name, model, osType, osVersion, notes }` | None | `id` (UUID) | `200 OK`<br>`{ device }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `PATCH` | `/api/v1/devices/:id/status` | JWT | `SUPER_ADMIN`, `ADMIN` | `devices:update` | `{ status: "ACTIVE" \| "INACTIVE" \| "MAINTENANCE" \| "DECOMMISSIONED", reason }` | None | `id` (UUID) | `200 OK`<br>`{ device }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |

---

## 7. Review & Feedback (`/api/v1/reviews`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/reviews` | JWT | `SUPER_ADMIN`, `ADMIN` | `review:create` | `{ targetType: "WORK" \| "DOCUMENTATION" \| "TEST_SUBMISSION", targetId, decision: "APPROVE" \| "REQUEST_CHANGES" \| "REJECT", comments }` | None | None | `201 Created`<br>`{ review }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden`<br>`404 Target Not Found` |
| `GET` | `/api/v1/reviews` | JWT | Any | `review:read` | None | `page`, `limit`, `targetType`, `targetId`, `reviewerId` | None | `200 OK`<br>`{ reviews: [...], meta }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/reviews/:id` | JWT | Any | `review:read` | None | None | `id` (UUID) | `200 OK`<br>`{ review }` | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |

---

## 8. Privileged PostgreSQL RDS Administration (`/api/v1/database`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/database/rds/status` | JWT | `SUPER_ADMIN`, `ADMIN` | `database:read` | None | None | None | `200 OK`<br>`{ status, engine, version, uptime, connections, storage }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/database/rds/info` | JWT | `SUPER_ADMIN`, `ADMIN` | `database:read` | None | None | None | `200 OK`<br>`{ instanceIdentifier, endpoint, port, dbName }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/database/rds/schemas` | JWT | `SUPER_ADMIN`, `ADMIN` | `database:read` | None | None | None | `200 OK`<br>`{ schemas: [...] }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/database/rds/tables` | JWT | `SUPER_ADMIN`, `ADMIN` | `database:read` | None | `schema` | None | `200 OK`<br>`{ tables: [...] }` | `401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/database/explorer/query` | JWT | `SUPER_ADMIN`, `ADMIN` | `database:explorer` | `{ table, schema, page, limit, sortColumn, sortOrder, filters }` | None | None | `200 OK`<br>`{ rows: [...], columns: [...], meta }` | `400 Bad Request` (e.g. audit_logs protection)<br>`401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/database/users` | JWT | `SUPER_ADMIN`, `ADMIN` | `database:users_read` | None | None | None | `200 OK`<br>`{ dbUsers: [...] }` | `401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/database/users` | JWT | `SUPER_ADMIN` | `database:users_manage` | `{ username, role, canLogin }` | None | None | `201 Created`<br>`{ dbUser }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/database/migrations` | JWT | `SUPER_ADMIN`, `ADMIN` | `database:migrations_read` | None | None | None | `200 OK`<br>`{ migrations: [...] }` | `401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/database/migrations/run` | JWT | `SUPER_ADMIN` | `database:migrations_run` | `{ migrationName }` | None | None | `200 OK`<br>`{ message, appliedMigration }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/database/backups` | JWT | `SUPER_ADMIN`, `ADMIN` | `database:backup` | None | None | None | `200 OK`<br>`{ backups: [...] }` | `401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/database/backups` | JWT | `SUPER_ADMIN` | `database:backup` | `{ backupType: "FULL" \| "SCHEMA_ONLY", description }` | None | None | `201 Created`<br>`{ backup }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/database/restore` | JWT | `SUPER_ADMIN` | `database:restore` | `{ backupId, confirmation_token }` | None | None | `200 OK`<br>`{ message, restoreOperationId }` | `400 Bad Request` (missing/invalid token)<br>`401 Unauthorized`<br>`403 Forbidden` |

---

## 9. Database Exports (`/api/v1/exports`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/exports` | JWT | `SUPER_ADMIN`, `ADMIN` | `exports:create` | `{ format: "SQL" \| "CSV" \| "JSON", tables: string[], includeSchema: boolean }` | None | None | `201 Created`<br>`{ exportJob }` | `400 Bad Request`<br>`401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/exports` | JWT | `SUPER_ADMIN`, `ADMIN` | `exports:read` | None | `page`, `limit` | None | `200 OK`<br>`{ exports: [...], meta }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/exports/:id` | JWT | `SUPER_ADMIN`, `ADMIN` | `exports:read` | None | None | `id` (UUID) | `200 OK`<br>`{ exportJob }` | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `GET` | `/api/v1/exports/:id/download` | JWT | `SUPER_ADMIN`, `ADMIN` | `exports:download` | None | None | `id` (UUID) | `200 OK`<br>File Stream (`Content-Disposition: attachment`) | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |

---

## 10. Audit Logging (`/api/v1/audit`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/audit` | JWT | `SUPER_ADMIN`, `ADMIN` | `audit:read` | None | `page`, `limit`, `action`, `actorId`, `entityType`, `startDate`, `endDate` | None | `200 OK`<br>`{ auditLogs: [...], meta }` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/audit/:id` | JWT | `SUPER_ADMIN`, `ADMIN` | `audit:read` | None | None | `id` (UUID) | `200 OK`<br>`{ auditLog }` | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |

---

## 11. File & Evidence Storage (`/api/v1/files`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/files/upload` | JWT | Any | `files:upload` | `multipart/form-data`<br>`file: Binary`, `purpose: string` | None | None | `201 Created`<br>`{ file: { id, filename, mimeType, sizeBytes, url } }` | `400 Bad Request`<br>`401 Unauthorized`<br>`413 File Too Large` |
| `GET` | `/api/v1/files/:id` | JWT | Any | `files:read` | None | None | `id` (UUID) | `200 OK`<br>`{ file }` | `401 Unauthorized`<br>`404 Not Found` |
| `GET` | `/api/v1/files/:id/download` | JWT | Any | `files:read` | None | None | `id` (UUID) | `200 OK`<br>File Stream / S3 Signed URL Redirect | `401 Unauthorized`<br>`404 Not Found` |

---

## 12. Notifications (`/api/v1/notifications`)

| Method | Path | Auth | Required Role | Required Permission | Request Body | Query Params | Path Params | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications` | JWT | Any | None | None | `page`, `limit`, `read: boolean` | None | `200 OK`<br>`{ notifications: [...], unreadCount, meta }` | `401 Unauthorized` |
| `PATCH` | `/api/v1/notifications/:id/read` | JWT | Any | None | None | None | `id` (UUID) | `200 OK`<br>`{ notification }` | `401 Unauthorized`<br>`404 Not Found` |
| `PATCH` | `/api/v1/notifications/read-all` | JWT | Any | None | None | None | None | `200 OK`<br>`{ message: "All notifications marked as read" }` | `401 Unauthorized` |

---

## 13. System Health & Documentation (`/health`, `/api/docs`)

| Method | Path | Auth | Required Role | Request Body | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | None | None | `200 OK` `{ status: "ok", timestamp }` | `503 Service Unavailable` |
| `GET` | `/health/live` | Public | None | None | `200 OK` `{ status: "live" }` | `503 Service Unavailable` |
| `GET` | `/health/ready` | Public | None | None | `200 OK` `{ status: "ready", database: "connected" }` | `503 Service Unavailable` |
| `GET` | `/api/docs.json` | Public | None | None | `200 OK` OpenAPI 3.0 Specification JSON | `500 Server Error` |
| `GET` | `/api/docs` | Public | None | None | `200 OK` Interactive Swagger UI HTML | `500 Server Error` |

---
