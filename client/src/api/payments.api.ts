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

export interface WalletTransaction {
  id: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  concept: 'TOPUP' | 'PAYMENT' | 'REFUND' | 'CANCELLATION_FEE' | 'TRIP_EARNING'
  description: string
  createdAt: string
}

export interface WalletInfo {
  walletBalance: number
  pendingBalance: number
  transactions: WalletTransaction[]
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

  getWallet: () =>
    apiClient.get<WalletInfo>('/payments/wallet'),

  topUp: (amount: number) =>
    apiClient.post<{ walletBalance: number }>('/payments/wallet/topup', { amount }),

  payWithWallet: (tripRequestId: string) =>
    apiClient.post<{ amount: number }>('/payments/pay/wallet', { tripRequestId }),
}
