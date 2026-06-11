import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockGet: ReturnType<typeof vi.fn>
let mockPost: ReturnType<typeof vi.fn>
let mockPatch: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn((url: string) => mockGet(url)),
    post: vi.fn((url: string, data?: unknown) => mockPost(url, data)),
    patch: vi.fn((url: string, data?: unknown) => mockPatch(url, data)),
    delete: vi.fn((url: string) => mockDelete(url)),
  },
}))

import { requestsApi } from './requests.api'

const mockRequest = {
  id: 'req-1',
  tripId: 'trip-1',
  passengerId: 'user-2',
  status: 'PENDING' as const,
  rejectionCount: 0,
  createdAt: '2026-05-21T09:00:00Z',
}

describe('requestsApi', () => {
  beforeEach(() => {
    mockGet = vi.fn()
    mockPost = vi.fn()
    mockPatch = vi.fn()
    mockDelete = vi.fn()
  })

  describe('getRequestsByTrip', () => {
    it('llama GET /requests/trip/:tripId', async () => {
      mockGet.mockResolvedValue({ data: { requests: [mockRequest] } })
      await requestsApi.getRequestsByTrip('trip-1')
      expect(mockGet).toHaveBeenCalledWith('/requests/trip/trip-1')
    })

    it('retorna la lista de solicitudes del viaje', async () => {
      mockGet.mockResolvedValue({ data: { requests: [mockRequest] } })
      const result = await requestsApi.getRequestsByTrip('trip-1')
      expect(result.data.requests[0].tripId).toBe('trip-1')
    })
  })

  describe('createRequest', () => {
    it('llama POST /requests/trip/:tripId con el mensaje', async () => {
      mockPost.mockResolvedValue({ data: { request: mockRequest } })
      await requestsApi.createRequest('trip-1', 'Por favor, vengo de Huachi')
      expect(mockPost).toHaveBeenCalledWith('/requests/trip/trip-1', { message: 'Por favor, vengo de Huachi' })
    })

    it('llama con message undefined cuando no se proporciona mensaje', async () => {
      mockPost.mockResolvedValue({ data: { request: mockRequest } })
      await requestsApi.createRequest('trip-1')
      expect(mockPost).toHaveBeenCalledWith('/requests/trip/trip-1', { message: undefined })
    })

    it('propaga el error 409 cuando ya existe una solicitud activa', async () => {
      mockPost.mockRejectedValue({ response: { status: 409 } })
      await expect(requestsApi.createRequest('trip-1')).rejects.toMatchObject({ response: { status: 409 } })
    })
  })

  describe('respondToRequest', () => {
    it('llama PATCH /requests/:id/respond con acción ACCEPT', async () => {
      mockPatch.mockResolvedValue({ data: { request: { ...mockRequest, status: 'ACCEPTED' } } })
      await requestsApi.respondToRequest('req-1', 'ACCEPT')
      expect(mockPatch).toHaveBeenCalledWith('/requests/req-1/respond', { action: 'ACCEPT' })
    })

    it('llama PATCH /requests/:id/respond con acción REJECT', async () => {
      mockPatch.mockResolvedValue({ data: { request: { ...mockRequest, status: 'REJECTED' } } })
      await requestsApi.respondToRequest('req-1', 'REJECT')
      expect(mockPatch).toHaveBeenCalledWith('/requests/req-1/respond', { action: 'REJECT' })
    })

    it('propaga el error 403 si el usuario no es el conductor', async () => {
      mockPatch.mockRejectedValue({ response: { status: 403 } })
      await expect(requestsApi.respondToRequest('req-1', 'ACCEPT')).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
  })

  describe('markArrival', () => {
    it('llama PATCH /requests/:id/arrival con arrived=true', async () => {
      mockPatch.mockResolvedValue({ data: { request: mockRequest } })
      await requestsApi.markArrival('req-1', true)
      expect(mockPatch).toHaveBeenCalledWith('/requests/req-1/arrival', { arrived: true })
    })

    it('llama PATCH /requests/:id/arrival con arrived=false', async () => {
      mockPatch.mockResolvedValue({ data: { request: mockRequest } })
      await requestsApi.markArrival('req-1', false)
      expect(mockPatch).toHaveBeenCalledWith('/requests/req-1/arrival', { arrived: false })
    })
  })

  describe('cancelRequest', () => {
    it('llama DELETE /requests/:id', async () => {
      mockDelete.mockResolvedValue({})
      await requestsApi.cancelRequest('req-1')
      expect(mockDelete).toHaveBeenCalledWith('/requests/req-1')
    })

    it('propaga el error 404 cuando la solicitud no existe', async () => {
      mockDelete.mockRejectedValue({ response: { status: 404 } })
      await expect(requestsApi.cancelRequest('no-existe')).rejects.toMatchObject({ response: { status: 404 } })
    })
  })

  describe('getMyRequests', () => {
    it('llama GET /requests/my', async () => {
      mockGet.mockResolvedValue({ data: { requests: [mockRequest] } })
      await requestsApi.getMyRequests()
      expect(mockGet).toHaveBeenCalledWith('/requests/my')
    })

    it('retorna la lista de solicitudes del usuario', async () => {
      mockGet.mockResolvedValue({ data: { requests: [mockRequest] } })
      const result = await requestsApi.getMyRequests()
      expect(result.data.requests).toHaveLength(1)
    })
  })
})
