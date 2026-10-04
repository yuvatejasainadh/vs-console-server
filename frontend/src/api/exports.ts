import { apiClient, API_BASE_URL } from './client';
import { ApiResponse } from '../types';

export interface CreateExportData {
  format: 'SQL' | 'CSV' | 'JSON';
  tables: string[];
  includeSchema?: boolean;
}

export const exportsApi = {
  create: async (data: CreateExportData): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/exports', data);
    return response.data;
  },

  list: async (params?: { page?: number; pageSize?: number }): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/exports', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>(`/exports/${id}`);
    return response.data;
  },

  getDownloadUrl: (id: string): string => {
    return `${API_BASE_URL}/exports/${id}/download`;
  },
};
