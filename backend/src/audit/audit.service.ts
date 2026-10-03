import { v4 as uuidv4 } from 'uuid';
import { DataStore, AuditLogEntity } from '../database/data-store';
import { Logger } from '../common/logger';
import { PaginatedResult, PaginationQuery } from '../common/types';

export interface RecordAuditInput {
  eventType: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  private static instance: AuditService;
  private store = DataStore.getInstance();

  private constructor() {}

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async record(input: RecordAuditInput): Promise<AuditLogEntity> {
    const log: AuditLogEntity = {
      id: uuidv4(),
      event_type: input.eventType,
      actor_id: input.actorId,
      actor_role: input.actorRole,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      request_id: input.requestId,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
      metadata: input.metadata,
      created_at: new Date().toISOString(),
    };

    this.store.auditLogs.set(log.id, log);

    Logger.info(`[AUDIT] ${log.event_type} - ${log.action}`, {
      requestId: log.request_id,
      userId: log.actor_id,
      role: log.actor_role,
      resource: `${log.resource_type}:${log.resource_id || 'general'}`,
      operation: log.action,
      result: 'SUCCESS',
      details: log.metadata,
    });

    return log;
  }

  async list(
    query: PaginationQuery & {
      actorId?: string;
      eventType?: string;
      resourceType?: string;
      resourceId?: string;
    }
  ): Promise<PaginatedResult<AuditLogEntity>> {
    let logs = Array.from(this.store.auditLogs.values());

    if (query.actorId) {
      logs = logs.filter((l) => l.actor_id === query.actorId);
    }
    if (query.eventType) {
      logs = logs.filter((l) => l.event_type.toLowerCase() === query.eventType?.toLowerCase());
    }
    if (query.resourceType) {
      logs = logs.filter((l) => l.resource_type.toLowerCase() === query.resourceType?.toLowerCase());
    }
    if (query.resourceId) {
      logs = logs.filter((l) => l.resource_id === query.resourceId);
    }

    // Sort descending by created_at
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const total = logs.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const pagedData = logs.slice(start, start + pageSize);

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

  async getById(id: string): Promise<AuditLogEntity | null> {
    return this.store.auditLogs.get(id) || null;
  }
}
