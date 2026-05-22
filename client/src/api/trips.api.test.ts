import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockGet: ReturnType<typeof vi.fn>
let mockPost: ReturnType<typeof vi.fn>
let mockPatch: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn((...args: unknown[]) => mockGet(...args)),
    post: vi.fn((...args: unknown[]) => mockPost(...args)),
    patch: vi.fn((...args: unknown[]) => mockPatch(...args)),
    delete: vi.fn((...args: unknown[]) => mockDelete(...args)),
  },
}))

import { tripsApi } from './trips.api'

const mockTrip = {
  id: 'trip-1',
  driverId: 'user-1',
  originZone: 'Huachi',
  destinationZone: 'Campus UTA',
  departureTime: '2026-05-21T08:00:00Z',
  totalSeats: 4,
  availableSeats: 3,
  pricePerSeat: 0.5,
  status: 'SCHEDULED' as const,
  driver: { id: 'user-1', fullName: 'Ana García', reputationScore: 4.8 },
}

describe('tripsApi', () => {
  beforeEach(() => {
    mockGet = vi.fn()
    mockPost = vi.fn()
    mockPatch = vi.fn()
    mockDelete = vi.fn()
  })

  describe('getTrips', () => {
    it('llama GET /trips sin filtros por defecto', async () => {
      mockGet.mockResolvedValue({ data: { trips: [], total: 0, page: 1, limit: 20 } })
      await tripsApi.getTrips()
      expect(mockGet).toHaveBeenCalledWith('/trips', { params: {} })
    })

    it('pasa los filtros como params de query', async () => {
      mockGet.mockResolvedValue({ data: { trips: [], total: 0, page: 1, limit: 5 } })
      await tripsApi.getTrips({ destinationZone: 'Huachi', limit: 5 })
      expect(mockGet).toHaveBeenCalledWith('/trips', {
        params: { destinationZone: 'Huachi', limit: 5 },
      })
    })

    it('retorna la lista de viajes', async () => {
      mockGet.mockResolvedValue({ data: { trips: [mockTrip], total: 1, page: 1, limit: 20 } })
      const result = await tripsApi.getTrips()
      expect(result.data.trips).toHaveLength(1)
      expect(result.data.trips[0].id).toBe('trip-1')
    })
  })

  describe('getTripById', () => {
    it('llama GET /trips/:id con el id correcto', async () => {
      mockGet.mockResolvedValue({ data: { trip: mockTrip } })
      await tripsApi.getTripById('trip-1')
      expect(mockGet).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('propaga el error 404 cuando no existe el viaje', async () => {
      mockGet.mockRejectedValue({ response: { status: 404 } })
      await expect(tripsApi.getTripById('no-existe')).rejects.toMatchObject({ response: { status: 404 } })
    })
  })

  describe('createTrip', () => {
    it('llama POST /trips con el payload completo', async () => {
      const payload = {
        originZone: 'Huachi',
        destinationZone: 'Campus UTA',
        departureTime: '2026-05-21T08:00:00Z',
        totalSeats: 4,
        pricePerSeat: 0.5,
      }
      mockPost.mockResolvedValue({ data: { trip: mockTrip } })
      await tripsApi.createTrip(payload)
      expect(mockPost).toHaveBeenCalledWith('/trips', payload)
    })

    it('propaga el error 400 de validación', async () => {
      mockPost.mockRejectedValue({ response: { status: 400 } })
      await expect(tripsApi.createTrip({} as never)).rejects.toMatchObject({ response: { status: 400 } })
    })
  })

  describe('getMyTrips', () => {
    it('llama GET /trips con driverId y limit=50', async () => {
      mockGet.mockResolvedValue({ data: { trips: [], total: 0, page: 1, limit: 50 } })
      await tripsApi.getMyTrips('user-1')
      expect(mockGet).toHaveBeenCalledWith('/trips', {
        params: { driverId: 'user-1', status: undefined, limit: 50 },
      })
    })

    it('incluye el filtro de status cuando se proporciona', async () => {
      mockGet.mockResolvedValue({ data: { trips: [], total: 0, page: 1, limit: 50 } })
      await tripsApi.getMyTrips('user-1', 'COMPLETED')
      expect(mockGet).toHaveBeenCalledWith('/trips', {
        params: { driverId: 'user-1', status: 'COMPLETED', limit: 50 },
      })
    })
  })

  describe('updateTripStatus', () => {
    it('llama PATCH /trips/:id/status con el nuevo estado', async () => {
      mockPatch.mockResolvedValue({ data: { trip: { ...mockTrip, status: 'IN_PROGRESS' } } })
      await tripsApi.updateTripStatus('trip-1', 'IN_PROGRESS')
      expect(mockPatch).toHaveBeenCalledWith('/trips/trip-1/status', { status: 'IN_PROGRESS' })
    })
  })

  describe('cancelTrip', () => {
    it('llama DELETE /trips/:id', async () => {
      mockDelete.mockResolvedValue({ data: { trip: mockTrip } })
      await tripsApi.cancelTrip('trip-1')
      expect(mockDelete).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('propaga el error 403 cuando el usuario no es el conductor', async () => {
      mockDelete.mockRejectedValue({ response: { status: 403 } })
      await expect(tripsApi.cancelTrip('trip-1')).rejects.toMatchObject({ response: { status: 403 } })
    })
  })

  describe('updateTrip', () => {
    it('llama PATCH /trips/:id con los campos a actualizar', async () => {
      mockPatch.mockResolvedValue({ data: { trip: mockTrip } })
      await tripsApi.updateTrip('trip-1', { notes: 'Solo música tranquila' })
      expect(mockPatch).toHaveBeenCalledWith('/trips/trip-1', { notes: 'Solo música tranquila' })
    })
  })
})
