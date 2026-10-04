import { apiClient } from './client';
import { ApiResponse, DeveloperDocument } from '../types';

export interface ReviewDocData {
  action: 'APPROVE' | 'REQUEST_CHANGES';
  feedback?: string;
}

export const documentationApi = {
  getById: async (id: string): Promise<ApiResponse<DeveloperDocument>> => {
    const response = await apiClient.get<ApiResponse<DeveloperDocument>>(`/documentation/${id}`);
    return response.data;
  },

  update: async (id: string, data: Partial<DeveloperDocument>): Promise<ApiResponse<DeveloperDocument>> => {
    const response = await apiClient.patch<ApiResponse<DeveloperDocument>>(`/documentation/${id}`, data);
    return response.data;
  },

  submit: async (id: string): Promise<ApiResponse<DeveloperDocument>> => {
    const response = await apiClient.post<ApiResponse<DeveloperDocument>>(`/documentation/${id}/submit`);
    return response.data;
  },

  getHistory: async (id: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/documentation/${id}/history`);
    return response.data;
  },

  review: async (id: string, data: ReviewDocData): Promise<ApiResponse<DeveloperDocument>> => {
    const response = await apiClient.post<ApiResponse<DeveloperDocument>>(`/documentation/${id}/review`, data);
    return response.data;
  },
};
