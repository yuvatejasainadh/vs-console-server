import { v4 as uuidv4 } from 'uuid';
import {
  DataStore,
  DeveloperDocumentEntity,
  DeveloperDocumentVersionEntity,
  DeveloperDocumentReviewEntity,
} from '../database/data-store';
import { UserRole } from '../roles/roles.enum';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { WorkService } from '../work/work.service';
import { AuthenticatedUser } from '../common/types';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../common/errors';
import {
  CreateDocumentationDto,
  UpdateDocumentationDto,
  ReviewDocumentationDto,
} from './documentation.dto';

export class DocumentationService {
  private static instance: DocumentationService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();
  private notificationService = NotificationService.getInstance();
  private workService = WorkService.getInstance();

  private constructor() {}

  static getInstance(): DocumentationService {
    if (!DocumentationService.instance) {
      DocumentationService.instance = new DocumentationService();
    }
    return DocumentationService.instance;
  }

  async getByWorkId(actor: AuthenticatedUser, workId: string): Promise<DeveloperDocumentEntity> {
    const workItem = await this.workService.getById(actor, workId);

    const doc = Array.from(this.store.developerDocuments.values()).find(
      (d) => d.work_id === workItem.id
    );

    if (!doc) {
      throw new NotFoundError('No documentation found for this work item');
    }

    return doc;
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<DeveloperDocumentEntity> {
    const doc = this.store.developerDocuments.get(id);
    if (!doc) {
      throw new NotFoundError('Documentation not found');
    }

    const workItem = await this.workService.getById(actor, doc.work_id);
    if (actor.role === UserRole.DEVELOPER && workItem.assigned_to !== actor.id) {
      throw new ForbiddenError('You can only view documentation for your assigned work.');
    }

    return doc;
  }

  async create(
    actor: AuthenticatedUser,
    workId: string,
    dto: CreateDocumentationDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<DeveloperDocumentEntity> {
    const workItem = await this.workService.getById(actor, workId);

    if (actor.role === UserRole.DEVELOPER && workItem.assigned_to !== actor.id) {
      throw new ForbiddenError('You can only create documentation for your assigned work.');
    }

    // Check if doc already exists for this work item
    const existing = Array.from(this.store.developerDocuments.values()).find(
      (d) => d.work_id === workId
    );
    if (existing) {
      throw new ConflictError('Documentation already exists for this work item. Use update instead.');
    }

    const now = new Date().toISOString();
    const doc: DeveloperDocumentEntity = {
      id: uuidv4(),
      work_id: workId,
      author_id: actor.id,
      what_i_did: dto.what_i_did,
      why_i_did_it: dto.why_i_did_it,
      changes_made: dto.changes_made,
      files_affected: dto.files_affected,
      problems_encountered: dto.problems_encountered,
      solution: dto.solution,
      testing_performed: dto.testing_performed,
      result: dto.result,
      next_steps: dto.next_steps,
      references: dto.references,
      status: 'DRAFT',
      version: 1,
      created_at: now,
      updated_at: now,
    };

    this.store.developerDocuments.set(doc.id, doc);

    await this.auditService.record({
      eventType: 'DOCUMENTATION_CREATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CREATE_DOCUMENTATION',
      resourceType: 'DOCUMENTATION',
      resourceId: doc.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { workId, version: 1 },
    });

    return doc;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateDocumentationDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<DeveloperDocumentEntity> {
    const doc = await this.getById(actor, id);
    const workItem = await this.workService.getById(actor, doc.work_id);

    if (actor.role === UserRole.DEVELOPER && workItem.assigned_to !== actor.id) {
      throw new ForbiddenError('You can only modify documentation for your assigned work.');
    }

    if (doc.status === 'APPROVED') {
      throw new BadRequestError('Approved documentation cannot be modified. Request a status change if needed.');
    }

    if (dto.what_i_did !== undefined) doc.what_i_did = dto.what_i_did;
    if (dto.why_i_did_it !== undefined) doc.why_i_did_it = dto.why_i_did_it;
    if (dto.changes_made !== undefined) doc.changes_made = dto.changes_made;
    if (dto.files_affected !== undefined) doc.files_affected = dto.files_affected;
    if (dto.problems_encountered !== undefined) doc.problems_encountered = dto.problems_encountered;
    if (dto.solution !== undefined) doc.solution = dto.solution;
    if (dto.testing_performed !== undefined) doc.testing_performed = dto.testing_performed;
    if (dto.result !== undefined) doc.result = dto.result;
    if (dto.next_steps !== undefined) doc.next_steps = dto.next_steps;
    if (dto.references !== undefined) doc.references = dto.references;

    doc.updated_at = new Date().toISOString();

    await this.auditService.record({
      eventType: 'DOCUMENTATION_UPDATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE_DOCUMENTATION',
      resourceType: 'DOCUMENTATION',
      resourceId: doc.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return doc;
  }

  async submit(
    actor: AuthenticatedUser,
    id: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<DeveloperDocumentEntity> {
    const doc = await this.getById(actor, id);
    const workItem = await this.workService.getById(actor, doc.work_id);

    if (actor.role === UserRole.DEVELOPER && workItem.assigned_to !== actor.id) {
      throw new ForbiddenError('You can only submit documentation for your assigned work.');
    }

    const now = new Date().toISOString();
    doc.status = 'SUBMITTED';
    doc.updated_at = now;

    // Snapshot version into versions table
    const versionEntity: DeveloperDocumentVersionEntity = {
      id: uuidv4(),
      document_id: doc.id,
      version_number: doc.version,
      author_id: actor.id,
      submitted_at: now,
      content_snapshot: {
        what_i_did: doc.what_i_did,
        why_i_did_it: doc.why_i_did_it,
        changes_made: doc.changes_made,
        files_affected: doc.files_affected,
        problems_encountered: doc.problems_encountered,
        solution: doc.solution,
        testing_performed: doc.testing_performed,
        result: doc.result,
        next_steps: doc.next_steps,
        references: doc.references,
      },
      review_status: 'SUBMITTED',
      created_at: now,
    };
    this.store.developerDocumentVersions.set(versionEntity.id, versionEntity);

    // Update work item status to DOCUMENTATION_SUBMITTED if allowed
    try {
      if (workItem.status === 'IN_PROGRESS' || workItem.status === 'CHANGES_REQUESTED') {
        await this.workService.transitionStatus(
          actor,
          workItem.id,
          'DOCUMENTATION_SUBMITTED',
          `Submitted documentation version ${doc.version}`,
          meta
        );
      }
    } catch {
      // Work item state already progressed or synced
    }

    await this.auditService.record({
      eventType: 'DOCUMENTATION_SUBMITTED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'SUBMIT_DOCUMENTATION',
      resourceType: 'DOCUMENTATION',
      resourceId: doc.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { workId: doc.work_id, version: doc.version },
    });

    return doc;
  }

  async review(
    actor: AuthenticatedUser,
    id: string,
    dto: ReviewDocumentationDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<DeveloperDocumentEntity> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only Admins and Super Admins can review developer documentation.');
    }

    const doc = await this.getById(actor, id);
    const now = new Date().toISOString();

    const reviewStatus: 'APPROVED' | 'CHANGES_REQUESTED' | 'FEEDBACK' =
      dto.action === 'APPROVE'
        ? 'APPROVED'
        : dto.action === 'REQUEST_CHANGES'
        ? 'CHANGES_REQUESTED'
        : 'FEEDBACK';

    // Record review
    const reviewRecord: DeveloperDocumentReviewEntity = {
      id: uuidv4(),
      document_id: doc.id,
      version_number: doc.version,
      reviewer_id: actor.id,
      status: reviewStatus,
      feedback: dto.feedback,
      created_at: now,
    };
    this.store.developerDocumentReviews.set(reviewRecord.id, reviewRecord);

    // Update latest version record with feedback
    const latestVersion = Array.from(this.store.developerDocumentVersions.values())
      .filter((v) => v.document_id === doc.id)
      .sort((a, b) => b.version_number - a.version_number)[0];

    if (latestVersion) {
      latestVersion.reviewer_id = actor.id;
      latestVersion.feedback = dto.feedback;
    }

    if (dto.action === 'APPROVE') {
      doc.status = 'APPROVED';
      if (latestVersion) latestVersion.review_status = 'APPROVED';

      await this.workService.transitionStatus(
        actor,
        doc.work_id,
        'APPROVED',
        `Documentation approved: ${dto.feedback}`,
        meta
      );

      await this.auditService.record({
        eventType: 'DOCUMENTATION_APPROVED',
        actorId: actor.id,
        actorRole: actor.role,
        action: 'APPROVE_DOCUMENTATION',
        resourceType: 'DOCUMENTATION',
        resourceId: doc.id,
        requestId: meta?.requestId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { feedback: dto.feedback, version: doc.version },
      });

      await this.notificationService.notify(
        doc.author_id,
        'Documentation Approved',
        `Your documentation for work item was approved: ${dto.feedback}`,
        'DOCUMENTATION_APPROVED',
        { documentId: doc.id, workId: doc.work_id }
      );
    } else if (dto.action === 'REQUEST_CHANGES') {
      doc.status = 'CHANGES_REQUESTED';
      doc.version += 1; // prepare next version
      if (latestVersion) latestVersion.review_status = 'CHANGES_REQUESTED';

      await this.workService.transitionStatus(
        actor,
        doc.work_id,
        'CHANGES_REQUESTED',
        `Changes requested: ${dto.feedback}`,
        meta
      );

      await this.auditService.record({
        eventType: 'DOCUMENTATION_CHANGES_REQUESTED',
        actorId: actor.id,
        actorRole: actor.role,
        action: 'REQUEST_CHANGES_DOCUMENTATION',
        resourceType: 'DOCUMENTATION',
        resourceId: doc.id,
        requestId: meta?.requestId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { feedback: dto.feedback, nextVersion: doc.version },
      });

      await this.notificationService.notify(
        doc.author_id,
        'Documentation Changes Requested',
        `Reviewer requested changes: ${dto.feedback}`,
        'DOCUMENTATION_CHANGES_REQUESTED',
        { documentId: doc.id, workId: doc.work_id }
      );
    } else {
      // General feedback
      await this.auditService.record({
        eventType: 'DOCUMENTATION_REVIEWED',
        actorId: actor.id,
        actorRole: actor.role,
        action: 'FEEDBACK_DOCUMENTATION',
        resourceType: 'DOCUMENTATION',
        resourceId: doc.id,
        requestId: meta?.requestId,
        metadata: { feedback: dto.feedback },
      });

      await this.notificationService.notify(
        doc.author_id,
        'Documentation Feedback',
        `Reviewer added feedback: ${dto.feedback}`,
        'DOCUMENTATION_FEEDBACK',
        { documentId: doc.id, workId: doc.work_id }
      );
    }

    doc.updated_at = now;
    return doc;
  }

  async getHistory(
    actor: AuthenticatedUser,
    id: string
  ): Promise<{ versions: DeveloperDocumentVersionEntity[]; reviews: DeveloperDocumentReviewEntity[] }> {
    const doc = await this.getById(actor, id);

    const versions = Array.from(this.store.developerDocumentVersions.values())
      .filter((v) => v.document_id === doc.id)
      .sort((a, b) => b.version_number - a.version_number);

    const reviews = Array.from(this.store.developerDocumentReviews.values())
      .filter((r) => r.document_id === doc.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { versions, reviews };
  }
}
