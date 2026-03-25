import { apiClient } from './client'
import type { Report } from './reports.api'

export interface AdminUser {
  id: string
  fullName: string
  email: string
  role: 'STUDENT' | 'ADMIN'
  status: 'ACTIVE' | 'WARNED' | 'SUSPENDED'
  reputationScore: number
  totalTrips: number
  career: string | null
  createdAt: string
}

export interface AdminReport extends Report {
  reporter: { id: string; fullName: string }
  reported: { id: string; fullName: string }
}

export const adminApi = {
  getReports: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ reports: AdminReport[]; total: number; page: number; totalPages: number }>(
      '/admin/reports',
      { params },
    ),

  reviewReport: (id: string, data: { action: 'WARNED' | 'SUSPENDED' | 'DISMISSED'; notes?: string }) =>
    apiClient.patch<{ report: AdminReport }>(`/admin/reports/${id}`, data),

  getUsers: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ users: AdminUser[]; total: number; page: number; totalPages: number }>(
      '/admin/users',
      { params },
    ),

  updateUserStatus: (id: string, status: 'ACTIVE' | 'WARNED' | 'SUSPENDED') =>
    apiClient.patch<{ user: AdminUser }>(`/admin/users/${id}/status`, { status }),
}
