import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockGet: ReturnType<typeof vi.fn>
let mockPost: ReturnType<typeof vi.fn>

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn((url: string, config?: unknown) => mockGet(url, config)),
    post: vi.fn((url: string, data?: unknown) => mockPost(url, data)),
  },
}))

import { ratingsApi } from './ratings.api'

const mockRating = {
  id: 'rat-1',
  tripRequestId: 'req-1',
  raterId: 'user-1',
  ratedId: 'user-2',
  score: 5,
  comment: 'Excelente conductor',
  raterRole: 'PASSENGER',
  createdAt: '2026-05-21T10:00:00Z',
}

describe('ratingsApi', () => {
  beforeEach(() => {
    mockGet = vi.fn()
    mockPost = vi.fn()
  })

  describe('createRating', () => {
    it('llama POST /ratings con tripRequestId y score', async () => {
      mockPost.mockResolvedValue({ data: { rating: mockRating } })
      await ratingsApi.createRating({ tripRequestId: 'req-1', score: 5 })
      expect(mockPost).toHaveBeenCalledWith('/ratings', { tripRequestId: 'req-1', score: 5 })
    })

    it('incluye el comment cuando se proporciona', async () => {
      mockPost.mockResolvedValue({ data: { rating: mockRating } })
      await ratingsApi.createRating({ tripRequestId: 'req-1', score: 4, comment: 'Muy puntual' })
      expect(mockPost).toHaveBeenCalledWith('/ratings', {
        tripRequestId: 'req-1',
        score: 4,
        comment: 'Muy puntual',
      })
    })

    it('retorna el rating creado', async () => {
      mockPost.mockResolvedValue({ data: { rating: mockRating } })
      const result = await ratingsApi.createRating({ tripRequestId: 'req-1', score: 5 })
      expect(result.data.rating.score).toBe(5)
    })

    it('propaga el error 409 si ya existe una calificación para esa solicitud', async () => {
      mockPost.mockRejectedValue({ response: { status: 409 } })
      await expect(ratingsApi.createRating({ tripRequestId: 'req-1', score: 5 })).rejects.toMatchObject({
        response: { status: 409 },
      })
    })
  })

  describe('getUserRatings', () => {
    it('llama GET /ratings/user/:userId con paginación por defecto', async () => {
      mockGet.mockResolvedValue({ data: { ratings: [mockRating], total: 1 } })
      await ratingsApi.getUserRatings('user-2')
      expect(mockGet).toHaveBeenCalledWith('/ratings/user/user-2', { params: { page: 1, limit: 10 } })
    })

    it('usa la paginación personalizada cuando se proporciona', async () => {
      mockGet.mockResolvedValue({ data: { ratings: [], total: 0 } })
      await ratingsApi.getUserRatings('user-2', 3, 5)
      expect(mockGet).toHaveBeenCalledWith('/ratings/user/user-2', { params: { page: 3, limit: 5 } })
    })

    it('retorna la lista de ratings y el total', async () => {
      mockGet.mockResolvedValue({ data: { ratings: [mockRating], total: 1 } })
      const result = await ratingsApi.getUserRatings('user-2')
      expect(result.data.ratings).toHaveLength(1)
      expect(result.data.total).toBe(1)
    })

    it('retorna lista vacía cuando el usuario no tiene ratings', async () => {
      mockGet.mockResolvedValue({ data: { ratings: [], total: 0 } })
      const result = await ratingsApi.getUserRatings('user-nuevo')
      expect(result.data.ratings).toHaveLength(0)
    })
  })
})
