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

export interface WalletInfo {
  walletBalance: number;
  pendingBalance: number;
  transactions: WalletTransaction[];
}

export const paymentsApi = {
  payWithWallet: (tripRequestId: string) =>
    apiClient.post<{ amount: number }>('/payments/pay/wallet', { tripRequestId }),

  getWallet: () =>
    apiClient.get<WalletInfo>('/payments/wallet'),

  topUp: (amount: number) =>
    apiClient.post<{ walletBalance: number }>('/payments/wallet/topup', { amount }),
};
