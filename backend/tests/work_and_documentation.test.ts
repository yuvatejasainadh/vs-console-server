import request from 'supertest';
import { createApp } from '../src/app';
import { DataStore } from '../src/database/data-store';
import { seedDevelopmentData } from '../scripts/seed';

describe('Work Management & Developer Documentation Workflow', () => {
  let app: any;
  const store = DataStore.getInstance();
  let superAdminToken: string;
  let devToken: string;
  let adminToken: string;
  let seedUsers: any;

  beforeEach(async () => {
    store.reset();
    const seed = await seedDevelopmentData(store);
    seedUsers = seed.users;
    app = createApp();

    const getAuthToken = async (email: string, pass: string) => {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password: pass });
      return res.body.data.tokens.accessToken;
    };

    superAdminToken = await getAuthToken('sainadh@voiceshield.internal', 'SuperAdmin123!');
    adminToken = await getAuthToken('admin@voiceshield.internal', 'AdminPass123!');
    devToken = await getAuthToken('dev1@voiceshield.internal', 'DevPass123!');
  });

  it('should enforce complete lifecycle: ASSIGNED -> ACCEPTED -> IN_PROGRESS -> SUBMITTED -> APPROVED -> COMPLETED', async () => {
    // 1. Create work item
    const createRes = await request(app)
      .post('/api/v1/work')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        title: 'Full Workflow Feature Work Item',
        description: 'End-to-end testing of work transitions',
        priority: 'HIGH',
        assignedTo: seedUsers.devOne.id,
      });

    expect(createRes.status).toBe(201);
    const workId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe('ASSIGNED');

    // 2. Developer accepts work
    const acceptRes = await request(app)
      .post(`/api/v1/work/${workId}/accept`)
      .set('Authorization', `Bearer ${devToken}`);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('ACCEPTED');

    // 3. Developer starts work
    const startRes = await request(app)
      .post(`/api/v1/work/${workId}/start`)
      .set('Authorization', `Bearer ${devToken}`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe('IN_PROGRESS');

    // 4. Developer creates documentation
    const docRes = await request(app)
      .post(`/api/v1/work/${workId}/documentation`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        what_i_did: 'Built the feature implementation',
        why_i_did_it: 'Core business requirement',
        changes_made: 'Created 4 modules and tests',
        testing_performed: 'Manual and unit tests',
        result: 'All criteria satisfied',
      });
    expect(docRes.status).toBe(201);
    const docId = docRes.body.data.id;

    // 5. Developer submits documentation for review
    const submitRes = await request(app)
      .post(`/api/v1/documentation/${docId}/submit`)
      .set('Authorization', `Bearer ${devToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('SUBMITTED');

    // 6. Check work item status is now DOCUMENTATION_SUBMITTED
    const workCheck = await request(app)
      .get(`/api/v1/work/${workId}`)
      .set('Authorization', `Bearer ${devToken}`);
    expect(workCheck.body.data.status).toBe('DOCUMENTATION_SUBMITTED');

    // 7. Admin reviews and requests changes
    const changesRes = await request(app)
      .post(`/api/v1/documentation/${docId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'REQUEST_CHANGES',
        feedback: 'Please document edge case error handling',
      });
    expect(changesRes.status).toBe(200);
    expect(changesRes.body.data.status).toBe('CHANGES_REQUESTED');

    // 8. Developer updates documentation and resubmits
    await request(app)
      .patch(`/api/v1/documentation/${docId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        what_i_did: 'Built the feature implementation and added edge case docs',
      });

    const resubmitRes = await request(app)
      .post(`/api/v1/documentation/${docId}/submit`)
      .set('Authorization', `Bearer ${devToken}`);
    expect(resubmitRes.status).toBe(200);

    // 9. Admin approves documentation
    const approveRes = await request(app)
      .post(`/api/v1/documentation/${docId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'APPROVE',
        feedback: 'Looks good! Approved.',
      });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // 10. Complete work item
    const completeRes = await request(app)
      .post(`/api/v1/work/${workId}/complete`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ notes: 'Deployment ready and verified' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');

    // 11. Verify documentation version history has multiple versions preserved
    const historyRes = await request(app)
      .get(`/api/v1/documentation/${docId}/history`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.versions.length).toBeGreaterThanOrEqual(2);
    expect(historyRes.body.data.reviews.length).toBeGreaterThanOrEqual(2);
  });

  it('should reject invalid work status jump (e.g. ASSIGNED directly to COMPLETED)', async () => {
    const createRes = await request(app)
      .post('/api/v1/work')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        title: 'Invalid Transition Work Item',
        description: 'Trying illegal status leap',
        assignedTo: seedUsers.devOne.id,
      });
    const workId = createRes.body.data.id;

    const completeRes = await request(app)
      .post(`/api/v1/work/${workId}/complete`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(completeRes.status).toBe(409); // Conflict / Invalid transition
  });
});
