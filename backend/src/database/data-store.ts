import { UserRole } from '../roles/roles.enum';

export interface UserEntity {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  status: 'ACTIVE' | 'DISABLED';
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefreshTokenEntity {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

export type WorkStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DOCUMENTATION_SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'COMPLETED';

export type WorkPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WorkItemEntity {
  id: string;
  title: string;
  description: string;
  priority: WorkPriority;
  status: WorkStatus;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkAssignmentEntity {
  id: string;
  work_id: string;
  assigned_to: string;
  assigned_by: string;
  assigned_at: string;
}

export interface WorkStatusHistoryEntity {
  id: string;
  work_id: string;
  from_status: WorkStatus | null;
  to_status: WorkStatus;
  changed_by: string;
  notes?: string;
  created_at: string;
}

export type DocReviewStatus = 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED';

export interface DeveloperDocumentEntity {
  id: string;
  work_id: string;
  author_id: string;
  what_i_did: string;
  why_i_did_it: string;
  changes_made: string;
  files_affected: string[];
  problems_encountered?: string;
  solution?: string;
  testing_performed: string;
  result: string;
  next_steps?: string;
  references?: string[];
  status: DocReviewStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DeveloperDocumentVersionEntity {
  id: string;
  document_id: string;
  version_number: number;
  author_id: string;
  submitted_at: string;
  content_snapshot: Partial<DeveloperDocumentEntity>;
  review_status: DocReviewStatus;
  reviewer_id?: string;
  feedback?: string;
  created_at: string;
}

export interface DeveloperDocumentReviewEntity {
  id: string;
  document_id: string;
  version_number: number;
  reviewer_id: string;
  status: 'APPROVED' | 'CHANGES_REQUESTED' | 'FEEDBACK';
  feedback: string;
  created_at: string;
}

export interface TestingObjectiveEntity {
  id: string;
  title: string;
  description: string;
  target_area: string;
  assigned_to?: string;
  created_by: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
}

export interface TestSessionEntity {
  id: string;
  test_id: string;
  objective_id: string;
  tester_id: string;
  device_id: string;
  app_version: string;
  android_version: string;
  started_at: string;
  ended_at?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  created_at: string;
  updated_at: string;
}

export type TestOutcome = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_TESTED';

export type TestSubmissionStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'RETEST_REQUIRED'
  | 'CLOSED';

export interface TestSubmissionEntity {
  id: string;
  session_id: string;
  objective_id: string;
  tester_id: string;
  device_id: string;
  scenario_name: string;
  description: string;
  expected_result: string;
  actual_result: string;
  outcome: TestOutcome;
  tester_notes?: string;
  status: TestSubmissionStatus;
  reviewer_id?: string;
  review_feedback?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TestReviewEntity {
  id: string;
  submission_id: string;
  reviewer_id: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_RETEST' | 'FEEDBACK';
  feedback: string;
  created_at: string;
}

export interface DeviceEntity {
  id: string;
  device_name: string;
  model_number: string;
  manufacturer: string;
  android_version: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface DeviceStatusHistoryEntity {
  id: string;
  device_id: string;
  from_status: 'ACTIVE' | 'INACTIVE';
  to_status: 'ACTIVE' | 'INACTIVE';
  changed_by: string;
  reason?: string;
  created_at: string;
}

export type EvidenceType = 'SCREENSHOT' | 'SCREEN_RECORDING' | 'LOG_FILE' | 'OTHER';

export interface EvidenceFileEntity {
  id: string;
  submission_id: string;
  filename: string;
  mime_type: string;
  size: number;
  storage_key: string;
  evidence_type: EvidenceType;
  uploaded_by: string;
  created_at: string;
}

export interface AuditLogEntity {
  id: string;
  event_type: string;
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type ExportFormat = 'SQL' | 'CSV' | 'JSON';
export type ExportStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

export interface DatabaseExportEntity {
  id: string;
  requested_by: string;
  format: ExportFormat;
  database_name: string;
  schema_name: string;
  tables: string[];
  status: ExportStatus;
  storage_key?: string;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
}

export interface NotificationEntity {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  data?: Record<string, any>;
  created_at: string;
}

export interface DatabaseBackupEntity {
  id: string;
  backup_name: string;
  storage_key: string;
  size_bytes: number;
  created_by: string;
  created_at: string;
}

export interface DatabaseUserEntity {
  id: string;
  username: string;
  role: string;
  status: 'ACTIVE' | 'DISABLED';
  created_at: string;
  updated_at: string;
}

/**
 * In-memory state store for reliable, fast, zero-dependency testing and runtime persistence
 */
export class DataStore {
  private static instance: DataStore;

  users: Map<string, UserEntity> = new Map();
  refreshTokens: Map<string, RefreshTokenEntity> = new Map();
  workItems: Map<string, WorkItemEntity> = new Map();
  workAssignments: Map<string, WorkAssignmentEntity> = new Map();
  workStatusHistory: Map<string, WorkStatusHistoryEntity> = new Map();
  developerDocuments: Map<string, DeveloperDocumentEntity> = new Map();
  developerDocumentVersions: Map<string, DeveloperDocumentVersionEntity> = new Map();
  developerDocumentReviews: Map<string, DeveloperDocumentReviewEntity> = new Map();
  testingObjectives: Map<string, TestingObjectiveEntity> = new Map();
  testSessions: Map<string, TestSessionEntity> = new Map();
  testSubmissions: Map<string, TestSubmissionEntity> = new Map();
  testReviews: Map<string, TestReviewEntity> = new Map();
  devices: Map<string, DeviceEntity> = new Map();
  deviceStatusHistory: Map<string, DeviceStatusHistoryEntity> = new Map();
  evidenceFiles: Map<string, EvidenceFileEntity> = new Map();
  auditLogs: Map<string, AuditLogEntity> = new Map();
  databaseExports: Map<string, DatabaseExportEntity> = new Map();
  notifications: Map<string, NotificationEntity> = new Map();
  databaseBackups: Map<string, DatabaseBackupEntity> = new Map();
  databaseUsers: Map<string, DatabaseUserEntity> = new Map();

  // Confirmation tokens for dangerous actions
  confirmationTokens: Map<string, { action: string; payload: any; expiresAt: number }> = new Map();

  private constructor() {}

  static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  reset(): void {
    this.users.clear();
    this.refreshTokens.clear();
    this.workItems.clear();
    this.workAssignments.clear();
    this.workStatusHistory.clear();
    this.developerDocuments.clear();
    this.developerDocumentVersions.clear();
    this.developerDocumentReviews.clear();
    this.testingObjectives.clear();
    this.testSessions.clear();
    this.testSubmissions.clear();
    this.testReviews.clear();
    this.devices.clear();
    this.deviceStatusHistory.clear();
    this.evidenceFiles.clear();
    this.auditLogs.clear();
    this.databaseExports.clear();
    this.notifications.clear();
    this.databaseBackups.clear();
    this.databaseUsers.clear();
    this.confirmationTokens.clear();
  }
}
