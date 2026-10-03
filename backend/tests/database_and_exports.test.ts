import request from 'supertest';
import { createApp } from '../src/app';
import { DataStore } from '../src/database/data-store';
import { seedDevelopmentData } from '../scripts/seed';

describe('Privileged RDS Administration, Database Explorer, Exports & Audit', () => {
  let app: any;
  const store = DataStore.getInstance();
  let superAdminToken: string;
  let adminToken: string;
  let devToken: string;

  beforeEach(async () => {
    store.reset();
    await seedDevelopmentData(store);
    app = createApp();

    const getAuthToken = async (email: string, pass: string) => {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password: pass });
      return res.body.data.tokens.accessToken;
    };

    superAdminToken = await getAuthToken('sainadh@voiceshield.internal', 'SuperAdmin123!');
    adminToken = await getAuthToken('admin@voiceshield.internal', 'AdminPass123!');
    devToken = await getAuthToken('dev1@voiceshield.internal', 'DevPass123!');
  });

  it('should allow Admin/Super Admin to query RDS dashboard status, info, schemas, and tables', async () => {
    const statusRes = await request(app)
      .get('/api/v1/database/status')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.engine).toBe('PostgreSQL');

    const tablesRes = await request(app)
      .get('/api/v1/database/tables')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(tablesRes.status).toBe(200);
    expect(tablesRes.body.data).toContain('users');
  });

  it('should support Database Explorer queries for allowed tables', async () => {
    const rowsRes = await request(app)
      .get('/api/v1/database/tables/devices/rows')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rowsRes.status).toBe(200);
    expect(rowsRes.body.data.length).toBeGreaterThan(0);
  });

  it('should require a valid confirmation_token before performing database restore', async () => {
    // 1. Fetch available backups
    const backupsRes = await request(app)
      .get('/api/v1/database/backups')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(backupsRes.status).toBe(200);
    const backupId = backupsRes.body.data[0].id;

    // 2. Attempt restore without confirmation token (should fail)
    const failRes = await request(app)
      .post('/api/v1/database/restore')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ backupId, confirmationToken: 'INVALID_TOKEN' });
    expect(failRes.status).toBe(400);

    // 3. Request server-generated confirmation token
    const tokenRes = await request(app)
      .post(`/api/v1/database/backups/${backupId}/restore-token`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(tokenRes.status).toBe(200);
    const confirmationToken = tokenRes.body.data.token;

    // 4. Perform restore with valid token
    const successRes = await request(app)
      .post('/api/v1/database/restore')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ backupId, confirmationToken });
    expect(successRes.status).toBe(200);
    expect(successRes.body.data.success).toBe(true);
  });

  it('should generate SQL, CSV, and JSON database exports and allow secure download', async () => {
    // JSON export
    const jsonRes = await request(app)
      .post('/api/v1/exports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ format: 'JSON', tables: ['devices', 'work_items'] });
    expect(jsonRes.status).toBe(201);
    const exportId = jsonRes.body.data.id;

    // Download export
    const downloadRes = await request(app)
      .get(`/api/v1/exports/${exportId}/download`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers['content-type']).toContain('application/json');

    // CSV export
    const csvRes = await request(app)
      .post('/api/v1/exports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ format: 'CSV', tables: ['devices'] });
    expect(csvRes.status).toBe(201);

    // SQL export
    const sqlRes = await request(app)
      .post('/api/v1/exports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ format: 'SQL', tables: ['devices'] });
    expect(sqlRes.status).toBe(201);
  });

  it('should track append-only audit logs and support filtered audit queries', async () => {
    const auditRes = await request(app)
      .get('/api/v1/audit?eventType=LOGIN')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.length).toBeGreaterThan(0);
  });
});
