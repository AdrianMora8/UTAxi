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

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  email: string
  code: string
  newPassword: string
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

  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', payload),

  resetPassword: (payload: ResetPasswordPayload) =>
    apiClient.post<{ message: string }>('/auth/reset-password', payload),
}
