import { v4 as uuidv4 } from 'uuid';
import { DataStore, DatabaseUserEntity } from '../data-store';
import { AuthenticatedUser } from '../../common/types';
import { BadRequestError, NotFoundError } from '../../common/errors';
import { AuditService } from '../../audit/audit.service';

export interface CreateDbUserDto {
  username: string;
  role: string;
  password?: string;
}

export class DatabaseUserService {
  private static instance: DatabaseUserService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();

  private constructor() {
    this.seedDefaultDbUsers();
  }

  static getInstance(): DatabaseUserService {
    if (!DatabaseUserService.instance) {
      DatabaseUserService.instance = new DatabaseUserService();
    }
    return DatabaseUserService.instance;
  }

  private seedDefaultDbUsers(): void {
    if (this.store.databaseUsers.size === 0) {
      const users: DatabaseUserEntity[] = [
        {
          id: uuidv4(),
          username: 'voiceshield_admin',
          role: 'rds_superuser',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          username: 'voiceshield_app',
          role: 'readwrite',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          username: 'voiceshield_readonly',
          role: 'readonly',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      users.forEach((u) => this.store.databaseUsers.set(u.id, u));
    }
  }

  async list(actor: AuthenticatedUser): Promise<DatabaseUserEntity[]> {
    return Array.from(this.store.databaseUsers.values());
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateDbUserDto,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<DatabaseUserEntity> {
    if (!dto.username || dto.username.length < 3) {
      throw new BadRequestError('Valid database username is required');
    }

    const exists = Array.from(this.store.databaseUsers.values()).find(
      (u) => u.username.toLowerCase() === dto.username.toLowerCase()
    );
    if (exists) {
      throw new BadRequestError('Database user with this name already exists');
    }

    const now = new Date().toISOString();
    const dbUser: DatabaseUserEntity = {
      id: uuidv4(),
      username: dto.username.replace(/[^a-zA-Z0-9_]/g, ''),
      role: dto.role || 'readonly',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };

    this.store.databaseUsers.set(dbUser.id, dbUser);

    await this.auditService.record({
      eventType: 'DATABASE_ACCESSED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CREATE_DATABASE_USER',
      resourceType: 'DATABASE_USER',
      resourceId: dbUser.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { username: dbUser.username, role: dbUser.role },
    });

    return dbUser;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: { role?: string; status?: 'ACTIVE' | 'DISABLED' },
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<DatabaseUserEntity> {
    const user = this.store.databaseUsers.get(id);
    if (!user) throw new NotFoundError('Database user not found');

    if (dto.role) user.role = dto.role;
    if (dto.status) user.status = dto.status;
    user.updated_at = new Date().toISOString();

    await this.auditService.record({
      eventType: 'DATABASE_ACCESSED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE_DATABASE_USER',
      resourceType: 'DATABASE_USER',
      resourceId: user.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { username: user.username, ...dto },
    });

    return user;
  }

  async disable(
    actor: AuthenticatedUser,
    id: string,
    meta?: { requestId?: string; ipAddress?: string; userAgent?: string }
  ): Promise<DatabaseUserEntity> {
    const user = this.store.databaseUsers.get(id);
    if (!user) throw new NotFoundError('Database user not found');

    user.status = 'DISABLED';
    user.updated_at = new Date().toISOString();

    await this.auditService.record({
      eventType: 'DATABASE_ACCESSED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DISABLE_DATABASE_USER',
      resourceType: 'DATABASE_USER',
      resourceId: user.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { username: user.username },
    });

    return user;
  }
}
