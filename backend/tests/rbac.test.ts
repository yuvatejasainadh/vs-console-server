import request from 'supertest';
import { createApp } from '../src/app';
import { DataStore } from '../src/database/data-store';
import { seedDevelopmentData } from '../scripts/seed';

describe('RBAC & Role Boundaries Verification (Section 54 Acceptance Tests)', () => {
  let app: any;
  const store = DataStore.getInstance();
  let tokens: Record<string, string> = {};
  let users: Record<string, any> = {};

  beforeEach(async () => {
    store.reset();
    const seed = await seedDevelopmentData(store);
    users = seed.users;
    app = createApp();

    // Generate auth tokens for each role
    const getAuthToken = async (email: string, pass: string) => {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password: pass });
      return res.body.data.tokens.accessToken;
    };

    tokens.superAdmin = await getAuthToken('sainadh@voiceshield.internal', 'SuperAdmin123!');
    tokens.admin = await getAuthToken('admin@voiceshield.internal', 'AdminPass123!');
    tokens.dev1 = await getAuthToken('dev1@voiceshield.internal', 'DevPass123!');
    tokens.dev2 = await getAuthToken('dev2@voiceshield.internal', 'DevPass123!');
    tokens.tester = await getAuthToken('tester1@voiceshield.internal', 'TesterPass123!');
  });

  // --- SUPER ADMIN ---
  describe('SUPER_ADMIN Privileges', () => {
    it('✓ can assign work to self', async () => {
      const res = await request(app)
        .post('/api/v1/work')
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .send({
          title: 'Super Admin Self Assigned Work',
          description: 'Architecture review',
          assignedTo: users.sainadh.id,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.assigned_to).toBe(users.sainadh.id);
    });

    it('✓ can assign work to Admin', async () => {
      const res = await request(app)
        .post('/api/v1/work')
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .send({
          title: 'Work for Admin',
          description: 'Manage release cycle',
          assignedTo: users.adminUser.id,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.assigned_to).toBe(users.adminUser.id);
    });

    it('✓ can assign work to Developer', async () => {
      const res = await request(app)
        .post('/api/v1/work')
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .send({
          title: 'Work for Dev',
          description: 'Implement feature',
          assignedTo: users.devOne.id,
        });
      expect(res.status).toBe(201);
    });

    it('✓ can manage Admin accounts', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .send({
          email: 'newadmin@voiceshield.internal',
          password: 'AdminPassword123!',
          displayName: 'New Admin',
          role: 'ADMIN',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('✓ can access RDS and generate exports', async () => {
      const rdsRes = await request(app)
        .get('/api/v1/database/status')
        .set('Authorization', `Bearer ${tokens.superAdmin}`);
      expect(rdsRes.status).toBe(200);

      const exportRes = await request(app)
        .post('/api/v1/exports')
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .send({ format: 'JSON', tables: ['devices'] });
      expect(exportRes.status).toBe(201);
    });

    it('✓ can view complete audit logs', async () => {
      const auditRes = await request(app)
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${tokens.superAdmin}`);
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data).toBeDefined();
    });
  });

  // --- ADMIN ---
  describe('ADMIN Privileges and Boundaries', () => {
    it('✓ can assign work to self and Developer', async () => {
      const selfRes = await request(app)
        .post('/api/v1/work')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({
          title: 'Admin Self Work',
          description: 'Review operational metrics',
          assignedTo: users.adminUser.id,
        });
      expect(selfRes.status).toBe(201);

      const devRes = await request(app)
        .post('/api/v1/work')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({
          title: 'Admin Assigned Dev Work',
          description: 'Fix bug',
          assignedTo: users.devOne.id,
        });
      expect(devRes.status).toBe(201);
    });

    it('✗ CANNOT assign work to another Admin (403)', async () => {
      // Create a second admin user
      const admin2Res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .send({
          email: 'admin2@voiceshield.internal',
          password: 'AdminPassword123!',
          displayName: 'Admin Two',
          role: 'ADMIN',
        });
      const admin2Id = admin2Res.body.data.id;

      // Admin 1 attempts to assign work to Admin 2
      const res = await request(app)
        .post('/api/v1/work')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({
          title: 'Illegal Admin to Admin Work',
          description: 'Forbidden assignment',
          assignedTo: admin2Id,
        });

      expect(res.status).toBe(403);
    });

    it('✗ CANNOT manage Admin accounts (403)', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({
          email: 'anotheradmin@voiceshield.internal',
          password: 'AdminPassword123!',
          displayName: 'Another Admin',
          role: 'ADMIN',
        });
      expect(res.status).toBe(403);
    });

    it('✓ can access RDS and manage devices', async () => {
      const rdsRes = await request(app)
        .get('/api/v1/database/status')
        .set('Authorization', `Bearer ${tokens.admin}`);
      expect(rdsRes.status).toBe(200);

      const deviceRes = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({
          deviceName: 'OnePlus 12',
          modelNumber: 'CPH2581',
          manufacturer: 'OnePlus',
          androidVersion: 'Android 14',
        });
      expect(deviceRes.status).toBe(201);
    });
  });

  // --- DEVELOPER ---
  describe('DEVELOPER Privileges and Boundaries', () => {
    it('✓ can view assigned work and submit documentation', async () => {
      const workListRes = await request(app)
        .get('/api/v1/work')
        .set('Authorization', `Bearer ${tokens.dev1}`);
      expect(workListRes.status).toBe(200);
      expect(workListRes.body.data.every((w: any) => w.assigned_to === users.devOne.id)).toBe(true);

      const workId = workListRes.body.data[0].id;
      const docRes = await request(app)
        .post(`/api/v1/work/${workId}/documentation`)
        .set('Authorization', `Bearer ${tokens.dev1}`)
        .send({
          what_i_did: 'Implemented native FFI bindings',
          why_i_did_it: 'Low latency requirement',
          changes_made: 'Added native C++ files',
          testing_performed: 'Unit tests passed',
          result: 'All 10 tests green',
        });
      expect(docRes.status).toBe(201);
    });

    it('✓ can assign and monitor testing objectives', async () => {
      const objRes = await request(app)
        .post('/api/v1/testing/objectives')
        .set('Authorization', `Bearer ${tokens.dev1}`)
        .send({
          title: 'Developer Assigned Objective',
          description: 'Test newly implemented audio interop',
          targetArea: 'Audio Pipeline',
          assignedTo: users.testerOne.id,
        });
      expect(objRes.status).toBe(201);
    });

    it('✗ CANNOT access RDS (403)', async () => {
      const res = await request(app)
        .get('/api/v1/database/status')
        .set('Authorization', `Bearer ${tokens.dev1}`);
      expect(res.status).toBe(403);
    });

    it('✗ CANNOT generate database exports (403)', async () => {
      const res = await request(app)
        .post('/api/v1/exports')
        .set('Authorization', `Bearer ${tokens.dev1}`)
        .send({ format: 'JSON', tables: ['devices'] });
      expect(res.status).toBe(403);
    });

    it('✗ CANNOT manage users (403)', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${tokens.dev1}`);
      expect(res.status).toBe(403);
    });

    it('✗ CANNOT manage devices (403)', async () => {
      const res = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${tokens.dev1}`)
        .send({
          deviceName: 'Dev Device',
          modelNumber: 'M123',
          manufacturer: 'Sony',
          androidVersion: '14',
        });
      expect(res.status).toBe(403);
    });
  });

  // --- TESTER ---
  describe('TESTER Privileges and Boundaries', () => {
    it('✓ can view assigned objective and start Quick Test session', async () => {
      const objListRes = await request(app)
        .get('/api/v1/testing/objectives')
        .set('Authorization', `Bearer ${tokens.tester}`);
      expect(objListRes.status).toBe(200);

      const objectiveId = objListRes.body.data[0].id;
      const deviceId = Array.from(store.devices.values())[0].id;

      const sessionRes = await request(app)
        .post('/api/v1/testing/sessions')
        .set('Authorization', `Bearer ${tokens.tester}`)
        .send({
          objectiveId,
          deviceId,
          appVersion: 'v1.4.2-staging',
          androidVersion: 'Android 14',
        });
      expect(sessionRes.status).toBe(201);
      expect(sessionRes.body.data.test_id).toBeDefined();
    });

    it('✗ CANNOT access RDS (403)', async () => {
      const res = await request(app)
        .get('/api/v1/database/status')
        .set('Authorization', `Bearer ${tokens.tester}`);
      expect(res.status).toBe(403);
    });

    it('✗ CANNOT export database (403)', async () => {
      const res = await request(app)
        .post('/api/v1/exports')
        .set('Authorization', `Bearer ${tokens.tester}`)
        .send({ format: 'SQL', tables: ['all'] });
      expect(res.status).toBe(403);
    });

    it('✗ CANNOT manage devices (403)', async () => {
      const res = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${tokens.tester}`)
        .send({
          deviceName: 'Tester Device',
          modelNumber: 'T100',
          manufacturer: 'LG',
          androidVersion: '13',
        });
      expect(res.status).toBe(403);
    });

    it('✗ CANNOT review tests (403)', async () => {
      const res = await request(app)
        .post('/api/v1/testing/submissions/sub123/approve')
        .set('Authorization', `Bearer ${tokens.tester}`)
        .send({ feedback: 'Approved by tester' });
      expect(res.status).toBe(403);
    });

    it('✗ CANNOT review developer documentation (403)', async () => {
      const res = await request(app)
        .post('/api/v1/documentation/doc123/review')
        .set('Authorization', `Bearer ${tokens.tester}`)
        .send({ action: 'APPROVE', feedback: 'Approved' });
      expect(res.status).toBe(403);
    });
  });
});
