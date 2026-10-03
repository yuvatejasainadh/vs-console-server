import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { ALLOWED_FILE_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../config/constants';
import { DataStore, EvidenceFileEntity, EvidenceType } from '../database/data-store';
import { UserRole } from '../roles/roles.enum';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../common/errors';

export class FileService {
  private static instance: FileService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();
  private localStoragePath: string;

  private constructor() {
    this.localStoragePath = path.resolve(process.cwd(), config.localStorageDir);
    if (!fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
    }
  }

  static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  inferEvidenceType(mimeType: string): EvidenceType {
    if (mimeType.startsWith('image/')) return 'SCREENSHOT';
    if (mimeType.startsWith('video/')) return 'SCREEN_RECORDING';
    if (mimeType === 'text/plain' || mimeType === 'text/csv' || mimeType.includes('log')) {
      return 'LOG_FILE';
    }
    return 'OTHER';
  }

  async uploadEvidenceFile(
    actor: AuthenticatedUser,
    submissionId: string,
    file: Express.Multer.File,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<EvidenceFileEntity> {
    if (!file) {
      throw new BadRequestError('No file uploaded');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError(`File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
    }

    if (!ALLOWED_FILE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestError(`File MIME type ${file.mimetype} is not allowed`);
    }

    const submission = this.store.testSubmissions.get(submissionId);
    if (!submission) {
      throw new NotFoundError('Test submission not found');
    }

    if (actor.role === UserRole.TESTER && submission.tester_id !== actor.id) {
      throw new ForbiddenError('You can only attach evidence to your own test submissions.');
    }

    // Generate safe storage key
    const fileExt = path.extname(file.originalname).slice(0, 10);
    const storageKey = `evidence/${submissionId}/${uuidv4()}${fileExt}`;
    const targetFilePath = path.join(this.localStoragePath, storageKey);

    const targetDir = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Save buffer or copy file to target
    if (file.buffer) {
      fs.writeFileSync(targetFilePath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, targetFilePath);
    }

    const evidenceType = this.inferEvidenceType(file.mimetype);
    const now = new Date().toISOString();

    const entity: EvidenceFileEntity = {
      id: uuidv4(),
      submission_id: submissionId,
      filename: path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_'),
      mime_type: file.mimetype,
      size: file.size,
      storage_key: storageKey,
      evidence_type: evidenceType,
      uploaded_by: actor.id,
      created_at: now,
    };

    this.store.evidenceFiles.set(entity.id, entity);

    await this.auditService.record({
      eventType: 'EVIDENCE_UPLOADED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPLOAD_EVIDENCE_FILE',
      resourceType: 'EVIDENCE_FILE',
      resourceId: entity.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: {
        submissionId,
        filename: entity.filename,
        size: entity.size,
        evidenceType: entity.evidence_type,
      },
    });

    return entity;
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<EvidenceFileEntity> {
    const file = this.store.evidenceFiles.get(id);
    if (!file) {
      throw new NotFoundError('Evidence file not found');
    }

    if (actor.role === UserRole.TESTER) {
      const submission = this.store.testSubmissions.get(file.submission_id);
      if (submission && submission.tester_id !== actor.id) {
        throw new ForbiddenError('You can only view evidence from your own tests.');
      }
    }

    return file;
  }

  async getFileStream(
    actor: AuthenticatedUser,
    id: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<{ stream: fs.ReadStream; file: EvidenceFileEntity }> {
    const file = await this.getById(actor, id);
    const fullPath = path.join(this.localStoragePath, file.storage_key);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Underlying storage file not found');
    }

    await this.auditService.record({
      eventType: 'EVIDENCE_ACCESSED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DOWNLOAD_EVIDENCE_FILE',
      resourceType: 'EVIDENCE_FILE',
      resourceId: file.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { filename: file.filename },
    });

    return {
      stream: fs.createReadStream(fullPath),
      file,
    };
  }

  async listForSubmission(
    actor: AuthenticatedUser,
    submissionId: string
  ): Promise<EvidenceFileEntity[]> {
    const submission = this.store.testSubmissions.get(submissionId);
    if (!submission) throw new NotFoundError('Submission not found');

    if (actor.role === UserRole.TESTER && submission.tester_id !== actor.id) {
      throw new ForbiddenError('You can only view evidence for your own submissions.');
    }

    return Array.from(this.store.evidenceFiles.values()).filter(
      (f) => f.submission_id === submissionId
    );
  }
}
