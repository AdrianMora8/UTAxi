import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Esquemas de validación del componente Profile
const updateMeSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  career: z.string().min(2).max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
  neighborhood: z.string().min(2).max(100).optional(),
})

const vehicleSchema = z.object({
  brand: z.string().min(2).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  plateNumber: z.string().min(4).max(10),
  color: z.string().min(2).max(30),
})

const updateVehicleSchema = vehicleSchema.partial()

describe('Profile Component Validation', () => {
  describe('updateMeSchema', () => {
    it('accepts valid profile update', () => {
      const data = {
        fullName: 'John Updated',
        phone: '1234567890',
        neighborhood: 'Downtown',
      }
      const result = updateMeSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('accepts empty update object', () => {
      const data = {}
      const result = updateMeSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('rejects fullName too short', () => {
      const data = { fullName: 'A' }
      const result = updateMeSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects phone too short', () => {
      const data = { phone: '123' }
      const result = updateMeSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('accepts valid career', () => {
      const data = { career: 'Computer Science' }
      const result = updateMeSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('vehicleSchema', () => {
    const validVehicle = {
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
      plateNumber: 'ABC1234',
      color: 'Blanco',
    }

    it('accepts valid vehicle data', () => {
      const result = vehicleSchema.safeParse(validVehicle)
      expect(result.success).toBe(true)
    })

    it('rejects year too old (before 1990)', () => {
      const data = { ...validVehicle, year: 1980 }
      const result = vehicleSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects year in future', () => {
      const nextYear = new Date().getFullYear() + 2
      const data = { ...validVehicle, year: nextYear }
      const result = vehicleSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('accepts current year', () => {
      const currentYear = new Date().getFullYear()
      const data = { ...validVehicle, year: currentYear }
      const result = vehicleSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('rejects short plateNumber', () => {
      const data = { ...validVehicle, plateNumber: 'AB' }
      const result = vehicleSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('accepts 4-character plateNumber', () => {
      const data = { ...validVehicle, plateNumber: 'ABCD' }
      const result = vehicleSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('rejects brand too short', () => {
      const data = { ...validVehicle, brand: 'T' }
      const result = vehicleSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects empty model', () => {
      const data = { ...validVehicle, model: '' }
      const result = vehicleSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('updateVehicleSchema (partial)', () => {
    it('accepts partial vehicle update', () => {
      const data = { color: 'Negro' }
      const result = updateVehicleSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('accepts multiple partial fields', () => {
      const data = { brand: 'Honda', color: 'Rojo', year: 2021 }
      const result = updateVehicleSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('accepts empty object', () => {
      const data = {}
      const result = updateVehicleSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('rejects invalid year in partial update', () => {
      const data = { year: 1980 }
      const result = updateVehicleSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

