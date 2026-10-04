export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DEVELOPER' | 'TESTER';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'ACTIVE' | 'DISABLED';
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: string;
  tokenType?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  requestId: string;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status:
    | 'ASSIGNED'
    | 'ACCEPTED'
    | 'IN_PROGRESS'
    | 'DOCUMENTATION_SUBMITTED'
    | 'CHANGES_REQUESTED'
    | 'APPROVED'
    | 'COMPLETED';
  assigned_to?: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
}

export interface DeveloperDocument {
  id: string;
  work_id: string;
  author_id: string;
  what_i_did: string;
  why_i_did_it: string;
  changes_made: string;
  files_affected: string[];
  problems_encountered: string;
  solution: string;
  testing_performed: string;
  result: string;
  next_steps: string;
  references: string[];
  status: 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  device_name: string;
  model_number: string;
  manufacturer: string;
  android_version: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface TestingObjective {
  id: string;
  title: string;
  description: string;
  target_area: string;
  assigned_to?: string;
  created_by: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  created_at: string;
}

export interface TestSession {
  id: string;
  objective_id?: string;
  device_id?: string;
  tester_id: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  start_time: string;
  end_time?: string;
  notes?: string;
  logs?: string;
}

export interface TestSubmission {
  id: string;
  session_id?: string;
  objective_id?: string;
  tester_id: string;
  device_id?: string;
  scenario_name: string;
  description: string;
  expected_result: string;
  actual_result: string;
  outcome: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_TESTED';
  tester_notes?: string;
  status:
    | 'ASSIGNED'
    | 'ACCEPTED'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'APPROVED'
    | 'RETEST_REQUIRED'
    | 'CLOSED';
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor_id: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  is_read: boolean;
  created_at: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  service?: string;
  version?: string;
  uptime?: number;
  checks?: {
    application?: string;
    database?: string;
    storage?: string;
  };
}

export interface RdsStatus {
  status: string;
  engine: string;
  version: string;
  uptimeSeconds: number;
  activeConnections: number;
  maxConnections: number;
  databaseSizeFormatted: string;
  database: string;
  host: string;
  port: number;
}
