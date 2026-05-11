import { apiClient } from './client';

export interface TripRequest {
  id: string;
  tripId: string;
  passengerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  message?: string | null;
  rejectionCount: number;
  arrivedAt?: string | null;
  createdAt: string;
  passenger?: {
    id: string;
    fullName: string;
    career: string | null;
    reputationScore: number;
    totalTrips?: number;
    neighborhood?: string | null;
  };
  trip?: {
    id: string;
    originZone: string;
    originLat?: number | null;
    originLng?: number | null;
    destinationZone: string;
    destLat?: number | null;
    destLng?: number | null;
    departureTime: string;
    pricePerSeat: number;
    status: string;
    driver?: { id: string; fullName: string; reputationScore: number };
  };
  rating?: { id: string; score: number; comment?: string | null } | null;
  payment?: { id: string; amount: number; status: string } | null;
}

export const requestsApi = {
  getRequestsByTrip: (tripId: string) =>
    apiClient.get<{ requests: TripRequest[] }>(`/requests/trip/${tripId}`),

  createRequest: (tripId: string, message?: string) =>
    apiClient.post<{ request: TripRequest }>(`/requests/trip/${tripId}`, { message }),

  respondToRequest: (id: string, action: 'ACCEPT' | 'REJECT') =>
    apiClient.patch<{ request: TripRequest }>(`/requests/${id}/respond`, { action }),

  markArrival: (id: string, arrived: boolean) =>
    apiClient.patch<{ request: TripRequest }>(`/requests/${id}/arrival`, { arrived }),

  cancelRequest: (id: string) =>
    apiClient.delete<{ refunded: boolean; amount?: number; message: string }>(`/requests/${id}`),

  getMyRequests: () =>
    apiClient.get<{ requests: TripRequest[] }>('/requests/my'),
};
