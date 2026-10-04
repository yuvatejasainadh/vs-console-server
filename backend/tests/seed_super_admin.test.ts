import bcrypt from 'bcryptjs';
import {
  seedProductionSuperAdmin,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_ROLE,
  SUPER_ADMIN_STATUS,
  SUPER_ADMIN_DISPLAY_NAME,
  SUPER_ADMIN_PASSWORD_HASH,
} from '../scripts/seed-super-admin';
import { DataStore } from '../src/database/data-store';
import { UserService } from '../src/users/user.service';
import { UserRole } from '../src/roles/roles.enum';
import { createApp } from '../src/app';
import request from 'supertest';
import { AuthService } from '../src/auth/auth.service';

describe('Production Super Admin Seed & Verification', () => {
  const store = DataStore.getInstance();
  const userService = UserService.getInstance();
  const authService = AuthService.getInstance();
  let app: any;

  beforeEach(async () => {
    store.reset();
    app = createApp();
  });

  describe('Seed Functionality & Idempotency', () => {
    it('should successfully create the Super Admin user on initial run', async () => {
      const result = await seedProductionSuperAdmin({
        confirm: true,
        env: 'test',
        silent: true,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('CREATED');
      expect(result.user.email).toBe(SUPER_ADMIN_EMAIL);
      expect(result.user.displayName).toBe(SUPER_ADMIN_DISPLAY_NAME);
      expect(result.user.role).toBe(SUPER_ADMIN_ROLE);
      expect(result.user.status).toBe(SUPER_ADMIN_STATUS);

      const userInStore = Array.from(store.users.values()).find(
        (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
      );
      expect(userInStore).toBeDefined();
      expect(userInStore?.role).toBe(UserRole.SUPER_ADMIN);
      expect(userInStore?.status).toBe('ACTIVE');
      expect(userInStore?.password_hash).toBe(SUPER_ADMIN_PASSWORD_HASH);
    });

    it('should be idempotent and update rather than duplicate on subsequent runs', async () => {
      // First run
      const result1 = await seedProductionSuperAdmin({
        confirm: true,
        env: 'test',
        silent: true,
      });
      expect(result1.action).toBe('CREATED');

      // Second run
      const result2 = await seedProductionSuperAdmin({
        confirm: true,
        env: 'test',
        silent: true,
      });
      expect(result2.action).toBe('UPDATED');
      expect(result2.user.id).toBe(result1.user.id);
      expect(result2.user.email).toBe(SUPER_ADMIN_EMAIL);

      // Verify no duplicates
      const matchingUsers = Array.from(store.users.values()).filter(
        (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
      );
      expect(matchingUsers.length).toBe(1);
    });

    it('should require explicit confirmation in production environment', async () => {
      const originalConfirm = process.env.SEED_CONFIRM;
      delete process.env.SEED_CONFIRM;

      await expect(
        seedProductionSuperAdmin({
          confirm: false,
          env: 'production',
          silent: true,
        })
      ).rejects.toThrow('SEED_CONFIRMATION_REQUIRED');

      process.env.SEED_CONFIRM = originalConfirm;
    });
  });

  describe('Security & Authentication with Seeded Super Admin', () => {
    beforeEach(async () => {
      await seedProductionSuperAdmin({
        confirm: true,
        env: 'test',
        silent: true,
      });
    });

    it('should verify password hash matches the pre-computed bcrypt hash', async () => {
      const user = Array.from(store.users.values()).find(
        (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
      );
      expect(user).toBeDefined();
      expect(user?.password_hash).toBe(SUPER_ADMIN_PASSWORD_HASH);

      // Verify bcrypt hash format (cost factor 12)
      expect(SUPER_ADMIN_PASSWORD_HASH).toMatch(/^\$2[aby]?\$12\$/);
    });

    it('should never expose password_hash in auth or user queries', async () => {
      const user = Array.from(store.users.values()).find(
        (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
      );
      expect(user).toBeDefined();

      const token = authService.generateAccessToken(user!);
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.body.data.user.email).toBe(SUPER_ADMIN_EMAIL);
      expect(res.body.data.user.role).toBe(UserRole.SUPER_ADMIN);
    });

    it('should generate valid JWT tokens with SUPER_ADMIN role', async () => {
      const user = Array.from(store.users.values()).find(
        (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
      );
      expect(user).toBeDefined();

      const accessToken = authService.generateAccessToken(user!);
      expect(accessToken).toBeDefined();

      const refreshToken = await authService.generateRefreshToken(user!);
      expect(refreshToken).toBeDefined();

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(SUPER_ADMIN_EMAIL);
      expect(res.body.data.user.role).toBe(UserRole.SUPER_ADMIN);
    });

    it('should allow Super Admin to access protected RBAC endpoints', async () => {
      const user = Array.from(store.users.values()).find(
        (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
      );
      const token = authService.generateAccessToken(user!);

      const res = await request(app)
        .get('/api/v1/database/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
