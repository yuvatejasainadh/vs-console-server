import { v4 as uuidv4 } from 'uuid';
import { DataStore, DatabaseBackupEntity } from '../data-store';
import { AuthenticatedUser } from '../../common/types';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../common/errors';
import { AuditService } from '../../audit/audit.service';

export interface RestoreRequestDto {
  backupId: string;
  confirmationToken: string;
}

export class BackupRestoreService {
  private static instance: BackupRestoreService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();

  private constructor() {
    this.seedDefaultBackups();
  }

  static getInstance(): BackupRestoreService {
    if (!BackupRestoreService.instance) {
      BackupRestoreService.instance = new BackupRestoreService();
    }
    return BackupRestoreService.instance;
  }

  private seedDefaultBackups(): void {
    if (this.store.databaseBackups.size === 0) {
      const backup: DatabaseBackupEntity = {
        id: uuidv4(),
        backup_name: 'voiceshield-rds-snapshot-daily-latest',
        storage_key: 'backups/rds/voiceshield_snap_daily.dump',
        size_bytes: 14285714,
        created_by: 'SYSTEM_AUTOMATION',
        created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      };
      this.store.databaseBackups.set(backup.id, backup);
    }
  }

  async list(actor: AuthenticatedUser): Promise<DatabaseBackupEntity[]> {
    const list = Array.from(this.store.databaseBackups.values());
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }

  async createBackup(
    actor: AuthenticatedUser,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<DatabaseBackupEntity> {
    const now = new Date().toISOString();
    const backup: DatabaseBackupEntity = {
      id: uuidv4(),
      backup_name: `voiceshield-manual-snapshot-${Date.now()}`,
      storage_key: `backups/rds/manual_${Date.now()}.dump`,
      size_bytes: 14500000,
      created_by: actor.id,
      created_at: now,
    };

    this.store.databaseBackups.set(backup.id, backup);

    await this.auditService.record({
      eventType: 'DATABASE_BACKUP',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CREATE_RDS_BACKUP',
      resourceType: 'DATABASE_BACKUP',
      resourceId: backup.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { backupName: backup.backup_name, sizeBytes: backup.size_bytes },
    });

    return backup;
  }

  async generateRestoreConfirmationToken(
    actor: AuthenticatedUser,
    backupId: string
  ): Promise<{ token: string; expiresAt: string; message: string }> {
    const backup = this.store.databaseBackups.get(backupId);
    if (!backup) throw new NotFoundError('Backup not found');

    const token = `CONFIRM_RESTORE_${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.store.confirmationTokens.set(token, {
      action: 'RESTORE_DATABASE',
      payload: { backupId },
      expiresAt,
    });

    return {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      message:
        'WARNING: Restoring a database snapshot will overwrite current data. Submit this confirmation_token to proceed.',
    };
  }

  async restore(
    actor: AuthenticatedUser,
    dto: RestoreRequestDto,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string; backupId: string }> {
    const tokenRecord = this.store.confirmationTokens.get(dto.confirmationToken);

    if (!tokenRecord || tokenRecord.action !== 'RESTORE_DATABASE') {
      await this.auditService.record({
        eventType: 'DATABASE_RESTORE',
        actorId: actor.id,
        actorRole: actor.role,
        action: 'ATTEMPT_RESTORE_INVALID_TOKEN',
        resourceType: 'DATABASE_RESTORE',
        resourceId: dto.backupId,
        requestId: meta?.requestId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { status: 'FAILED_INVALID_CONFIRMATION_TOKEN' },
      });
      throw new BadRequestError('Invalid or expired confirmation token for database restore.');
    }

    if (Date.now() > tokenRecord.expiresAt) {
      this.store.confirmationTokens.delete(dto.confirmationToken);
      throw new BadRequestError('Confirmation token has expired.');
    }

    const backup = this.store.databaseBackups.get(dto.backupId);
    if (!backup) {
      throw new NotFoundError('Backup snapshot not found');
    }

    // Invalidate token after consumption
    this.store.confirmationTokens.delete(dto.confirmationToken);

    await this.auditService.record({
      eventType: 'DATABASE_RESTORE',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'RESTORE_DATABASE_SNAPSHOT',
      resourceType: 'DATABASE_RESTORE',
      resourceId: backup.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { backupName: backup.backup_name, status: 'SUCCESS' },
    });

    return {
      success: true,
      message: `Database successfully restored from snapshot ${backup.backup_name}`,
      backupId: backup.id,
    };
  }
}
