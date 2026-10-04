import { apiClient } from './client';
import { ApiResponse, WorkItem, DeveloperDocument } from '../types';

export interface CreateWorkData {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: string;
}

export interface UpdateWorkData {
  title?: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const workApi = {
  list: async (params?: { page?: number; pageSize?: number; status?: string; assignedTo?: string; priority?: string; search?: string }): Promise<ApiResponse<WorkItem[]>> => {
    const response = await apiClient.get<ApiResponse<WorkItem[]>>('/work', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<WorkItem>> => {
    const response = await apiClient.get<ApiResponse<WorkItem>>(`/work/${id}`);
    return response.data;
  },

  create: async (data: CreateWorkData): Promise<ApiResponse<WorkItem>> => {
    const response = await apiClient.post<ApiResponse<WorkItem>>('/work', data);
    return response.data;
  },

  update: async (id: string, data: UpdateWorkData): Promise<ApiResponse<WorkItem>> => {
    const response = await apiClient.patch<ApiResponse<WorkItem>>(`/work/${id}`, data);
    return response.data;
  },

  accept: async (id: string): Promise<ApiResponse<WorkItem>> => {
    const response = await apiClient.post<ApiResponse<WorkItem>>(`/work/${id}/accept`);
    return response.data;
  },

  start: async (id: string): Promise<ApiResponse<WorkItem>> => {
    const response = await apiClient.post<ApiResponse<WorkItem>>(`/work/${id}/start`);
    return response.data;
  },

  submitDocumentation: async (id: string): Promise<ApiResponse<WorkItem>> => {
    const response = await apiClient.post<ApiResponse<WorkItem>>(`/work/${id}/submit-documentation`);
    return response.data;
  },

  complete: async (id: string): Promise<ApiResponse<WorkItem>> => {
    const response = await apiClient.post<ApiResponse<WorkItem>>(`/work/${id}/complete`);
    return response.data;
  },

  assign: async (id: string, assignedTo: string): Promise<ApiResponse<WorkItem>> => {
    const response = await apiClient.post<ApiResponse<WorkItem>>(`/work/${id}/assign`, { assignedTo });
    return response.data;
  },

  getHistory: async (id: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/work/${id}/history`);
    return response.data;
  },

  createDocumentationForWork: async (workId: string, docData: Partial<DeveloperDocument>): Promise<ApiResponse<DeveloperDocument>> => {
    const response = await apiClient.post<ApiResponse<DeveloperDocument>>(`/work/${workId}/documentation`, docData);
    return response.data;
  },

  getDocumentationForWork: async (workId: string): Promise<ApiResponse<DeveloperDocument>> => {
    const response = await apiClient.get<ApiResponse<DeveloperDocument>>(`/work/${workId}/documentation`);
    return response.data;
  },
};
