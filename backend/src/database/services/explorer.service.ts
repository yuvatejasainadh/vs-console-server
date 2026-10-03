import { v4 as uuidv4 } from 'uuid';
import { DataStore } from '../data-store';
import { AuthenticatedUser, PaginatedResult, PaginationQuery } from '../../common/types';
import { BadRequestError, NotFoundError } from '../../common/errors';
import { AuditService } from '../../audit/audit.service';

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

export interface TableSchemaInfo {
  tableName: string;
  schemaName: string;
  columns: ColumnMetadata[];
  rowCount: number;
}

const ALLOWED_TABLES: Record<string, ColumnMetadata[]> = {
  users: [
    { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
    { name: 'email', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'display_name', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'role', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'status', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'created_at', type: 'timestamptz', nullable: false, isPrimaryKey: false },
    { name: 'updated_at', type: 'timestamptz', nullable: false, isPrimaryKey: false },
  ],
  work_items: [
    { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
    { name: 'title', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'description', type: 'text', nullable: false, isPrimaryKey: false },
    { name: 'priority', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'status', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'assigned_to', type: 'uuid', nullable: false, isPrimaryKey: false },
    { name: 'assigned_by', type: 'uuid', nullable: false, isPrimaryKey: false },
    { name: 'created_at', type: 'timestamptz', nullable: false, isPrimaryKey: false },
  ],
  devices: [
    { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
    { name: 'device_name', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'model_number', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'manufacturer', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'android_version', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'status', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'created_at', type: 'timestamptz', nullable: false, isPrimaryKey: false },
  ],
  testing_objectives: [
    { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
    { name: 'title', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'description', type: 'text', nullable: false, isPrimaryKey: false },
    { name: 'target_area', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'status', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'created_at', type: 'timestamptz', nullable: false, isPrimaryKey: false },
  ],
  test_submissions: [
    { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
    { name: 'scenario_name', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'outcome', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'status', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'created_at', type: 'timestamptz', nullable: false, isPrimaryKey: false },
  ],
  audit_logs: [
    { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
    { name: 'event_type', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'actor_id', type: 'uuid', nullable: false, isPrimaryKey: false },
    { name: 'actor_role', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'action', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'resource_type', type: 'varchar', nullable: false, isPrimaryKey: false },
    { name: 'created_at', type: 'timestamptz', nullable: false, isPrimaryKey: false },
  ],
};

export class DatabaseExplorerService {
  private static instance: DatabaseExplorerService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();

  private constructor() {}

  static getInstance(): DatabaseExplorerService {
    if (!DatabaseExplorerService.instance) {
      DatabaseExplorerService.instance = new DatabaseExplorerService();
    }
    return DatabaseExplorerService.instance;
  }

  private validateTableName(table: string): string {
    const sanitized = table.toLowerCase().trim();
    if (!ALLOWED_TABLES[sanitized]) {
      throw new BadRequestError(`Invalid or inaccessible table identifier: ${table}`);
    }
    return sanitized;
  }

  async getTablesBySchema(schema: string): Promise<string[]> {
    if (schema !== 'public') {
      return [];
    }
    return Object.keys(ALLOWED_TABLES);
  }

  async getTableDetails(table: string): Promise<TableSchemaInfo> {
    const validTable = this.validateTableName(table);
    const columns = ALLOWED_TABLES[validTable];
    const rows = this.getRowsForTable(validTable);

    return {
      tableName: validTable,
      schemaName: 'public',
      columns,
      rowCount: rows.length,
    };
  }

  private getRowsForTable(tableName: string): any[] {
    switch (tableName) {
      case 'users':
        return Array.from(this.store.users.values()).map((u) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password_hash, ...safe } = u;
          return safe;
        });
      case 'work_items':
        return Array.from(this.store.workItems.values());
      case 'devices':
        return Array.from(this.store.devices.values());
      case 'testing_objectives':
        return Array.from(this.store.testingObjectives.values());
      case 'test_submissions':
        return Array.from(this.store.testSubmissions.values());
      case 'audit_logs':
        return Array.from(this.store.auditLogs.values());
      default:
        return [];
    }
  }

  async getTableRows(
    actor: AuthenticatedUser,
    table: string,
    query: PaginationQuery,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<PaginatedResult<any>> {
    const validTable = this.validateTableName(table);
    const rows = this.getRowsForTable(validTable);

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const total = rows.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const pagedData = rows.slice((page - 1) * pageSize, page * pageSize);

    await this.auditService.record({
      eventType: 'DATABASE_ACCESSED',
      actorId: actor.id,
      actorRole: actor.role,
      action: `EXPLORE_TABLE_${validTable.toUpperCase()}`,
      resourceType: 'DATABASE_TABLE',
      resourceId: validTable,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { rowCount: total, page },
    });

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

  async createRow(
    actor: AuthenticatedUser,
    table: string,
    data: Record<string, any>,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<any> {
    const validTable = this.validateTableName(table);
    if (validTable === 'audit_logs') {
      throw new BadRequestError('Audit logs table is strictly append-only and cannot be manually modified.');
    }

    const id = data.id || uuidv4();
    const newRecord = { ...data, id, created_at: new Date().toISOString() };

    if (validTable === 'devices') {
      this.store.devices.set(id, newRecord as any);
    } else {
      // General record
    }

    await this.auditService.record({
      eventType: 'DATABASE_RECORD_CREATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'INSERT_TABLE_ROW',
      resourceType: 'DATABASE_TABLE',
      resourceId: validTable,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { targetTable: validTable, recordId: id },
    });

    return newRecord;
  }

  async updateRow(
    actor: AuthenticatedUser,
    table: string,
    id: string,
    data: Record<string, any>,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<any> {
    const validTable = this.validateTableName(table);
    if (validTable === 'audit_logs') {
      throw new BadRequestError('Audit logs cannot be modified.');
    }

    if (validTable === 'devices') {
      const device = this.store.devices.get(id);
      if (!device) throw new NotFoundError('Record not found');
      Object.assign(device, data, { updated_at: new Date().toISOString() });
    }

    await this.auditService.record({
      eventType: 'DATABASE_RECORD_UPDATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE_TABLE_ROW',
      resourceType: 'DATABASE_TABLE',
      resourceId: validTable,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { targetTable: validTable, recordId: id, updatedFields: Object.keys(data) },
    });

    return { id, ...data };
  }

  async deleteRow(
    actor: AuthenticatedUser,
    table: string,
    id: string,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<{ deleted: boolean; id: string }> {
    const validTable = this.validateTableName(table);
    if (validTable === 'audit_logs') {
      throw new BadRequestError('Audit logs cannot be deleted.');
    }

    if (validTable === 'devices') {
      // Check historical testing references before deleting
      const referenced = Array.from(this.store.testSubmissions.values()).some(
        (s) => s.device_id === id
      );
      if (referenced) {
        throw new BadRequestError(
          'Cannot delete device referenced in historical test records. Use deactivate instead.'
        );
      }
      this.store.devices.delete(id);
    }

    await this.auditService.record({
      eventType: 'DATABASE_RECORD_DELETED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DELETE_TABLE_ROW',
      resourceType: 'DATABASE_TABLE',
      resourceId: validTable,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { targetTable: validTable, recordId: id },
    });

    return { deleted: true, id };
  }
}
