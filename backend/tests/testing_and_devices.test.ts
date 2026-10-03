import request from 'supertest';
import { createApp } from '../src/app';
import { DataStore } from '../src/database/data-store';
import { seedDevelopmentData } from '../scripts/seed';

describe('Testing Submissions, Quick Test & Device Management', () => {
  let app: any;
  const store = DataStore.getInstance();
  let adminToken: string;
  let testerToken: string;
  let devToken: string;

  beforeEach(async () => {
    store.reset();
    await seedDevelopmentData(store);
    app = createApp();

    const getAuthToken = async (email: string, pass: string) => {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password: pass });
      return res.body.data.tokens.accessToken;
    };

    adminToken = await getAuthToken('admin@voiceshield.internal', 'AdminPass123!');
    testerToken = await getAuthToken('tester1@voiceshield.internal', 'TesterPass123!');
    devToken = await getAuthToken('dev1@voiceshield.internal', 'DevPass123!');
  });

  it('should execute end-to-end testing workflow: Objective -> Quick Test -> Submission -> Admin Review', async () => {
    // 1. Fetch assigned objective
    const objRes = await request(app)
      .get('/api/v1/testing/objectives')
      .set('Authorization', `Bearer ${testerToken}`);
    expect(objRes.status).toBe(200);
    const objectiveId = objRes.body.data[0].id;

    // 2. Fetch compatible devices list
    const devListRes = await request(app)
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${testerToken}`);
    expect(devListRes.status).toBe(200);
    const deviceId = devListRes.body.data[0].id;

    // 3. Start Quick Test session
    const sessionRes = await request(app)
      .post('/api/v1/testing/sessions')
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        objectiveId,
        deviceId,
        appVersion: 'v2.1.0-rc3',
        androidVersion: 'Android 14',
      });
    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.data.id;

    // 4. Submit manual test results
    const subRes = await request(app)
      .post('/api/v1/testing/submissions')
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        sessionId,
        scenarioName: 'Suspicious Bank Impersonation Call Pattern',
        description: 'Simulated fraudulent bank call audio stream',
        expectedResult: 'Flagged as high-confidence scam within 3 seconds',
        actualResult: 'Scam flag triggered at 2.4s with warning prompt',
        outcome: 'PASS',
        testerNotes: 'Seamless detection without audio glitching',
      });
    expect(subRes.status).toBe(201);
    const submissionId = subRes.body.data.id;
    expect(subRes.body.data.status).toBe('SUBMITTED');

    // 5. Upload evidence file
    const fileRes = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${testerToken}`)
      .field('submissionId', submissionId)
      .attach('file', Buffer.from('Scam Alert Screenshot Image Bytes'), 'test_result.png');
    expect(fileRes.status).toBe(201);
    expect(fileRes.body.data.filename).toBe('test_result.png');

    // 6. Admin reviews and approves submission
    const reviewRes = await request(app)
      .post(`/api/v1/testing/submissions/${submissionId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ feedback: 'Verified against expected telemetry specs' });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.status).toBe('APPROVED');
  });

  it('should manage devices and allow soft deactivation with status history', async () => {
    // 1. Admin creates device
    const createRes = await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deviceName: 'Motorola Edge 50 Pro',
        modelNumber: 'XT2403-1',
        manufacturer: 'Motorola',
        androidVersion: 'Android 14',
      });
    expect(createRes.status).toBe(201);
    const deviceId = createRes.body.data.id;

    // 2. Admin soft deactivates device
    const deactRes = await request(app)
      .post(`/api/v1/devices/${deviceId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Hardware decommissioned for new test cycle' });
    expect(deactRes.status).toBe(200);
    expect(deactRes.body.data.status).toBe('INACTIVE');
  });
});
