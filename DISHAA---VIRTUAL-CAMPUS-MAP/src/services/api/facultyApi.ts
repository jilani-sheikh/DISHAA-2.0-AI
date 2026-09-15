import type { FacultyMember } from '../../types';
import { apiRequest, buildQuery } from './client';

export interface FacultyListResponse {
  success: true;
  count: number;
  data: FacultyMember[];
}

export interface FacultyAuthResponse {
  success: true;
  message: string;
  token?: string;
  faculty: FacultyMember;
}

export interface FacultyFilterParams {
  department?: string;
  block?: string;
  floor?: number;
  roomNo?: string;
  q?: string;
}

export interface FacultyRegisterPayload {
  name: string;
  designation: string;
  department: string;
  email: string;
  password?: string;
  phone?: string;
  block: string;
  floor: number;
  roomNo: string;
}

export const facultyApi = {
  list: (filters: FacultyFilterParams = {}) =>
    apiRequest<FacultyListResponse>(`/faculty${buildQuery({
      department: filters.department && filters.department !== 'all' && filters.department !== 'All Departments' ? filters.department : undefined,
      block: filters.block,
      floor: filters.floor,
      roomNo: filters.roomNo,
      q: filters.q,
    })}`),

  login: (email: string, password: string) =>
    apiRequest<FacultyAuthResponse>('/faculty', {
      method: 'POST',
      body: { action: 'login', email, password },
      headers: { 'Content-Type': 'application/json' },
    }),

  register: (payload: FacultyRegisterPayload) =>
    apiRequest<FacultyAuthResponse>('/faculty', {
      method: 'POST',
      body: { action: 'register', ...payload },
      headers: { 'Content-Type': 'application/json' },
    }),

  update: (id: string, payload: Partial<FacultyRegisterPayload>, token?: string | null) =>
    apiRequest<{ success: true; message: string; faculty: FacultyMember }>(`/faculty/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),

  delete: (id: string, token?: string | null) =>
    apiRequest<{ success: true; message: string; deletedCount: number }>(`/faculty/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }),
};
