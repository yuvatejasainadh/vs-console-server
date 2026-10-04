import { describe, it, expect, beforeEach } from 'vitest';
import { API_BASE_URL, HEALTH_BASE_URL, tokenStorage, apiClient, healthClient } from '../api/client';

describe('Centralized API Client Architecture', () => {
  beforeEach(() => {
    tokenStorage.clearTokens();
  });

  it('should have production default API_BASE_URL strictly pointing to /api/v1', () => {
    expect(API_BASE_URL).toBe('https://vs-console-server.onrender.com/api/v1');
    expect(apiClient.defaults.baseURL).toBe('https://vs-console-server.onrender.com/api/v1');
  });

  it('should have separate HEALTH_BASE_URL strictly pointing to root host /health', () => {
    expect(HEALTH_BASE_URL).toBe('https://vs-console-server.onrender.com/health');
    expect(healthClient.defaults.baseURL).toBe('https://vs-console-server.onrender.com/health');
  });

  it('should securely store and retrieve access and refresh tokens', () => {
    tokenStorage.setAccessToken('test-access-token-123');
    tokenStorage.setRefreshToken('test-refresh-token-456');

    expect(tokenStorage.getAccessToken()).toBe('test-access-token-123');
    expect(tokenStorage.getRefreshToken()).toBe('test-refresh-token-456');

    tokenStorage.clearTokens();
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });
});
