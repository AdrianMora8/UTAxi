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

export interface AdminUserDetail extends AdminUser {
  suspendedUntil: string | null
  phone: string | null
  neighborhood: string | null
  emailVerified: boolean
  vehicle: { brand: string; model: string; year: number; plateNumber: string; color: string } | null
  tripsAsDriver: { id: string; originZone: string; destinationZone: string; departureTime: string; status: string }[]
  ratingsReceived: { score: number; comment: string | null; raterRole: string; createdAt: string }[]
  reportsReceived: { id: string; reason: string; description: string; status: string; createdAt: string; reporter: { fullName: string } }[]
  _count: { reportsFiled: number; reportsReceived: number; tripsAsDriver: number; tripRequests: number }
}

export interface AdminTrip {
  id: string
  originZone: string
  destinationZone: string
  departureTime: string
  totalSeats: number
  availableSeats: number
  pricePerSeat: number
  status: string
  createdAt: string
  driver: { id: string; fullName: string; email: string; status: string }
  _count: { requests: number }
}

export type TripEventType =
  | 'TRIP_PUBLISHED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'TRIP_CANCELLED'
  | 'TRIP_SCHEDULE_CHANGED'
  | 'REQUEST_SENT'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_CANCELLED'
  | 'PASSENGER_NO_SHOW'

export interface TripEvent {
  id: string
  tripId: string
  type: TripEventType
  actorId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  actor: { id: string; fullName: string; email: string } | null
  trip: { id: string; originZone: string; destinationZone: string }
}

export interface AdminStats {
  users: { total: number; active: number; suspended: number }
  trips: { total: number; completed: number; cancelled: number; active: number }
  reports: { open: number; total: number }
  revenue: number
  avgReputation: number
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

  getStats: () =>
    apiClient.get<AdminStats>('/admin/stats'),

  getEvents: (params?: { tripId?: string; type?: TripEventType; page?: number; limit?: number }) =>
    apiClient.get<{ events: TripEvent[]; total: number; page: number; limit: number }>(
      '/admin/events',
      { params },
    ),

  getUserDetail: (id: string) =>
    apiClient.get<{ user: AdminUserDetail }>(`/admin/users/${id}`),

  getTrips: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ trips: AdminTrip[]; total: number; page: number; limit: number }>(
      '/admin/trips',
      { params },
    ),

  cancelTrip: (id: string) =>
    apiClient.delete<{ cancelled: boolean; refundedPassengers: number }>(`/admin/trips/${id}`),
}
