import { apiClient, tokenStorage } from './client';
import { ApiResponse, LoginResponse, User } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshResponseData {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  tokenType?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

export const authApi = {
  /**
   * Authenticate user credentials.
   * Target: POST https://vs-console-server.onrender.com/api/v1/auth/login
   */
  login: async (credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    if (response.data.success && response.data.data) {
      const accessToken =
        response.data.data.tokens?.accessToken ||
        (response.data.data as any).accessToken;
      const refreshToken =
        response.data.data.tokens?.refreshToken ||
        (response.data.data as any).refreshToken;

      if (accessToken) {
        tokenStorage.setAccessToken(accessToken);
      }
      if (refreshToken) {
        tokenStorage.setRefreshToken(refreshToken);
      }
    }
    return response.data;
  },

  /**
   * Fetch authenticated user profile.
   * Target: GET https://vs-console-server.onrender.com/api/v1/auth/me
   */
  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data;
  },

  /**
   * Rotate access & refresh tokens.
   * Target: POST https://vs-console-server.onrender.com/api/v1/auth/refresh
   */
  refreshToken: async (refreshToken: string): Promise<ApiResponse<RefreshResponseData>> => {
    const response = await apiClient.post<ApiResponse<RefreshResponseData>>('/auth/refresh', {
      refreshToken,
    });
    if (response.data.success && response.data.data) {
      const newAccess =
        response.data.data.accessToken ||
        response.data.data.tokens?.accessToken;
      const newRefresh =
        response.data.data.refreshToken ||
        response.data.data.tokens?.refreshToken;

      if (newAccess) tokenStorage.setAccessToken(newAccess);
      if (newRefresh) tokenStorage.setRefreshToken(newRefresh);
    }
    return response.data;
  },

  /**
   * Invalidate active session.
   * Target: POST https://vs-console-server.onrender.com/api/v1/auth/logout
   */
  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/logout', {
        refreshToken,
      });
      return response.data;
    } finally {
      tokenStorage.clearTokens();
    }
  },

  /**
   * Update user password.
   * Target: POST https://vs-console-server.onrender.com/api/v1/auth/change-password
   */
  changePassword: async (data: ChangePasswordData): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/change-password', data);
    return response.data;
  },
};
