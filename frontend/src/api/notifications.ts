import { apiClient } from './client';
import { ApiResponse, NotificationItem } from '../types';

export const notificationsApi = {
  list: async (params?: { page?: number; pageSize?: number; read?: boolean }): Promise<ApiResponse<NotificationItem[]>> => {
    const response = await apiClient.get<ApiResponse<NotificationItem[]>>('/notifications', { params });
    return response.data;
  },

  markAsRead: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/notifications/read-all');
    return response.data;
  },
};
