import { apiClient } from './client';
import { ApiResponse, RdsStatus } from '../types';

export const databaseApi = {
  getStatus: async (): Promise<ApiResponse<RdsStatus>> => {
    const response = await apiClient.get<ApiResponse<RdsStatus>>('/database/status');
    return response.data;
  },

  getInfo: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/database/info');
    return response.data;
  },

  getSchemas: async (): Promise<ApiResponse<string[]>> => {
    const response = await apiClient.get<ApiResponse<string[]>>('/database/schemas');
    return response.data;
  },

  getTables: async (schema?: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/database/tables', { params: { schema } });
    return response.data;
  },

  getSchemaTables: async (schema: string): Promise<ApiResponse<string[]>> => {
    const response = await apiClient.get<ApiResponse<string[]>>(`/database/schemas/${schema}/tables`);
    return response.data;
  },

  getTableDetails: async (table: string, schema?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>(`/database/tables/${table}`, { params: { schema } });
    return response.data;
  },

  getTableRows: async (table: string, params?: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: string; filter?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>(`/database/tables/${table}/rows`, { params });
    return response.data;
  },

  createRow: async (table: string, data: Record<string, any>): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/database/tables/${table}/rows`, data);
    return response.data;
  },

  updateRow: async (table: string, id: string, data: Record<string, any>): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch<ApiResponse<any>>(`/database/tables/${table}/rows/${id}`, data);
    return response.data;
  },

  deleteRow: async (table: string, id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete<ApiResponse<any>>(`/database/tables/${table}/rows/${id}`);
    return response.data;
  },

  // Users
  listUsers: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/database/users');
    return response.data;
  },

  createUser: async (data: { username: string; role: string; canLogin?: boolean }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/database/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: { role?: string; canLogin?: boolean }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch<ApiResponse<any>>(`/database/users/${id}`, data);
    return response.data;
  },

  disableUser: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/database/users/${id}/disable`);
    return response.data;
  },

  // Migrations
  listMigrations: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/database/migrations');
    return response.data;
  },

  getMigrationById: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>(`/database/migrations/${id}`);
    return response.data;
  },

  applyMigration: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/database/migrations/${id}/apply`);
    return response.data;
  },

  // Backups & Restore
  listBackups: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/database/backups');
    return response.data;
  },

  createBackup: async (data: { backupType: 'FULL' | 'SCHEMA_ONLY'; description?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/database/backups', data);
    return response.data;
  },

  getRestoreToken: async (backupId: string): Promise<ApiResponse<{ confirmationToken: string; expiresAt: string }>> => {
    const response = await apiClient.post<ApiResponse<{ confirmationToken: string; expiresAt: string }>>(`/database/backups/${backupId}/restore-token`);
    return response.data;
  },

  restore: async (data: { backupId: string; confirmationToken: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/database/restore', data);
    return response.data;
  },
};
