import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Centralized API Base URL for VoiceShield Console
// Default: Production backend on Render (https://vs-console-server.onrender.com/api/v1)
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'https://vs-console-server.onrender.com/api/v1';

// Centralized Health Base URL (at root host level, not /api/v1)
export const HEALTH_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_HEALTH_BASE_URL) ||
  'https://vs-console-server.onrender.com/health';

// Token Storage Keys
const ACCESS_TOKEN_KEY = 'vs_console_access_token';
const REFRESH_TOKEN_KEY = 'vs_console_refresh_token';

// In-memory fallback for environments without browser localStorage (e.g. tests / SSR)
const memoryStorage: Record<string, string> = {};

const getStorageItem = (key: string): string | null => {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStorage[key] || null;
    }
  }
  return memoryStorage[key] || null;
};

const setStorageItem = (key: string, value: string): void => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      memoryStorage[key] = value;
      return;
    }
  }
  memoryStorage[key] = value;
};

const removeStorageItem = (key: string): void => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
  delete memoryStorage[key];
};

export const tokenStorage = {
  getAccessToken: (): string | null => {
    return getStorageItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken: (token: string): void => {
    setStorageItem(ACCESS_TOKEN_KEY, token);
  },
  getRefreshToken: (): string | null => {
    return getStorageItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken: (token: string): void => {
    setStorageItem(REFRESH_TOKEN_KEY, token);
  },
  clearTokens: (): void => {
    removeStorageItem(ACCESS_TOKEN_KEY);
    removeStorageItem(REFRESH_TOKEN_KEY);
  },
};

// Create main API client configured strictly to API_BASE_URL
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Create standalone client for health checks
export const healthClient: AxiosInstance = axios.create({
  baseURL: HEALTH_BASE_URL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach Bearer JWT
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Expiry & Automatic Refresh Rotation
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retried and not login/refresh endpoints
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        tokenStorage.clearTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vs-auth-unauthorized'));
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken =
          refreshResponse.data?.data?.tokens?.accessToken ||
          refreshResponse.data?.data?.accessToken ||
          refreshResponse.data?.tokens?.accessToken;
        const newRefreshToken =
          refreshResponse.data?.data?.tokens?.refreshToken ||
          refreshResponse.data?.data?.refreshToken ||
          refreshResponse.data?.tokens?.refreshToken ||
          refreshToken;

        if (newAccessToken) {
          tokenStorage.setAccessToken(newAccessToken);
          if (newRefreshToken) {
            tokenStorage.setRefreshToken(newRefreshToken);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('No access token in refresh response');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clearTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vs-auth-unauthorized'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
