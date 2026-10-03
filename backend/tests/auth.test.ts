import request from 'supertest';
import { createApp } from '../src/app';
import { DataStore } from '../src/database/data-store';
import { seedDevelopmentData } from '../scripts/seed';

describe('Authentication & Session Management', () => {
  let app: any;
  const store = DataStore.getInstance();

  beforeEach(async () => {
    store.reset();
    await seedDevelopmentData(store);
    app = createApp();
  });

  it('should successfully login with valid credentials and return user info with tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'sainadh@voiceshield.internal',
        password: 'SuperAdmin123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('sainadh@voiceshield.internal');
    expect(res.body.data.user.role).toBe('SUPER_ADMIN');
    expect(res.body.data.user.password_hash).toBeUndefined(); // Never expose password_hash
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
  });

  it('should reject login with invalid password (401)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'sainadh@voiceshield.internal',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject login for disabled user account (403)', async () => {
    const user = Array.from(store.users.values()).find(
      (u) => u.email === 'dev1@voiceshield.internal'
    );
    if (user) {
      user.status = 'DISABLED';
    }

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'dev1@voiceshield.internal',
        password: 'DevPass123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should rotate refresh tokens and return new token pair', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@voiceshield.internal',
        password: 'AdminPass123!',
      });

    const { refreshToken } = loginRes.body.data.tokens;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken);

    // Old refresh token must now be revoked
    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(reuseRes.status).toBe(401);
  });

  it('should return current authenticated user via GET /api/v1/auth/me', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'dev1@voiceshield.internal',
        password: 'DevPass123!',
      });

    const token = loginRes.body.data.tokens.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('dev1@voiceshield.internal');
    expect(meRes.body.data.user.role).toBe('DEVELOPER');
  });

  it('should allow user to change password with valid current password', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'tester1@voiceshield.internal',
        password: 'TesterPass123!',
      });

    const token = loginRes.body.data.tokens.accessToken;

    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'TesterPass123!',
        newPassword: 'BrandNewTesterPass123!',
      });

    expect(changeRes.status).toBe(200);

    // Login with new password should succeed
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'tester1@voiceshield.internal',
        password: 'BrandNewTesterPass123!',
      });
    expect(newLoginRes.status).toBe(200);
  });
});
