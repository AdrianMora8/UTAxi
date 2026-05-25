import { apiClient } from './client';

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  concept: 'TOPUP' | 'PAYMENT' | 'REFUND' | 'CANCELLATION_FEE' | 'TRIP_EARNING';
  description?: string | null;
  relatedRequestId?: string | null;
  createdAt: string;
}

export interface PassengerPaymentStatus {
  requestId: string;
  passengerName: string;
  paymentStatus: 'PENDING' | 'CONFIRMED' | 'FAILED' | null;
  paymentMethod: 'CARD' | 'WALLET' | 'CASH' | null;
  amount: number | null;
}

export interface WalletInfo {
  walletBalance: number;
  pendingBalance: number;
  transactions: WalletTransaction[];
}

export interface CreateIntentResponse {
  clientSecret: string;
  paymentId: string;
  amount: number;
}

export const paymentsApi = {
  createIntent: (tripRequestId: string) =>
    apiClient.post<CreateIntentResponse>('/payments/create-intent', { tripRequestId }),

  getPayment: (tripRequestId: string) =>
    apiClient.get<{ payment: { status: string } }>(`/payments/${tripRequestId}`),

  confirmCardPayment: (tripRequestId: string) =>
    apiClient.post<{ amount: number }>('/payments/confirm-card', { tripRequestId }),

  payWithWallet: (tripRequestId: string) =>
    apiClient.post<{ amount: number }>('/payments/pay/wallet', { tripRequestId }),

  getWallet: () =>
    apiClient.get<WalletInfo>('/payments/wallet'),

  topUp: (amount: number) =>
    apiClient.post<{ walletBalance: number }>('/payments/wallet/topup', { amount }),

  markAsCash: (tripRequestId: string) =>
    apiClient.post<{ amount: number }>('/payments/pay/cash', { tripRequestId }),

  confirmCashPayment: (tripRequestId: string) =>
    apiClient.post<{ amount: number }>('/payments/confirm-cash', { tripRequestId }),

  getTripPaymentStatus: (tripId: string) =>
    apiClient.get<{ passengers: PassengerPaymentStatus[] }>(`/payments/trip/${tripId}/status`),
};
