import { describe, it, expect, vi, beforeEach } from 'vitest'

// Declarar variables en el scope global (antes de vi.mock)
let mockGet: any
let mockPatch: any
let mockPost: any

// Mock de apiClient
vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn((url: string) => mockGet(url)),
    patch: vi.fn((url: string, data: any) => mockPatch(url, data)),
    post: vi.fn((url: string, data: any) => mockPost(url, data)),
  },
}))

import { usersApi } from './users.api'

describe('UsersAPI', () => {
  beforeEach(() => {
    mockGet = vi.fn()
    mockPatch = vi.fn()
    mockPost = vi.fn()
  })

  describe('getMe', () => {
    it('fetches current user profile', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@uta.edu.ec',
        fullName: 'Test User',
        career: 'CS',
        phone: null,
        photoUrl: null,
        neighborhood: null,
        role: 'STUDENT' as const,
        status: 'ACTIVE',
        reputationScore: 5.0,
        totalTrips: 0,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        vehicle: null,
      }

      mockGet.mockResolvedValue({ data: { user: mockUser } })

      const result = await usersApi.getMe()

      expect(result.data.user).toEqual(mockUser)
      expect(mockGet).toHaveBeenCalledWith('/users/me')
    })

    it('throws error when request fails', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(usersApi.getMe()).rejects.toThrow('Network error')
    })
  })

  describe('updateMe', () => {
    it('updates user profile with partial data', async () => {
      const updateData = { fullName: 'New Name', phone: '1234567890' }
      const updatedUser = { id: 'user-1', ...updateData }

      mockPatch.mockResolvedValue({ data: { user: updatedUser } })

      const result = await usersApi.updateMe(updateData)

      expect(mockPatch).toHaveBeenCalledWith('/users/me', updateData)
      expect(result.data.user.fullName).toBe('New Name')
    })

    it('accepts empty update object', async () => {
      mockPatch.mockResolvedValue({ data: { user: {} } })

      await usersApi.updateMe({})

      expect(mockPatch).toHaveBeenCalledWith('/users/me', {})
    })
  })

  describe('createVehicle', () => {
    it('creates a new vehicle', async () => {
      const vehicleData = {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        plateNumber: 'ABC1234',
        color: 'Blanco',
      }
      const createdVehicle = { id: 'veh-1', ...vehicleData }

      mockPost.mockResolvedValue({ data: { vehicle: createdVehicle } })

      const result = await usersApi.createVehicle(vehicleData)

      expect(mockPost).toHaveBeenCalledWith('/users/me/vehicle', vehicleData)
      expect(result.data.vehicle).toEqual(createdVehicle)
    })

    it('throws error when vehicle already exists', async () => {
      const vehicleData = {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        plateNumber: 'ABC1234',
        color: 'Blanco',
      }

      mockPost.mockRejectedValue({
        response: {
          status: 409,
          data: { error: 'Ya tienes un vehículo registrado' },
        },
      })

      await expect(usersApi.createVehicle(vehicleData)).rejects.toMatchObject({
        response: { status: 409 },
      })
    })
  })

  describe('updateVehicle', () => {
    it('updates existing vehicle', async () => {
      const updateData = { color: 'Negro', year: 2021 }
      const updatedVehicle = { id: 'veh-1', ...updateData }

      mockPatch.mockResolvedValue({ data: { vehicle: updatedVehicle } })

      const result = await usersApi.updateVehicle(updateData)

      expect(mockPatch).toHaveBeenCalledWith('/users/me/vehicle', updateData)
      expect(result.data.vehicle.color).toBe('Negro')
    })

    it('throws error when vehicle does not exist', async () => {
      mockPatch.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'No tienes vehículo registrado' },
        },
      })

      await expect(usersApi.updateVehicle({ color: 'Rojo' })).rejects.toMatchObject({
        response: { status: 404 },
      })
    })
  })
})
