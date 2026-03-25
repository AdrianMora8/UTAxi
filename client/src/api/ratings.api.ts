import { apiClient } from './client'

export interface Rating {
  id: string
  tripRequestId: string
  raterId: string
  ratedId: string
  score: number
  comment: string | null
  raterRole: string
  createdAt: string
}

export const ratingsApi = {
  createRating: (data: { tripRequestId: string; score: number; comment?: string }) =>
    apiClient.post<{ rating: Rating }>('/ratings', data),

  getUserRatings: (userId: string, page = 1, limit = 10) =>
    apiClient.get<{ ratings: Rating[]; total: number }>(`/ratings/user/${userId}`, {
      params: { page, limit },
    }),
}
