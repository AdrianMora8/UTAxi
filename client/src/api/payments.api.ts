import { apiClient } from './client'

export interface Payment {
  id: string
  tripRequestId: string
  tripId: string
  payerId: string
  amount: number
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'
  confirmedAt: string | null
  createdAt: string
}

export interface CreateIntentResponse {
  clientSecret: string
  paymentId: string
  amount: number
}

export const paymentsApi = {
  createIntent: (tripRequestId: string) =>
    apiClient.post<CreateIntentResponse>('/payments/create-intent', {
      tripRequestId,
    }),

  simulateConfirm: (tripRequestId: string) =>
    apiClient.post<{ payment: Payment; amount: number }>('/payments/simulate-confirm', {
      tripRequestId,
    }),

  getPayment: (tripRequestId: string) =>
    apiClient.get<{ payment: Payment }>(`/payments/${tripRequestId}`),
}
