import { apiClient, API_BASE_URL } from './client';
import { ApiResponse } from '../types';

export const filesApi = {
  upload: async (file: File, submissionId: string): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('submissionId', submissionId);

    const response = await apiClient.post<ApiResponse<any>>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  listForSubmission: async (submissionId: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/files/submission/${submissionId}`);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>(`/files/${id}`);
    return response.data;
  },

  getDownloadUrl: (id: string): string => {
    return `${API_BASE_URL}/files/${id}/download`;
  },
};
