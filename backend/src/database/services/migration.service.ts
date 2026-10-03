import { AuthenticatedUser } from '../../common/types';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../common/errors';

export interface MigrationRecord {
  id: string;
  name: string;
  version: string;
  status: 'APPLIED' | 'PENDING' | 'FAILED';
  appliedAt?: string;
  appliedBy?: string;
  checksum: string;
  description: string;
}

const AVAILABLE_MIGRATIONS: MigrationRecord[] = [
  {
    id: '001_init_core_schema',
    name: '001_init_core_schema',
    version: '2026.10.01.001',
    status: 'APPLIED',
    appliedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    appliedBy: 'SYSTEM_BOOTSTRAP',
    checksum: 'sha256:4f5a3e2b9c8d7e6f',
    description: 'Initial schema creation: users, roles, permissions, work_items, audit_logs',
  },
  {
    id: '002_testing_and_devices_schema',
    name: '002_testing_and_devices_schema',
    version: '2026.10.02.001',
    status: 'APPLIED',
    appliedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    appliedBy: 'SYSTEM_BOOTSTRAP',
    checksum: 'sha256:7b8a9c0d1e2f3a4b',
    description: 'Testing objectives, sessions, submissions, reviews, devices, evidence',
  },
  {
    id: '003_exports_and_notifications_schema',
    name: '003_exports_and_notifications_schema',
    version: '2026.10.03.001',
    status: 'APPLIED',
    appliedAt: new Date().toISOString(),
    appliedBy: 'SYSTEM_BOOTSTRAP',
    checksum: 'sha256:1a2b3c4d5e6f7a8b',
    description: 'Database exports, notifications, backups, and token tracking tables',
  },
];

export class MigrationService {
  private static instance: MigrationService;
  private migrations: Map<string, MigrationRecord> = new Map();
  private auditService = AuditService.getInstance();

  private constructor() {
    AVAILABLE_MIGRATIONS.forEach((m) => this.migrations.set(m.id, { ...m }));
  }

  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  async list(actor: AuthenticatedUser): Promise<MigrationRecord[]> {
    return Array.from(this.migrations.values());
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<MigrationRecord> {
    const migration = this.migrations.get(id);
    if (!migration) {
      throw new NotFoundError('Migration not found');
    }
    return migration;
  }

  async apply(
    actor: AuthenticatedUser,
    id: string,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<MigrationRecord> {
    const migration = this.migrations.get(id);
    if (!migration) {
      throw new NotFoundError('Migration not found');
    }

    const now = new Date().toISOString();
    migration.status = 'APPLIED';
    migration.appliedAt = now;
    migration.appliedBy = actor.id;

    await this.auditService.record({
      eventType: 'DATABASE_MIGRATION_APPLIED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'APPLY_MIGRATION',
      resourceType: 'DATABASE_MIGRATION',
      resourceId: migration.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { migrationName: migration.name, version: migration.version },
    });

    return migration;
  }
}
