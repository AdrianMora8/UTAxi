import { apiClient } from './client';

export interface Vehicle {
  id?: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  photoUrl?: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionNotes?: string | null;
  rejectionCount?: number;
  blockedUntil?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  career: string | null;
  phone: string | null;
  photoUrl: string | null;
  neighborhood: string | null;
  role: 'STUDENT' | 'ADMIN';
  status: string;
  reputationScore: number;
  totalTrips: number;
  emailVerified: boolean;
  createdAt: string;
  vehicle: Vehicle | null;
}

export interface UpdateMePayload {
  fullName?: string;
  career?: string;
  phone?: string;
  neighborhood?: string;
}

export interface VehiclePayload {
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
}

export const usersApi = {
  getMe: () =>
    apiClient.get<{ user: UserProfile }>('/users/me'),

  updateMe: (data: UpdateMePayload) =>
    apiClient.patch<{ user: UserProfile }>('/users/me', data),

  createVehicle: (data: VehiclePayload) =>
    apiClient.post<{ vehicle: Vehicle }>('/users/me/vehicle', data),

  updateVehicle: (data: Partial<VehiclePayload>) =>
    apiClient.patch<{ vehicle: Vehicle }>('/users/me/vehicle', data),

  deleteVehicle: () =>
    apiClient.delete('/users/me/vehicle'),

  uploadVehiclePhoto: (uri: string) => {
    const form = new FormData();
    form.append('photo', {
      uri,
      type: 'image/jpeg',
      name: 'vehicle.jpg',
    } as any);
    return apiClient.post<{ vehicle: Vehicle }>('/users/me/vehicle/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
