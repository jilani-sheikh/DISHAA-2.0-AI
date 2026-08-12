import type { HealthResponse } from '../../types';
import { apiRequest } from './client';

export const healthApi = {
  get: () => apiRequest<HealthResponse>('/health'),
};
