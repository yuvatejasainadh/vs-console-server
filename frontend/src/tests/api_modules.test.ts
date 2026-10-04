import { describe, it, expect, vi } from 'vitest';
import {
  workApi,
  devicesApi,
  testingApi,
  databaseApi,
  exportsApi,
  auditApi,
  notificationsApi,
  healthApi,
} from '../api';
import { apiClient, healthClient } from '../api/client';

describe('API Modules Route Path Uniformity', () => {
  it('should route work endpoints without duplicating /api/v1', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: [] } } as any);
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: {} } } as any);

    await workApi.list();
    expect(getSpy).toHaveBeenCalledWith('/work', { params: undefined });

    await workApi.accept('work-123');
    expect(postSpy).toHaveBeenCalledWith('/work/work-123/accept');

    await workApi.start('work-123');
    expect(postSpy).toHaveBeenCalledWith('/work/work-123/start');

    await workApi.complete('work-123');
    expect(postSpy).toHaveBeenCalledWith('/work/work-123/complete');
  });

  it('should route devices endpoints without duplicating /api/v1', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: [] } } as any);
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: {} } } as any);

    await devicesApi.list();
    expect(getSpy).toHaveBeenCalledWith('/devices', { params: undefined });

    await devicesApi.deactivate('dev-123');
    expect(postSpy).toHaveBeenCalledWith('/devices/dev-123/deactivate');
  });

  it('should route testing endpoints without duplicating /api/v1', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: [] } } as any);
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: {} } } as any);

    await testingApi.listObjectives();
    expect(getSpy).toHaveBeenCalledWith('/testing/objectives', { params: undefined });

    await testingApi.startSession({ objectiveId: 'obj-1' });
    expect(postSpy).toHaveBeenCalledWith('/testing/sessions', { objectiveId: 'obj-1' });

    await testingApi.listSubmissions();
    expect(getSpy).toHaveBeenCalledWith('/testing/submissions', { params: undefined });
  });

  it('should route database endpoints without duplicating /api/v1', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: {} } } as any);

    await databaseApi.getStatus();
    expect(getSpy).toHaveBeenCalledWith('/database/status');

    await databaseApi.getSchemas();
    expect(getSpy).toHaveBeenCalledWith('/database/schemas');

    await databaseApi.getTables();
    expect(getSpy).toHaveBeenCalledWith('/database/tables', { params: { schema: undefined } });
  });

  it('should route exports, audit, and notifications correctly', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: [] } } as any);
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: {} } } as any);

    await exportsApi.list();
    expect(getSpy).toHaveBeenCalledWith('/exports', { params: undefined });

    await auditApi.list();
    expect(getSpy).toHaveBeenCalledWith('/audit', { params: undefined });

    await notificationsApi.list();
    expect(getSpy).toHaveBeenCalledWith('/notifications', { params: undefined });

    await notificationsApi.markAllAsRead();
    expect(postSpy).toHaveBeenCalledWith('/notifications/read-all');
  });

  it('should route health endpoints to root health host, not /api/v1', async () => {
    const getSpy = vi.spyOn(healthClient, 'get').mockResolvedValue({ data: { status: 'READY' } } as any);

    await healthApi.getLive();
    expect(getSpy).toHaveBeenCalledWith('/live');

    await healthApi.getReady();
    expect(getSpy).toHaveBeenCalledWith('/ready');
  });
});
