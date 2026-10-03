import request from 'supertest';
import { createApp } from '../src/app';
import { DataStore } from '../src/database/data-store';
import { seedDevelopmentData } from '../scripts/seed';

describe('Security Hardening & IDOR Protection Test Suite', () => {
  let app: any;
  const store = DataStore.getInstance();
  let tokens: Record<string, string> = {};
  let users: Record<string, any> = {};

  beforeEach(async () => {
    store.reset();
    const seed = await seedDevelopmentData(store);
    users = seed.users;
    app = createApp();

    const getAuthToken = async (email: string, pass: string) => {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password: pass });
      return res.body.data.tokens.accessToken;
    };

    tokens.superAdmin = await getAuthToken('sainadh@voiceshield.internal', 'SuperAdmin123!');
    tokens.admin = await getAuthToken('admin@voiceshield.internal', 'AdminPass123!');
    tokens.dev1 = await getAuthToken('dev1@voiceshield.internal', 'DevPass123!');
    tokens.dev2 = await getAuthToken('dev2@voiceshield.internal', 'DevPass123!');
    tokens.tester1 = await getAuthToken('tester1@voiceshield.internal', 'TesterPass123!');
  });

  describe('IDOR & Cross-User Isolation', () => {
    it('should prevent Developer 2 from viewing or updating Developer 1 work items (403)', async () => {
      // Dev 1 work item
      const workItem1 = Array.from(store.workItems.values()).find(
        (w) => w.assigned_to === users.devOne.id
      )!;

      // Dev 2 attempts to get Dev 1's work item
      const getRes = await request(app)
        .get(`/api/v1/work/${workItem1.id}`)
        .set('Authorization', `Bearer ${tokens.dev2}`);
      expect(getRes.status).toBe(403);

      // Dev 2 attempts to update Dev 1's work item
      const patchRes = await request(app)
        .patch(`/api/v1/work/${workItem1.id}`)
        .set('Authorization', `Bearer ${tokens.dev2}`)
        .send({ title: 'Hacked Work Title' });
      expect(patchRes.status).toBe(403);
    });

    it('should prevent Developer 2 from creating or submitting documentation for Developer 1 work items (403)', async () => {
      const workItem1 = Array.from(store.workItems.values()).find(
        (w) => w.assigned_to === users.devOne.id
      )!;

      const docRes = await request(app)
        .post(`/api/v1/work/${workItem1.id}/documentation`)
        .set('Authorization', `Bearer ${tokens.dev2}`)
        .send({
          what_i_did: 'Unauthorized documentation creation',
          why_i_did_it: 'Malicious attempt',
          changes_made: 'Injected code',
          testing_performed: 'Manual testing verification',
          result: 'Failed',
        });
      expect(docRes.status).toBe(403);
    });

    it('should prevent privilege escalation by normal users modifying their own role (403)', async () => {
      const escalateRes = await request(app)
        .patch(`/api/v1/users/${users.devOne.id}`)
        .set('Authorization', `Bearer ${tokens.dev1}`)
        .send({ role: 'SUPER_ADMIN' });
      // Developer cannot even access user management routes
      expect(escalateRes.status).toBe(403);
    });
  });

  describe('Audit Log Immutability & Database Explorer Protection', () => {
    it('should reject manual insertion into the audit_logs table via Database Explorer (400)', async () => {
      const insertRes = await request(app)
        .post('/api/v1/database/tables/audit_logs/rows')
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .send({
          event_type: 'FAKE_EVENT',
          action: 'TAMPER_AUDIT',
        });
      expect(insertRes.status).toBe(400);
      expect(insertRes.body.error.message).toContain('append-only');
    });

    it('should reject updating or deleting audit_logs rows via Database Explorer (400)', async () => {
      const updateRes = await request(app)
        .patch('/api/v1/database/tables/audit_logs/rows/a1')
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .send({ action: 'MUTATE_AUDIT' });
      expect(updateRes.status).toBe(400);

      const deleteRes = await request(app)
        .delete('/api/v1/database/tables/audit_logs/rows/a1')
        .set('Authorization', `Bearer ${tokens.superAdmin}`);
      expect(deleteRes.status).toBe(400);
    });

    it('should reject database explorer queries targeting invalid or system-internal tables (400)', async () => {
      const invalidTableRes = await request(app)
        .get('/api/v1/database/tables/pg_shadow/rows')
        .set('Authorization', `Bearer ${tokens.superAdmin}`);
      expect(invalidTableRes.status).toBe(400);
    });
  });

  describe('Device State Protection', () => {
    it('should reject starting a Quick Test session on an inactive device (400)', async () => {
      const device = Array.from(store.devices.values())[0];
      device.status = 'INACTIVE';

      const obj = Array.from(store.testingObjectives.values())[0];

      const sessionRes = await request(app)
        .post('/api/v1/testing/sessions')
        .set('Authorization', `Bearer ${tokens.tester1}`)
        .send({
          objectiveId: obj.id,
          deviceId: device.id,
          appVersion: '1.0.0',
          androidVersion: '14',
        });

      expect(sessionRes.status).toBe(400);
      expect(sessionRes.body.error.message).toContain('inactive device');
    });
  });
});
