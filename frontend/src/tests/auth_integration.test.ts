import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from '../api/auth';
import { apiClient, tokenStorage } from '../api/client';

describe('Auth API Integration & Route Paths', () => {
  beforeEach(() => {
    tokenStorage.clearTokens();
    vi.restoreAllMocks();
  });

  it('should send login request strictly to POST /auth/login (yielding /api/v1/auth/login)', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 'u1', email: 'sainadh@voiceshield.internal', displayName: 'Sainadh', role: 'SUPER_ADMIN', status: 'ACTIVE' },
          tokens: { accessToken: 'jwt-access-123', refreshToken: 'refresh-456' },
        },
        requestId: 'req-1',
      },
    } as any);

    const result = await authApi.login({
      email: 'sainadh@voiceshield.internal',
      password: 'SuperAdmin123!',
    });

    expect(postSpy).toHaveBeenCalledWith('/auth/login', {
      email: 'sainadh@voiceshield.internal',
      password: 'SuperAdmin123!',
    });
    expect(result.success).toBe(true);
    expect(tokenStorage.getAccessToken()).toBe('jwt-access-123');
    expect(tokenStorage.getRefreshToken()).toBe('refresh-456');
  });

  it('should fetch profile strictly via GET /auth/me', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 'u1', email: 'sainadh@voiceshield.internal', displayName: 'Sainadh', role: 'SUPER_ADMIN', status: 'ACTIVE' },
        },
        requestId: 'req-2',
      },
    } as any);

    const result = await authApi.getCurrentUser();
    expect(getSpy).toHaveBeenCalledWith('/auth/me');
    expect(result.success).toBe(true);
    expect(result.data?.user.role).toBe('SUPER_ADMIN');
  });

  it('should rotate tokens strictly via POST /auth/refresh', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          tokens: { accessToken: 'new-jwt', refreshToken: 'new-refresh' },
        },
        requestId: 'req-3',
      },
    } as any);

    const result = await authApi.refreshToken('current-refresh-token');
    expect(postSpy).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'current-refresh-token',
    });
    expect(result.success).toBe(true);
  });

  it('should logout strictly via POST /auth/logout and clear tokens', async () => {
    tokenStorage.setAccessToken('active-token');
    tokenStorage.setRefreshToken('active-refresh');

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        data: { message: 'Successfully logged out' },
        requestId: 'req-4',
      },
    } as any);

    await authApi.logout();
    expect(postSpy).toHaveBeenCalledWith('/auth/logout', {
      refreshToken: 'active-refresh',
    });
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
