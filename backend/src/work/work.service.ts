import { v4 as uuidv4 } from 'uuid';
import {
  DataStore,
  WorkItemEntity,
  WorkStatus,
  WorkAssignmentEntity,
  WorkStatusHistoryEntity,
} from '../database/data-store';
import { UserRole } from '../roles/roles.enum';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { AuthenticatedUser, PaginatedResult, PaginationQuery } from '../common/types';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../common/errors';
import { CreateWorkItemDto, UpdateWorkItemDto, AssignWorkDto } from './work.dto';

export class WorkService {
  private static instance: WorkService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();
  private notificationService = NotificationService.getInstance();

  private constructor() {}

  static getInstance(): WorkService {
    if (!WorkService.instance) {
      WorkService.instance = new WorkService();
    }
    return WorkService.instance;
  }

  private validateAssignmentPermission(actor: AuthenticatedUser, targetUserId: string): void {
    const targetUser = this.store.users.get(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Target assignee user not found');
    }

    if (targetUser.status === 'DISABLED') {
      throw new BadRequestError('Cannot assign work to a disabled user account');
    }

    if (actor.role === UserRole.SUPER_ADMIN) {
      // Super Admin can assign to self, Admin, Developer
      const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER];
      if (!allowedRoles.includes(targetUser.role)) {
        throw new ForbiddenError(
          `Super Admin cannot assign engineering work to users with role: ${targetUser.role}`
        );
      }
      return;
    }

    if (actor.role === UserRole.ADMIN) {
      // Admin can assign to self or Developer. CANNOT assign to another Admin.
      if (targetUser.id === actor.id) {
        return; // Self assignment is allowed
      }
      if (targetUser.role === UserRole.DEVELOPER) {
        return; // Developer assignment is allowed
      }
      if (targetUser.role === UserRole.ADMIN) {
        throw new ForbiddenError('Admins are not permitted to assign work to other Admins.');
      }
      throw new ForbiddenError(
        `Admin cannot assign engineering work to users with role: ${targetUser.role}`
      );
    }

    // Developer and Tester cannot assign engineering work
    throw new ForbiddenError('You do not have permission to assign engineering work.');
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateWorkItemDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<WorkItemEntity> {
    this.validateAssignmentPermission(actor, dto.assignedTo);

    const now = new Date().toISOString();
    const workItem: WorkItemEntity = {
      id: uuidv4(),
      title: dto.title,
      description: dto.description,
      priority: dto.priority || 'MEDIUM',
      status: 'ASSIGNED',
      assigned_to: dto.assignedTo,
      assigned_by: actor.id,
      created_at: now,
      updated_at: now,
    };

    this.store.workItems.set(workItem.id, workItem);

    // Record assignment
    const assignment: WorkAssignmentEntity = {
      id: uuidv4(),
      work_id: workItem.id,
      assigned_to: dto.assignedTo,
      assigned_by: actor.id,
      assigned_at: now,
    };
    this.store.workAssignments.set(assignment.id, assignment);

    // Record initial status history
    const history: WorkStatusHistoryEntity = {
      id: uuidv4(),
      work_id: workItem.id,
      from_status: null,
      to_status: 'ASSIGNED',
      changed_by: actor.id,
      notes: 'Initial assignment upon creation',
      created_at: now,
    };
    this.store.workStatusHistory.set(history.id, history);

    // Audit logs
    await this.auditService.record({
      eventType: 'WORK_CREATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CREATE_WORK_ITEM',
      resourceType: 'WORK_ITEM',
      resourceId: workItem.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { title: workItem.title, assignedTo: dto.assignedTo },
    });

    await this.auditService.record({
      eventType: 'WORK_ASSIGNED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'ASSIGN_WORK_ITEM',
      resourceType: 'WORK_ITEM',
      resourceId: workItem.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { assignedTo: dto.assignedTo, assignedBy: actor.id },
    });

    // Notify assignee
    if (dto.assignedTo !== actor.id) {
      await this.notificationService.notify(
        dto.assignedTo,
        'New Work Assignment',
        `You have been assigned work item: ${workItem.title}`,
        'WORK_ASSIGNED',
        { workId: workItem.id }
      );
    }

    return workItem;
  }

  async list(
    actor: AuthenticatedUser,
    query: PaginationQuery & { status?: WorkStatus; assignedTo?: string; search?: string }
  ): Promise<PaginatedResult<WorkItemEntity>> {
    let items = Array.from(this.store.workItems.values());

    // Role visibility: Developers only see their own assigned work
    if (actor.role === UserRole.DEVELOPER) {
      items = items.filter((item) => item.assigned_to === actor.id);
    } else if (actor.role === UserRole.TESTER) {
      // Testers do not have engineering work access
      throw new ForbiddenError('Testers do not have access to engineering work items.');
    }

    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }
    if (query.assignedTo) {
      items = items.filter((item) => item.assigned_to === query.assignedTo);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(s) ||
          item.description.toLowerCase().includes(s)
      );
    }

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

  async getById(actor: AuthenticatedUser, id: string): Promise<WorkItemEntity> {
    const item = this.store.workItems.get(id);
    if (!item) {
      throw new NotFoundError('Work item not found');
    }

    if (actor.role === UserRole.DEVELOPER && item.assigned_to !== actor.id) {
      throw new ForbiddenError('You can only view your own assigned work items.');
    }
    if (actor.role === UserRole.TESTER) {
      throw new ForbiddenError('Testers do not have access to engineering work items.');
    }

    return item;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateWorkItemDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<WorkItemEntity> {
    const item = await this.getById(actor, id);

    if (dto.title) item.title = dto.title;
    if (dto.description) item.description = dto.description;
    if (dto.priority) item.priority = dto.priority;
    item.updated_at = new Date().toISOString();

    await this.auditService.record({
      eventType: 'WORK_UPDATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE_WORK_ITEM',
      resourceType: 'WORK_ITEM',
      resourceId: item.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { updatedFields: Object.keys(dto) },
    });

    return item;
  }

  async assign(
    actor: AuthenticatedUser,
    id: string,
    dto: AssignWorkDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<WorkItemEntity> {
    this.validateAssignmentPermission(actor, dto.assignedTo);

    const item = this.store.workItems.get(id);
    if (!item) {
      throw new NotFoundError('Work item not found');
    }

    const previousAssignee = item.assigned_to;
    const previousStatus = item.status;
    const now = new Date().toISOString();

    item.assigned_to = dto.assignedTo;
    item.assigned_by = actor.id;
    item.status = 'ASSIGNED';
    item.updated_at = now;

    // Record assignment
    const assignment: WorkAssignmentEntity = {
      id: uuidv4(),
      work_id: item.id,
      assigned_to: dto.assignedTo,
      assigned_by: actor.id,
      assigned_at: now,
    };
    this.store.workAssignments.set(assignment.id, assignment);

    // Record status history
    const history: WorkStatusHistoryEntity = {
      id: uuidv4(),
      work_id: item.id,
      from_status: previousStatus,
      to_status: 'ASSIGNED',
      changed_by: actor.id,
      notes: dto.notes || `Reassigned from ${previousAssignee} to ${dto.assignedTo}`,
      created_at: now,
    };
    this.store.workStatusHistory.set(history.id, history);

    await this.auditService.record({
      eventType: 'WORK_ASSIGNED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'REASSIGN_WORK_ITEM',
      resourceType: 'WORK_ITEM',
      resourceId: item.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: {
        fromAssignee: previousAssignee,
        toAssignee: dto.assignedTo,
        notes: dto.notes,
      },
    });

    if (dto.assignedTo !== actor.id) {
      await this.notificationService.notify(
        dto.assignedTo,
        'Work Assignment',
        `You have been assigned work item: ${item.title}`,
        'WORK_ASSIGNED',
        { workId: item.id }
      );
    }

    return item;
  }

  async transitionStatus(
    actor: AuthenticatedUser,
    id: string,
    targetStatus: WorkStatus,
    notes?: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<WorkItemEntity> {
    const item = await this.getById(actor, id);
    const currentStatus = item.status;

    // Validate authorized transition
    const validTransitions: Record<WorkStatus, WorkStatus[]> = {
      ASSIGNED: ['ACCEPTED'],
      ACCEPTED: ['IN_PROGRESS'],
      IN_PROGRESS: ['DOCUMENTATION_SUBMITTED'],
      DOCUMENTATION_SUBMITTED: ['APPROVED', 'CHANGES_REQUESTED'],
      CHANGES_REQUESTED: ['IN_PROGRESS', 'DOCUMENTATION_SUBMITTED'],
      APPROVED: ['COMPLETED'],
      COMPLETED: [],
    };

    const allowedNextStatuses = validTransitions[currentStatus] || [];
    if (!allowedNextStatuses.includes(targetStatus)) {
      throw new ConflictError(
        `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed: [${allowedNextStatuses.join(', ')}]`
      );
    }

    // Role permissions for state transitions
    if (targetStatus === 'ACCEPTED' || targetStatus === 'IN_PROGRESS') {
      if (item.assigned_to !== actor.id && actor.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenError('Only the assigned developer can accept or start this work.');
      }
    } else if (targetStatus === 'DOCUMENTATION_SUBMITTED') {
      if (item.assigned_to !== actor.id && actor.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenError('Only the assigned developer can submit documentation for this work.');
      }
    } else if (targetStatus === 'APPROVED' || targetStatus === 'CHANGES_REQUESTED') {
      if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only Admins and Super Admins can review, approve, or request changes on work.');
      }
    } else if (targetStatus === 'COMPLETED') {
      if (currentStatus !== 'APPROVED') {
        throw new ConflictError('Work item must be APPROVED before it can be marked COMPLETED.');
      }
      if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN && item.assigned_to !== actor.id) {
        throw new ForbiddenError('You do not have permission to complete this work item.');
      }
    }

    const now = new Date().toISOString();
    item.status = targetStatus;
    item.updated_at = now;

    // Record status history
    const history: WorkStatusHistoryEntity = {
      id: uuidv4(),
      work_id: item.id,
      from_status: currentStatus,
      to_status: targetStatus,
      changed_by: actor.id,
      notes: notes || `Status changed from ${currentStatus} to ${targetStatus}`,
      created_at: now,
    };
    this.store.workStatusHistory.set(history.id, history);

    await this.auditService.record({
      eventType: 'WORK_STATUS_CHANGED',
      actorId: actor.id,
      actorRole: actor.role,
      action: `TRANSITION_TO_${targetStatus}`,
      resourceType: 'WORK_ITEM',
      resourceId: item.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { fromStatus: currentStatus, toStatus: targetStatus, notes },
    });

    // Notify assignee if admin made the change
    if (item.assigned_to !== actor.id) {
      await this.notificationService.notify(
        item.assigned_to,
        `Work Item Status: ${targetStatus}`,
        `Work item "${item.title}" status changed to ${targetStatus}.`,
        'WORK_STATUS_CHANGED',
        { workId: item.id, status: targetStatus }
      );
    }

    return item;
  }

  async getHistory(actor: AuthenticatedUser, id: string): Promise<WorkStatusHistoryEntity[]> {
    await this.getById(actor, id); // check visibility
    const history = Array.from(this.store.workStatusHistory.values()).filter(
      (h) => h.work_id === id
    );
    history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return history;
  }
}
