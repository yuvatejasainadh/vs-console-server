import { apiClient } from './client';
import { ApiResponse, AuditLog } from '../types';

export const auditApi = {
  list: async (params?: {
    page?: number;
    pageSize?: number;
    action?: string;
    actorId?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<AuditLog[]>> => {
    const response = await apiClient.get<ApiResponse<AuditLog[]>>('/audit', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<AuditLog>> => {
    const response = await apiClient.get<ApiResponse<AuditLog>>(`/audit/${id}`);
    return response.data;
  },
};
