import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { PASSWORD_SALT_ROUNDS, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES } from '../config/constants';
import { DataStore, UserEntity, RefreshTokenEntity } from '../database/data-store';
import { AuditService } from '../audit/audit.service';
import { UnauthorizedError, BadRequestError, ForbiddenError } from '../common/errors';
import { LoginDto, RefreshTokenDto, ChangePasswordDto } from './auth.dto';
import { AuthenticatedUser } from '../common/types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
}

export interface LoginResult {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}

export class AuthService {
  private static instance: AuthService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  generateAccessToken(user: UserEntity): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );
  }

  async generateRefreshToken(user: UserEntity): Promise<string> {
    const rawToken = uuidv4();
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const entity: RefreshTokenEntity = {
      id: uuidv4(),
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      revoked: false,
      created_at: new Date().toISOString(),
    };

    this.store.refreshTokens.set(entity.id, entity);

    // Embed the entity id in the refresh token string for lookup: `${entity.id}:${rawToken}`
    return Buffer.from(`${entity.id}:${rawToken}`).toString('base64');
  }

  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<LoginResult> {
    const user = Array.from(this.store.users.values()).find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase()
    );

    if (!user) {
      await this.auditService.record({
        eventType: 'LOGIN_FAILED',
        actorId: 'unknown',
        actorRole: 'ANONYMOUS',
        action: 'FAILED_LOGIN_UNKNOWN_USER',
        resourceType: 'AUTH',
        requestId: meta?.requestId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: { attemptedEmail: dto.email },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === 'DISABLED') {
      await this.auditService.record({
        eventType: 'LOGIN_FAILED',
        actorId: user.id,
        actorRole: user.role,
        action: 'FAILED_LOGIN_DISABLED_ACCOUNT',
        resourceType: 'AUTH',
        resourceId: user.id,
        requestId: meta?.requestId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      throw new ForbiddenError('Account is disabled. Please contact an administrator.');
    }

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new ForbiddenError(
        'Account is temporarily locked due to repeated failed logins. Try again later.'
      );
    }

    const isValidPassword = await this.comparePassword(dto.password, user.password_hash);
    if (!isValidPassword) {
      user.failed_login_attempts += 1;
      if (user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS) {
        user.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
      }
      user.updated_at = new Date().toISOString();

      await this.auditService.record({
        eventType: 'LOGIN_FAILED',
        actorId: user.id,
        actorRole: user.role,
        action: 'FAILED_LOGIN_INVALID_PASSWORD',
        resourceType: 'AUTH',
        resourceId: user.id,
        requestId: meta?.requestId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      throw new UnauthorizedError('Invalid email or password');
    }

    // Reset failed attempts upon successful login
    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.last_login_at = new Date().toISOString();
    user.updated_at = new Date().toISOString();

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    await this.auditService.record({
      eventType: 'LOGIN',
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGIN_SUCCESS',
      resourceType: 'AUTH',
      resourceId: user.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        status: user.status,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.jwtExpiresIn,
        tokenType: 'Bearer',
      },
    };
  }

  async refreshToken(
    dto: RefreshTokenDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<AuthTokens> {
    try {
      const decodedStr = Buffer.from(dto.refreshToken, 'base64').toString('utf-8');
      const [id, rawToken] = decodedStr.split(':');

      if (!id || !rawToken) {
        throw new UnauthorizedError('Invalid refresh token format');
      }

      const storedToken = this.store.refreshTokens.get(id);
      if (!storedToken || storedToken.revoked) {
        throw new UnauthorizedError('Refresh token expired or revoked');
      }

      if (new Date(storedToken.expires_at) < new Date()) {
        throw new UnauthorizedError('Refresh token expired');
      }

      const matches = await bcrypt.compare(rawToken, storedToken.token_hash);
      if (!matches) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const user = this.store.users.get(storedToken.user_id);
      if (!user || user.status !== 'ACTIVE') {
        throw new ForbiddenError('User account is invalid or disabled');
      }

      // Refresh token rotation: revoke old token
      storedToken.revoked = true;

      // Generate fresh pair
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: config.jwtExpiresIn,
        tokenType: 'Bearer',
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
        throw err;
      }
      throw new UnauthorizedError('Failed to refresh token');
    }
  }

  async logout(
    user: AuthenticatedUser,
    refreshToken?: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<void> {
    if (refreshToken) {
      try {
        const decodedStr = Buffer.from(refreshToken, 'base64').toString('utf-8');
        const [id] = decodedStr.split(':');
        const stored = this.store.refreshTokens.get(id);
        if (stored) {
          stored.revoked = true;
        }
      } catch {
        // Ignore invalid token formatting on logout
      }
    }

    // Revoke all refresh tokens for this user
    for (const token of this.store.refreshTokens.values()) {
      if (token.user_id === user.id) {
        token.revoked = true;
      }
    }

    await this.auditService.record({
      eventType: 'LOGOUT',
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGOUT',
      resourceType: 'AUTH',
      resourceId: user.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }

  async changePassword(
    user: AuthenticatedUser,
    dto: ChangePasswordDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<void> {
    const userEntity = this.store.users.get(user.id);
    if (!userEntity) {
      throw new UnauthorizedError('User not found');
    }

    const isValidPassword = await this.comparePassword(dto.currentPassword, userEntity.password_hash);
    if (!isValidPassword) {
      throw new BadRequestError('Current password does not match');
    }

    userEntity.password_hash = await this.hashPassword(dto.newPassword);
    userEntity.updated_at = new Date().toISOString();

    // Revoke previous refresh tokens
    for (const token of this.store.refreshTokens.values()) {
      if (token.user_id === user.id) {
        token.revoked = true;
      }
    }

    await this.auditService.record({
      eventType: 'USER_UPDATED',
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_CHANGE_PASSWORD',
      resourceType: 'AUTH',
      resourceId: user.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }
}
