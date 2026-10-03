import { v4 as uuidv4 } from 'uuid';
import {
  DataStore,
  TestingObjectiveEntity,
  TestSessionEntity,
  TestSubmissionEntity,
  TestReviewEntity,
  TestSubmissionStatus,
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
import {
  CreateTestingObjectiveDto,
  UpdateTestingObjectiveDto,
  AssignObjectiveDto,
  StartTestSessionDto,
  UpdateTestSessionDto,
  CreateTestSubmissionDto,
  UpdateTestSubmissionDto,
  ReviewTestSubmissionDto,
} from './testing.dto';

export class TestingService {
  private static instance: TestingService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();
  private notificationService = NotificationService.getInstance();

  private constructor() {}

  static getInstance(): TestingService {
    if (!TestingService.instance) {
      TestingService.instance = new TestingService();
    }
    return TestingService.instance;
  }

  // --- Objectives ---

  async listObjectives(
    actor: AuthenticatedUser,
    query: PaginationQuery & { status?: string; assignedTo?: string; search?: string }
  ): Promise<PaginatedResult<TestingObjectiveEntity>> {
    let objectives = Array.from(this.store.testingObjectives.values());

    // Tester only sees assigned objectives
    if (actor.role === UserRole.TESTER) {
      objectives = objectives.filter((o) => o.assigned_to === actor.id);
    }

    if (query.status) {
      objectives = objectives.filter((o) => o.status === query.status);
    }
    if (query.assignedTo) {
      objectives = objectives.filter((o) => o.assigned_to === query.assignedTo);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      objectives = objectives.filter(
        (o) =>
          o.title.toLowerCase().includes(s) ||
          o.description.toLowerCase().includes(s) ||
          o.target_area.toLowerCase().includes(s)
      );
    }

    objectives.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const total = objectives.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const pagedData = objectives.slice((page - 1) * pageSize, page * pageSize);

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

  async getObjectiveById(actor: AuthenticatedUser, id: string): Promise<TestingObjectiveEntity> {
    const objective = this.store.testingObjectives.get(id);
    if (!objective) {
      throw new NotFoundError('Testing objective not found');
    }

    if (actor.role === UserRole.TESTER && objective.assigned_to !== actor.id) {
      throw new ForbiddenError('You can only view assigned testing objectives.');
    }

    return objective;
  }

  async createObjective(
    actor: AuthenticatedUser,
    dto: CreateTestingObjectiveDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<TestingObjectiveEntity> {
    // Super Admin, Admin, and Developer can create testing objectives
    if (actor.role === UserRole.TESTER) {
      throw new ForbiddenError('Testers cannot create testing objectives.');
    }

    if (dto.assignedTo) {
      const targetUser = this.store.users.get(dto.assignedTo);
      if (!targetUser) throw new NotFoundError('Assigned user not found');
    }

    const now = new Date().toISOString();
    const objective: TestingObjectiveEntity = {
      id: uuidv4(),
      title: dto.title,
      description: dto.description,
      target_area: dto.targetArea,
      assigned_to: dto.assignedTo,
      created_by: actor.id,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };

    this.store.testingObjectives.set(objective.id, objective);

    await this.auditService.record({
      eventType: 'TEST_OBJECTIVE_CREATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CREATE_TESTING_OBJECTIVE',
      resourceType: 'TESTING_OBJECTIVE',
      resourceId: objective.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { title: objective.title, assignedTo: dto.assignedTo },
    });

    if (dto.assignedTo && dto.assignedTo !== actor.id) {
      await this.notificationService.notify(
        dto.assignedTo,
        'Testing Objective Assigned',
        `You have been assigned testing objective: ${objective.title}`,
        'TEST_ASSIGNED',
        { objectiveId: objective.id }
      );
    }

    return objective;
  }

  async updateObjective(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateTestingObjectiveDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<TestingObjectiveEntity> {
    if (actor.role === UserRole.TESTER) {
      throw new ForbiddenError('Testers cannot update testing objectives.');
    }

    const objective = await this.getObjectiveById(actor, id);

    if (dto.title) objective.title = dto.title;
    if (dto.description) objective.description = dto.description;
    if (dto.targetArea) objective.target_area = dto.targetArea;
    if (dto.status) objective.status = dto.status;
    if (dto.assignedTo !== undefined) objective.assigned_to = dto.assignedTo;
    objective.updated_at = new Date().toISOString();

    await this.auditService.record({
      eventType: 'TEST_OBJECTIVE_UPDATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE_TESTING_OBJECTIVE',
      resourceType: 'TESTING_OBJECTIVE',
      resourceId: objective.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { updatedFields: Object.keys(dto) },
    });

    return objective;
  }

  async assignObjective(
    actor: AuthenticatedUser,
    id: string,
    dto: AssignObjectiveDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<TestingObjectiveEntity> {
    if (actor.role === UserRole.TESTER) {
      throw new ForbiddenError('Testers cannot assign testing objectives.');
    }

    const objective = await this.getObjectiveById(actor, id);
    const targetUser = this.store.users.get(dto.assignedTo);
    if (!targetUser) throw new NotFoundError('Target tester not found');

    objective.assigned_to = dto.assignedTo;
    objective.updated_at = new Date().toISOString();

    await this.auditService.record({
      eventType: 'TEST_ASSIGNED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'ASSIGN_TESTING_OBJECTIVE',
      resourceType: 'TESTING_OBJECTIVE',
      resourceId: objective.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { assignedTo: dto.assignedTo },
    });

    await this.notificationService.notify(
      dto.assignedTo,
      'Testing Objective Assigned',
      `You have been assigned testing objective: ${objective.title}`,
      'TEST_ASSIGNED',
      { objectiveId: objective.id }
    );

    return objective;
  }

  // --- Quick Test Sessions ---

  async startSession(
    actor: AuthenticatedUser,
    dto: StartTestSessionDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<TestSessionEntity> {
    const objective = this.store.testingObjectives.get(dto.objectiveId);
    if (!objective) throw new NotFoundError('Testing objective not found');

    const device = this.store.devices.get(dto.deviceId);
    if (!device) throw new NotFoundError('Device not found');
    if (device.status === 'INACTIVE') {
      throw new BadRequestError('Cannot start a test session on an inactive device');
    }

    const now = new Date().toISOString();
    const testId = `TEST-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const session: TestSessionEntity = {
      id: uuidv4(),
      test_id: testId,
      objective_id: dto.objectiveId,
      tester_id: actor.id,
      device_id: dto.deviceId,
      app_version: dto.appVersion,
      android_version: dto.androidVersion,
      started_at: now,
      status: 'IN_PROGRESS',
      created_at: now,
      updated_at: now,
    };

    this.store.testSessions.set(session.id, session);

    await this.auditService.record({
      eventType: 'TEST_STARTED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'START_TEST_SESSION',
      resourceType: 'TEST_SESSION',
      resourceId: session.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { testId, objectiveId: dto.objectiveId, deviceId: dto.deviceId },
    });

    return session;
  }

  async getSessionById(actor: AuthenticatedUser, id: string): Promise<TestSessionEntity> {
    const session = this.store.testSessions.get(id);
    if (!session) throw new NotFoundError('Test session not found');

    if (actor.role === UserRole.TESTER && session.tester_id !== actor.id) {
      throw new ForbiddenError('You can only view your own test sessions.');
    }

    return session;
  }

  async updateSession(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateTestSessionDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<TestSessionEntity> {
    const session = await this.getSessionById(actor, id);

    if (actor.role === UserRole.TESTER && session.tester_id !== actor.id) {
      throw new ForbiddenError('You can only update your own test sessions.');
    }

    if (dto.status) session.status = dto.status;
    if (dto.endedAt) session.ended_at = dto.endedAt;
    session.updated_at = new Date().toISOString();

    await this.auditService.record({
      eventType: 'TEST_SESSION_UPDATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE_TEST_SESSION',
      resourceType: 'TEST_SESSION',
      resourceId: session.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { status: session.status },
    });

    return session;
  }

  // --- Submissions & Review ---

  async createSubmission(
    actor: AuthenticatedUser,
    dto: CreateTestSubmissionDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<TestSubmissionEntity> {
    const session = await this.getSessionById(actor, dto.sessionId);

    if (actor.role === UserRole.TESTER && session.tester_id !== actor.id) {
      throw new ForbiddenError('You can only submit tests for your own sessions.');
    }

    const now = new Date().toISOString();
    session.status = 'COMPLETED';
    session.ended_at = session.ended_at || now;
    session.updated_at = now;

    const submission: TestSubmissionEntity = {
      id: uuidv4(),
      session_id: session.id,
      objective_id: session.objective_id,
      tester_id: actor.id,
      device_id: session.device_id,
      scenario_name: dto.scenarioName,
      description: dto.description,
      expected_result: dto.expectedResult,
      actual_result: dto.actualResult,
      outcome: dto.outcome,
      tester_notes: dto.testerNotes,
      status: 'SUBMITTED',
      created_at: now,
      updated_at: now,
    };

    this.store.testSubmissions.set(submission.id, submission);

    await this.auditService.record({
      eventType: 'TEST_SUBMITTED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'SUBMIT_TEST_RESULT',
      resourceType: 'TEST_SUBMISSION',
      resourceId: submission.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { outcome: dto.outcome, scenarioName: dto.scenarioName },
    });

    // Notify Admins
    for (const u of this.store.users.values()) {
      if (u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN) {
        await this.notificationService.notify(
          u.id,
          'New Test Submission',
          `Tester submitted test results for: ${dto.scenarioName} [${dto.outcome}]`,
          'TEST_SUBMITTED',
          { submissionId: submission.id }
        );
      }
    }

    return submission;
  }

  async listSubmissions(
    actor: AuthenticatedUser,
    query: PaginationQuery & { status?: TestSubmissionStatus; outcome?: string; search?: string }
  ): Promise<PaginatedResult<TestSubmissionEntity>> {
    let submissions = Array.from(this.store.testSubmissions.values());

    // Tester only sees their own submissions
    if (actor.role === UserRole.TESTER) {
      submissions = submissions.filter((s) => s.tester_id === actor.id);
    }

    if (query.status) {
      submissions = submissions.filter((s) => s.status === query.status);
    }
    if (query.outcome) {
      submissions = submissions.filter((s) => s.outcome === query.outcome);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      submissions = submissions.filter(
        (sub) =>
          sub.scenario_name.toLowerCase().includes(s) ||
          sub.description.toLowerCase().includes(s) ||
          sub.actual_result.toLowerCase().includes(s)
      );
    }

    submissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const total = submissions.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const pagedData = submissions.slice((page - 1) * pageSize, page * pageSize);

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

  async getSubmissionById(actor: AuthenticatedUser, id: string): Promise<TestSubmissionEntity> {
    const submission = this.store.testSubmissions.get(id);
    if (!submission) {
      throw new NotFoundError('Test submission not found');
    }

    if (actor.role === UserRole.TESTER && submission.tester_id !== actor.id) {
      throw new ForbiddenError('You can only view your own test submissions.');
    }

    return submission;
  }

  async updateSubmission(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateTestSubmissionDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<TestSubmissionEntity> {
    const submission = await this.getSubmissionById(actor, id);

    // Admin / Super Admin can edit/correct information on submission, or tester can edit before review
    if (actor.role === UserRole.TESTER && submission.tester_id !== actor.id) {
      throw new ForbiddenError('You can only update your own test submissions.');
    }

    if (dto.scenarioName) submission.scenario_name = dto.scenarioName;
    if (dto.description) submission.description = dto.description;
    if (dto.expectedResult) submission.expected_result = dto.expectedResult;
    if (dto.actualResult) submission.actual_result = dto.actualResult;
    if (dto.outcome) submission.outcome = dto.outcome;
    if (dto.testerNotes !== undefined) submission.tester_notes = dto.testerNotes;
    submission.updated_at = new Date().toISOString();

    await this.auditService.record({
      eventType: 'TEST_UPDATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE_TEST_SUBMISSION',
      resourceType: 'TEST_SUBMISSION',
      resourceId: submission.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { updatedFields: Object.keys(dto) },
    });

    return submission;
  }

  async reviewSubmission(
    actor: AuthenticatedUser,
    id: string,
    dto: ReviewTestSubmissionDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<TestSubmissionEntity> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only Admins and Super Admins can review test submissions.');
    }

    const submission = await this.getSubmissionById(actor, id);
    const now = new Date().toISOString();

    const review: TestReviewEntity = {
      id: uuidv4(),
      submission_id: submission.id,
      reviewer_id: actor.id,
      action: dto.action,
      feedback: dto.feedback,
      created_at: now,
    };
    this.store.testReviews.set(review.id, review);

    submission.reviewer_id = actor.id;
    submission.review_feedback = dto.feedback;
    submission.reviewed_at = now;
    submission.updated_at = now;

    let eventType = 'TEST_REVIEWED';

    if (dto.action === 'APPROVE') {
      submission.status = 'APPROVED';
      eventType = 'TEST_APPROVED';
    } else if (dto.action === 'REJECT') {
      submission.status = 'CLOSED';
      eventType = 'TEST_REJECTED';
    } else if (dto.action === 'REQUEST_RETEST') {
      submission.status = 'RETEST_REQUIRED';
      eventType = 'TEST_RETEST_REQUESTED';
    } else {
      submission.status = 'UNDER_REVIEW';
    }

    await this.auditService.record({
      eventType,
      actorId: actor.id,
      actorRole: actor.role,
      action: `REVIEW_${dto.action}`,
      resourceType: 'TEST_SUBMISSION',
      resourceId: submission.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { action: dto.action, feedback: dto.feedback },
    });

    await this.notificationService.notify(
      submission.tester_id,
      `Test Submission Reviewed: ${submission.status}`,
      `Your test submission "${submission.scenario_name}" was reviewed: ${dto.feedback}`,
      'TEST_REVIEWED',
      { submissionId: submission.id, status: submission.status }
    );

    return submission;
  }
}
