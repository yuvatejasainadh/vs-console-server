# VoiceShield Console — Frontend Integration Checklist (Phase 2 Preparation)

Use this checklist during Phase 2 UI development to ensure 100% compliance with the frozen backend API contract.

---

## 1. Authentication & Security
- [ ] **Login Screen**
  - [ ] Implement `POST /api/v1/auth/login`
  - [ ] Store `accessToken` (memory/session) and `refreshToken` (secure storage/cookie)
  - [ ] Display descriptive validation errors from `error.details`
  - [ ] Support account lockout / disabled user state display (`403 FORBIDDEN`)
- [ ] **HTTP Interceptor / Token Refresh**
  - [ ] Automatic JWT Bearer injection on outgoing requests
  - [ ] Axios 401 interceptor calling `POST /api/v1/auth/refresh`
  - [ ] Clear session and redirect to `/login` on refresh failure
- [ ] **Current User Bootstrapping**
  - [ ] Fetch `GET /api/v1/auth/me` on app initialization
  - [ ] Store user permissions and active role in global state
- [ ] **User Profile / Password Change**
  - [ ] Implement `POST /api/v1/auth/change-password` with current & new password fields
- [ ] **Logout Action**
  - [ ] Implement `POST /api/v1/auth/logout` sending `{ refreshToken }`

---

## 2. Navigation & RBAC Route Guards
- [ ] **Role-Based Dynamic Menu**
  - [ ] `SUPER_ADMIN`: All menus visible (Users, Work, Testing, Devices, RDS Admin, Explorer, Exports, Audit)
  - [ ] `ADMIN`: Work, Testing, Devices, RDS Status, Explorer, Backups, Exports, Audit, User Management
  - [ ] `DEVELOPER`: Work Dashboard, Documentation Editor, Testing Objectives
  - [ ] `TESTER`: Testing Objectives, Quick Test Runner, Test Submissions, Device Catalog (Read-Only)
- [ ] **Client-Side Route Guards**
  - [ ] Block unauthorized URL navigation according to permissions before sending network requests

---

## 3. Work Management Module
- [ ] **Work Dashboard & List**
  - [ ] `GET /api/v1/work` with pagination (`page`, `limit`), filtering (`status`, `priority`), and sorting
- [ ] **Create Work Item Modal (Admin / Super Admin)**
  - [ ] `POST /api/v1/work`
  - [ ] Disable assigning work to other Admins if current user is `ADMIN`
- [ ] **Work Detail & Status Workflow**
  - [ ] `GET /api/v1/work/:id`
  - [ ] Developer actions: "Accept Work" (`ACCEPTED`), "Start Work" (`IN_PROGRESS`)
  - [ ] Admin actions: "Approve Work" (`APPROVED`), "Mark Completed" (`COMPLETED`), "Reassign" (`PATCH /api/v1/work/:id/assign`)

---

## 4. Developer Documentation Module
- [ ] **Documentation Editor**
  - [ ] `GET /api/v1/documentation` (filtered by `workId`)
  - [ ] Markdown / Rich Text editor supporting `POST /api/v1/documentation` and `PUT /api/v1/documentation/:id`
- [ ] **Version History & Snapshot Viewer**
  - [ ] `GET /api/v1/documentation/:id/versions`
  - [ ] "Save Snapshot Version": `POST /api/v1/documentation/:id/versions` with `changeSummary`
- [ ] **Submit Documentation for Review**
  - [ ] `POST /api/v1/documentation/:id/submit` (Transitions work item to `DOCUMENTATION_SUBMITTED`)

---

## 5. Testing & Compatible Devices Module
- [ ] **Testing Objectives Screen**
  - [ ] `GET /api/v1/testing/objectives`
  - [ ] Developer / Admin Create Objective Modal: `POST /api/v1/testing/objectives`
- [ ] **Quick Test Interactive Session Runner (Tester)**
  - [ ] Select objective and target active device
  - [ ] "Start Quick Test": `POST /api/v1/testing/quick-test/start`
  - [ ] Live elapsed timer & session notes tracker
  - [ ] "End Quick Test": `POST /api/v1/testing/quick-test/:id/end`
- [ ] **Manual Test Submission Form**
  - [ ] `POST /api/v1/testing/submissions`
  - [ ] Outcome selector: `PASS`, `FAIL`, `BLOCKED`, `NOT_TESTED`
  - [ ] Multipart file upload for screenshots/logs: `POST /api/v1/files/upload`
  - [ ] Attach evidence records: `POST /api/v1/testing/submissions/:id/evidence`
- [ ] **Compatible Device Catalog**
  - [ ] `GET /api/v1/devices` with status filter (`ACTIVE`, `INACTIVE`, `MAINTENANCE`, `DECOMMISSIONED`)
  - [ ] Admin device create/edit modal: `POST /api/v1/devices`, `PUT /api/v1/devices/:id`
  - [ ] Admin device status change modal: `PATCH /api/v1/devices/:id/status`

---

## 6. Review & Feedback Module (Admin / Super Admin)
- [ ] **Review Queue**
  - [ ] `GET /api/v1/reviews`
  - [ ] Filter by `targetType` (`WORK`, `DOCUMENTATION`, `TEST_SUBMISSION`)
- [ ] **Review Decision Modal**
  - [ ] `POST /api/v1/reviews` with `APPROVE`, `REQUEST_CHANGES`, or `REJECT` and review notes

---

## 7. PostgreSQL RDS Administration Module (Privileged)
- [ ] **RDS Metrics Dashboard**
  - [ ] `GET /api/v1/database/rds/status` & `GET /api/v1/database/rds/info`
  - [ ] Connection count gauge, storage gauge, uptime display
- [ ] **Database Explorer Grid**
  - [ ] `GET /api/v1/database/rds/schemas` & `GET /api/v1/database/rds/tables`
  - [ ] Tabular data view via `POST /api/v1/database/explorer/query` with pagination, column sorting, and filter builder
- [ ] **Database Backups & Safe Restore**
  - [ ] `GET /api/v1/database/backups`
  - [ ] Create snapshot: `POST /api/v1/database/backups`
  - [ ] Restore modal (Super Admin only) with mandatory confirmation prompt: `POST /api/v1/database/restore` `{ backupId, confirmation_token: "RESTORE_CONFIRM_<backupId>" }`
- [ ] **Database Exports Manager**
  - [ ] `POST /api/v1/exports` supporting SQL, CSV, JSON formats
  - [ ] Export jobs table with status badge polling (`GET /api/v1/exports`)
  - [ ] Secure stream download link: `GET /api/v1/exports/:id/download`

---

## 8. Audit History & System Notifications
- [ ] **Audit Trail Viewer**
  - [ ] `GET /api/v1/audit` with filter by actor, entity type, action, and date range
  - [ ] Detail modal: `GET /api/v1/audit/:id` (showing JSON changes / metadata)
- [ ] **In-App Notification Bell**
  - [ ] `GET /api/v1/notifications` with unread counter
  - [ ] "Mark as Read": `PATCH /api/v1/notifications/:id/read`
  - [ ] "Mark All Read": `PATCH /api/v1/notifications/read-all`
