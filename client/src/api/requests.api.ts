import { apiClient } from './client'

export interface TripRequest {
  id: string
  tripId: string
  passengerId: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  message?: string | null
  createdAt: string
  passenger?: {
    id: string
    fullName: string
    career: string | null
    neighborhood: string | null
    reputationScore: number
    totalTrips?: number
  }
  trip?: {
    id: string
    originZone: string
    destinationZone: string
    departureTime: string
    pricePerSeat: number
    status: string
    driver?: {
      id: string
      fullName: string
      reputationScore: number
    }
  }
}

export const requestsApi = {
  getRequestsByTrip: (tripId: string) =>
    apiClient.get<{ requests: TripRequest[] }>(`/requests/trip/${tripId}`),

  createRequest: (tripId: string, message?: string) =>
    apiClient.post<{ request: TripRequest }>(`/requests/trip/${tripId}`, { message }),

  respondToRequest: (id: string, action: 'ACCEPT' | 'REJECT') =>
    apiClient.patch<{ request: TripRequest }>(`/requests/${id}/respond`, { action }),

  cancelRequest: (id: string) =>
    apiClient.delete(`/requests/${id}`),

  getMyRequests: () =>
    apiClient.get<{ requests: TripRequest[] }>('/requests/my'),
}
