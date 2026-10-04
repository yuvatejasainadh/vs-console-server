import { healthClient } from './client';
import { HealthResponse } from '../types';

export const healthApi = {
  /**
   * General Service Status Check
   * Target: GET https://vs-console-server.onrender.com/health
   */
  getHealth: async (): Promise<HealthResponse> => {
    const response = await healthClient.get<HealthResponse>('/');
    return response.data;
  },

  /**
   * Process Liveness Check
   * Target: GET https://vs-console-server.onrender.com/health/live
   */
  getLive: async (): Promise<HealthResponse> => {
    const response = await healthClient.get<HealthResponse>('/live');
    return response.data;
  },

  /**
   * Multi-system Readiness Check (Application, PostgreSQL RDS, S3 Storage)
   * Target: GET https://vs-console-server.onrender.com/health/ready
   * Note: Accurately reflects true backend status (e.g. database: DISCONNECTED / CONNECTED) without faking.
   */
  getReady: async (): Promise<HealthResponse> => {
    const response = await healthClient.get<HealthResponse>('/ready');
    return response.data;
  },
};
