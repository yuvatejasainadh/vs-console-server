import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { DataStore, UserEntity } from '../database/data-store';
import { UserRole } from '../roles/roles.enum';
import { PASSWORD_SALT_ROUNDS } from '../config/constants';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser, PaginatedResult, PaginationQuery } from '../common/types';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../common/errors';
import { CreateUserDto, UpdateUserDto } from './user.dto';

export type SafeUser = Omit<UserEntity, 'password_hash'>;

export class UserService {
  private static instance: UserService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  private toSafeUser(user: UserEntity): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...safe } = user;
    return safe;
  }

  async list(
    actor: AuthenticatedUser,
    query: PaginationQuery & { role?: UserRole; status?: 'ACTIVE' | 'DISABLED'; search?: string }
  ): Promise<PaginatedResult<SafeUser>> {
    let users = Array.from(this.store.users.values());

    if (query.role) {
      users = users.filter((u) => u.role === query.role);
    }
    if (query.status) {
      users = users.filter((u) => u.status === query.status);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.display_name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s)
      );
    }

    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const total = users.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const pagedData = users.slice((page - 1) * pageSize, page * pageSize).map(this.toSafeUser);

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

  async getById(actor: AuthenticatedUser, id: string): Promise<SafeUser> {
    const user = this.store.users.get(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return this.toSafeUser(user);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateUserDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<SafeUser> {
    // Enforcement: Admin cannot create Admin or Super Admin
    if (actor.role === UserRole.ADMIN) {
      if (dto.role === UserRole.ADMIN || dto.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenError('Admins cannot create Admin or Super Admin accounts.');
      }
    } else if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('You do not have permission to create users.');
    }

    // Check duplicate email
    const existing = Array.from(this.store.users.values()).find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase()
    );
    if (existing) {
      throw new ConflictError('A user with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const now = new Date().toISOString();

    const user: UserEntity = {
      id: uuidv4(),
      email: dto.email.toLowerCase(),
      password_hash: passwordHash,
      display_name: dto.displayName,
      role: dto.role,
      status: dto.status || 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    };

    this.store.users.set(user.id, user);

    await this.auditService.record({
      eventType: 'USER_CREATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CREATE_USER',
      resourceType: 'USER',
      resourceId: user.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { email: user.email, role: user.role },
    });

    return this.toSafeUser(user);
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateUserDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<SafeUser> {
    const user = this.store.users.get(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Enforcement: Admin cannot manage Admin or Super Admin accounts
    if (actor.role === UserRole.ADMIN) {
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenError('Admins cannot modify Admin or Super Admin accounts.');
      }
      if (dto.role && (dto.role === UserRole.ADMIN || dto.role === UserRole.SUPER_ADMIN)) {
        throw new ForbiddenError('Admins cannot elevate accounts to Admin or Super Admin.');
      }
    } else if (actor.role !== UserRole.SUPER_ADMIN) {
      // Non-admins can only edit their own profile (and cannot change role/status)
      if (actor.id !== user.id) {
        throw new ForbiddenError('You do not have permission to modify this user.');
      }
      if (dto.role && dto.role !== user.role) {
        throw new ForbiddenError('You cannot change your own role.');
      }
      if (dto.status && dto.status !== user.status) {
        throw new ForbiddenError('You cannot change your own status.');
      }
    }

    if (dto.displayName) {
      user.display_name = dto.displayName;
    }
    if (dto.status) {
      user.status = dto.status;
    }
    if (dto.role && dto.role !== user.role) {
      const oldRole = user.role;
      user.role = dto.role;

      await this.auditService.record({
        eventType: 'ROLE_CHANGED',
        actorId: actor.id,
        actorRole: actor.role,
        action: 'CHANGE_USER_ROLE',
        resourceType: 'USER',
        resourceId: user.id,
        requestId: meta?.requestId,
        metadata: { fromRole: oldRole, toRole: dto.role },
      });
    }

    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    }

    user.updated_at = new Date().toISOString();

    await this.auditService.record({
      eventType: 'USER_UPDATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE_USER',
      resourceType: 'USER',
      resourceId: user.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { updatedFields: Object.keys(dto) },
    });

    return this.toSafeUser(user);
  }

  async disable(
    actor: AuthenticatedUser,
    id: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<SafeUser> {
    const user = this.store.users.get(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (actor.id === user.id) {
      throw new BadRequestError('You cannot disable your own account.');
    }

    if (actor.role === UserRole.ADMIN) {
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenError('Admins cannot disable Admin or Super Admin accounts.');
      }
    } else if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('You do not have permission to disable users.');
    }

    user.status = 'DISABLED';
    user.updated_at = new Date().toISOString();

    // Revoke all refresh tokens
    for (const token of this.store.refreshTokens.values()) {
      if (token.user_id === user.id) {
        token.revoked = true;
      }
    }

    await this.auditService.record({
      eventType: 'USER_DISABLED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DISABLE_USER',
      resourceType: 'USER',
      resourceId: user.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return this.toSafeUser(user);
  }
}
