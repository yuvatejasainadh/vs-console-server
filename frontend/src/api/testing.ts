import { apiClient } from './client';
import { ApiResponse, TestingObjective, TestSession, TestSubmission } from '../types';

export const testingApi = {
  // Objectives
  listObjectives: async (params?: { page?: number; pageSize?: number; status?: string; assignedTo?: string }): Promise<ApiResponse<TestingObjective[]>> => {
    const response = await apiClient.get<ApiResponse<TestingObjective[]>>('/testing/objectives', { params });
    return response.data;
  },

  getObjectiveById: async (id: string): Promise<ApiResponse<TestingObjective>> => {
    const response = await apiClient.get<ApiResponse<TestingObjective>>(`/testing/objectives/${id}`);
    return response.data;
  },

  createObjective: async (data: { title: string; description: string; targetArea: string; assignedTo?: string }): Promise<ApiResponse<TestingObjective>> => {
    const response = await apiClient.post<ApiResponse<TestingObjective>>('/testing/objectives', data);
    return response.data;
  },

  updateObjective: async (id: string, data: Partial<TestingObjective>): Promise<ApiResponse<TestingObjective>> => {
    const response = await apiClient.patch<ApiResponse<TestingObjective>>(`/testing/objectives/${id}`, data);
    return response.data;
  },

  assignObjective: async (id: string, assignedTo: string): Promise<ApiResponse<TestingObjective>> => {
    const response = await apiClient.post<ApiResponse<TestingObjective>>(`/testing/objectives/${id}/assign`, { assignedTo });
    return response.data;
  },

  // Sessions
  startSession: async (data: { objectiveId?: string; deviceId?: string; notes?: string }): Promise<ApiResponse<TestSession>> => {
    const response = await apiClient.post<ApiResponse<TestSession>>('/testing/sessions', data);
    return response.data;
  },

  getSessionById: async (id: string): Promise<ApiResponse<TestSession>> => {
    const response = await apiClient.get<ApiResponse<TestSession>>(`/testing/sessions/${id}`);
    return response.data;
  },

  updateSession: async (id: string, data: { notes?: string; logs?: string }): Promise<ApiResponse<TestSession>> => {
    const response = await apiClient.patch<ApiResponse<TestSession>>(`/testing/sessions/${id}`, data);
    return response.data;
  },

  submitSession: async (id: string, data: { outcome: string; actualResult: string; notes?: string; logs?: string }): Promise<ApiResponse<TestSession>> => {
    const response = await apiClient.post<ApiResponse<TestSession>>(`/testing/sessions/${id}/submit`, data);
    return response.data;
  },

  // Submissions
  listSubmissions: async (params?: { page?: number; pageSize?: number; status?: string; outcome?: string; testerId?: string; objectiveId?: string }): Promise<ApiResponse<TestSubmission[]>> => {
    const response = await apiClient.get<ApiResponse<TestSubmission[]>>('/testing/submissions', { params });
    return response.data;
  },

  getSubmissionById: async (id: string): Promise<ApiResponse<TestSubmission>> => {
    const response = await apiClient.get<ApiResponse<TestSubmission>>(`/testing/submissions/${id}`);
    return response.data;
  },

  createSubmission: async (data: {
    objectiveId?: string;
    deviceId?: string;
    scenarioName: string;
    description: string;
    expectedResult: string;
    actualResult: string;
    outcome: string;
    testerNotes?: string;
    sessionId?: string;
  }): Promise<ApiResponse<TestSubmission>> => {
    const response = await apiClient.post<ApiResponse<TestSubmission>>('/testing/submissions', data);
    return response.data;
  },

  updateSubmission: async (id: string, data: Partial<TestSubmission>): Promise<ApiResponse<TestSubmission>> => {
    const response = await apiClient.patch<ApiResponse<TestSubmission>>(`/testing/submissions/${id}`, data);
    return response.data;
  },

  reviewSubmission: async (id: string, data: { action: string; notes?: string }): Promise<ApiResponse<TestSubmission>> => {
    const response = await apiClient.post<ApiResponse<TestSubmission>>(`/testing/submissions/${id}/review`, data);
    return response.data;
  },

  approveSubmission: async (id: string, data?: { notes?: string }): Promise<ApiResponse<TestSubmission>> => {
    const response = await apiClient.post<ApiResponse<TestSubmission>>(`/testing/submissions/${id}/approve`, data);
    return response.data;
  },

  rejectSubmission: async (id: string, data: { reason: string }): Promise<ApiResponse<TestSubmission>> => {
    const response = await apiClient.post<ApiResponse<TestSubmission>>(`/testing/submissions/${id}/reject`, data);
    return response.data;
  },

  requestRetest: async (id: string, data: { instructions: string }): Promise<ApiResponse<TestSubmission>> => {
    const response = await apiClient.post<ApiResponse<TestSubmission>>(`/testing/submissions/${id}/request-retest`, data);
    return response.data;
  },
};
