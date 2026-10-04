import { apiClient } from './client';
import { ApiResponse, Device } from '../types';

export interface CreateDeviceData {
  deviceName: string;
  modelNumber: string;
  manufacturer: string;
  androidVersion: string;
  notes?: string;
}

export interface UpdateDeviceData {
  deviceName?: string;
  modelNumber?: string;
  manufacturer?: string;
  androidVersion?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  notes?: string;
}

export const devicesApi = {
  list: async (params?: { page?: number; pageSize?: number; status?: string; search?: string }): Promise<ApiResponse<Device[]>> => {
    const response = await apiClient.get<ApiResponse<Device[]>>('/devices', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Device>> => {
    const response = await apiClient.get<ApiResponse<Device>>(`/devices/${id}`);
    return response.data;
  },

  create: async (data: CreateDeviceData): Promise<ApiResponse<Device>> => {
    const response = await apiClient.post<ApiResponse<Device>>('/devices', data);
    return response.data;
  },

  update: async (id: string, data: UpdateDeviceData): Promise<ApiResponse<Device>> => {
    const response = await apiClient.patch<ApiResponse<Device>>(`/devices/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<ApiResponse<Device>> => {
    const response = await apiClient.post<ApiResponse<Device>>(`/devices/${id}/deactivate`);
    return response.data;
  },
};
