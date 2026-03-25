import { apiClient } from './client'
import type { AuthUser } from '@/store/authStore'

export interface RegisterPayload {
  email: string
  password: string
  fullName: string
  career: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<{ message: string }>('/auth/register', payload),

  verifyEmail: (email: string, code: string) =>
    apiClient.post<{ message: string }>('/auth/verify-email', { email, code }),

  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', payload),

  refresh: () =>
    apiClient.post<{ accessToken: string }>('/auth/refresh'),

  logout: () =>
    apiClient.post('/auth/logout'),
}
