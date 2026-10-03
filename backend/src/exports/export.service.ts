import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { DataStore, DatabaseExportEntity, ExportFormat } from '../database/data-store';
import { UserRole } from '../roles/roles.enum';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { AuthenticatedUser, PaginatedResult, PaginationQuery } from '../common/types';
import { ForbiddenError, NotFoundError, BadRequestError } from '../common/errors';
import { CreateExportDto } from './export.dto';

export class ExportService {
  private static instance: ExportService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();
  private notificationService = NotificationService.getInstance();
  private localStoragePath: string;

  private constructor() {
    this.localStoragePath = path.resolve(process.cwd(), config.localStorageDir);
    if (!fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
    }
  }

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  private generateExportContent(format: ExportFormat, tables: string[]): string {
    if (format === 'JSON') {
      const data: Record<string, any[]> = {};
      if (tables.includes('users') || tables.includes('all')) {
        data.users = Array.from(this.store.users.values()).map((u) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password_hash, ...safe } = u;
          return safe;
        });
      }
      if (tables.includes('work_items') || tables.includes('all')) {
        data.work_items = Array.from(this.store.workItems.values());
      }
      if (tables.includes('devices') || tables.includes('all')) {
        data.devices = Array.from(this.store.devices.values());
      }
      if (tables.includes('testing_objectives') || tables.includes('all')) {
        data.testing_objectives = Array.from(this.store.testingObjectives.values());
      }
      if (tables.includes('test_submissions') || tables.includes('all')) {
        data.test_submissions = Array.from(this.store.testSubmissions.values());
      }
      return JSON.stringify(data, null, 2);
    }

    if (format === 'CSV') {
      const rows: string[] = ['table_name,id,created_at,record_json'];
      if (tables.includes('devices') || tables.includes('all')) {
        for (const d of this.store.devices.values()) {
          rows.push(`"devices","${d.id}","${d.created_at}","${d.device_name} (${d.model_number})"`);
        }
      }
      if (tables.includes('work_items') || tables.includes('all')) {
        for (const w of this.store.workItems.values()) {
          rows.push(`"work_items","${w.id}","${w.created_at}","${w.title.replace(/"/g, '""')}"`);
        }
      }
      return rows.join('\n');
    }

    // SQL dump format
    const sqlStatements: string[] = [
      '-- VoiceShield Console Database Export',
      `-- Generated at: ${new Date().toISOString()}`,
      'BEGIN;\n',
    ];

    if (tables.includes('devices') || tables.includes('all')) {
      for (const d of this.store.devices.values()) {
        sqlStatements.push(
          `INSERT INTO devices (id, device_name, model_number, manufacturer, android_version, status, created_at, updated_at) VALUES ('${d.id}', '${d.device_name}', '${d.model_number}', '${d.manufacturer}', '${d.android_version}', '${d.status}', '${d.created_at}', '${d.updated_at}') ON CONFLICT (id) DO NOTHING;`
        );
      }
    }
    sqlStatements.push('\nCOMMIT;');
    return sqlStatements.join('\n');
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateExportDto,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<DatabaseExportEntity> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only Admins and Super Admins can generate database exports.');
    }

    const now = new Date().toISOString();
    const exportId = uuidv4();
    const fileExt = dto.format.toLowerCase();
    const storageKey = `exports/${exportId}.${fileExt}`;
    const fullPath = path.join(this.localStoragePath, storageKey);

    const targetDir = path.dirname(fullPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Generate content and write file
    const content = this.generateExportContent(dto.format, dto.tables);
    fs.writeFileSync(fullPath, content, 'utf-8');

    const exportEntity: DatabaseExportEntity = {
      id: exportId,
      requested_by: actor.id,
      format: dto.format,
      database_name: dto.databaseName || 'voiceshield_console',
      schema_name: dto.schemaName || 'public',
      tables: dto.tables,
      status: 'COMPLETED',
      storage_key: storageKey,
      created_at: now,
      completed_at: now,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };

    this.store.databaseExports.set(exportEntity.id, exportEntity);

    await this.auditService.record({
      eventType: 'EXPORT_CREATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CREATE_DATABASE_EXPORT',
      resourceType: 'DATABASE_EXPORT',
      resourceId: exportEntity.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: {
        format: exportEntity.format,
        tables: exportEntity.tables,
        status: exportEntity.status,
      },
    });

    await this.notificationService.notify(
      actor.id,
      'Database Export Ready',
      `Your database export (${exportEntity.format}) is ready for download.`,
      'EXPORT_COMPLETED',
      { exportId: exportEntity.id }
    );

    return exportEntity;
  }

  async list(
    actor: AuthenticatedUser,
    query: PaginationQuery
  ): Promise<PaginatedResult<DatabaseExportEntity>> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only Admins and Super Admins can view database exports.');
    }

    const items = Array.from(this.store.databaseExports.values());
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const pagedData = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: pagedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<DatabaseExportEntity> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only Admins and Super Admins can access database exports.');
    }

    const item = this.store.databaseExports.get(id);
    if (!item) {
      throw new NotFoundError('Export record not found');
    }
    return item;
  }

  async getDownloadStream(
    actor: AuthenticatedUser,
    id: string,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<{ stream: fs.ReadStream; exportRecord: DatabaseExportEntity; filename: string }> {
    const exportRecord = await this.getById(actor, id);

    if (!exportRecord.storage_key) {
      throw new NotFoundError('Export file storage not found');
    }

    const fullPath = path.join(this.localStoragePath, exportRecord.storage_key);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Export file has expired or was removed from storage');
    }

    const filename = `voiceshield_export_${exportRecord.database_name}_${exportRecord.id.slice(0, 8)}.${exportRecord.format.toLowerCase()}`;

    await this.auditService.record({
      eventType: 'EXPORT_DOWNLOADED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DOWNLOAD_DATABASE_EXPORT',
      resourceType: 'DATABASE_EXPORT',
      resourceId: exportRecord.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { format: exportRecord.format, filename },
    });

    return {
      stream: fs.createReadStream(fullPath),
      exportRecord,
      filename,
    };
  }
}
