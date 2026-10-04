import { apiClient } from './client';
import { ApiResponse, User, UserRole } from '../types';

export interface CreateUserData {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  status?: 'ACTIVE' | 'DISABLED';
}

export interface UpdateUserData {
  displayName?: string;
  role?: UserRole;
  status?: 'ACTIVE' | 'DISABLED';
}

export const usersApi = {
  list: async (params?: { page?: number; pageSize?: number; role?: string; status?: string; search?: string }): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get<ApiResponse<User[]>>('/users', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },

  create: async (data: CreateUserData): Promise<ApiResponse<User>> => {
    const response = await apiClient.post<ApiResponse<User>>('/users', data);
    return response.data;
  },

  update: async (id: string, data: UpdateUserData): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, data);
    return response.data;
  },

  disable: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(`/users/${id}/disable`);
    return response.data;
  },
};
