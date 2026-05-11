import { apiClient } from './client';
import type { AuthUser } from '../store/authStore';

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  career?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<{ message: string }>('/auth/register', payload),

  verifyEmail: (email: string, code: string) =>
    apiClient.post<{ message: string }>('/auth/verify-email', { email, code }),

  resendCode: (email: string) =>
    apiClient.post<{ message: string }>('/auth/resend-code', { email }),

  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', payload),

  logout: () =>
    apiClient.post('/auth/logout'),

  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    apiClient.post<{ message: string }>('/auth/reset-password', { email, code, newPassword }),
};
