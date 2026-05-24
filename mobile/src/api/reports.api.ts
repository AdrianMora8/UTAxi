import { apiClient } from './client';

export type ReportReason =
  | 'INAPPROPRIATE_BEHAVIOR'
  | 'NO_SHOW'
  | 'FRAUD'
  | 'UNSAFE_DRIVING'
  | 'HARASSMENT'
  | 'OTHER';

export const reportsApi = {
  createReport: (data: { reportedId: string; reason: ReportReason; description: string }) =>
    apiClient.post<{ report: { id: string } }>('/reports', data),

  getMyReports: () =>
    apiClient.get<{ reports: any[] }>('/reports/my'),
};
