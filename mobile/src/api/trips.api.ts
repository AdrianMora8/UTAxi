import { apiClient } from './client';

export interface TripDriver {
  id: string;
  fullName: string;
  reputationScore: number;
  career?: string;
  photoUrl?: string | null;
  vehicle?: {
    brand: string;
    model: string;
    year?: number;
    color: string;
    plateNumber?: string;
  } | null;
}

export interface Trip {
  id: string;
  driverId: string;
  originZone: string;
  destinationZone: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  notes?: string | null;
  rules?: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  driver: TripDriver;
}

export interface GetTripsFilters {
  destinationZone?: string;
  driverId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface GetTripsResponse {
  trips: Trip[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTripPayload {
  originZone: string;
  destinationZone: string;
  departureTime: string;
  totalSeats: number;
  pricePerSeat: number;
  notes?: string;
  rules?: string;
}

export const tripsApi = {
  getTrips: (filters: GetTripsFilters = {}) =>
    apiClient.get<GetTripsResponse>('/trips', { params: filters }),

  getTripById: (id: string) =>
    apiClient.get<{ trip: Trip }>(`/trips/${id}`),

  createTrip: (data: CreateTripPayload) =>
    apiClient.post<{ trip: Trip }>('/trips', data),

  updateTripStatus: (id: string, status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') =>
    apiClient.patch<{ trip: Trip }>(`/trips/${id}/status`, { status }),

  getMyTrips: (driverId: string) =>
    apiClient.get<GetTripsResponse>('/trips', { params: { driverId, limit: 20 } }),
};
