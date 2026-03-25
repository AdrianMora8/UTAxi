import { apiClient } from './client'

export type ReportReason =
  | 'INAPPROPRIATE_BEHAVIOR'
  | 'NO_SHOW'
  | 'FRAUD'
  | 'UNSAFE_DRIVING'
  | 'HARASSMENT'
  | 'OTHER'

export interface Report {
  id: string
  reporterId: string
  reportedId: string
  reason: ReportReason
  description: string
  evidenceUrls: string[]
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED'
  createdAt: string
}

export const reportsApi = {
  createReport: (formData: FormData) =>
    apiClient.post<{ report: Report }>('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getMyReports: () =>
    apiClient.get<{ reports: Report[] }>('/reports/my'),
}
