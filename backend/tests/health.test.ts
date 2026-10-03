import request from 'supertest';
import { createApp } from '../src/app';

describe('Health Checks & API Documentation Endpoints', () => {
  const app = createApp();

  it('should return 200 on /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.service).toBe('VoiceShield Console Backend');
  });

  it('should return 200 on /health/live', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  it('should return 200 on /health/ready', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('READY');
  });

  it('should serve OpenAPI JSON specification on /api/docs.json', async () => {
    const res = await request(app).get('/api/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('VoiceShield Console API');
  });
});
