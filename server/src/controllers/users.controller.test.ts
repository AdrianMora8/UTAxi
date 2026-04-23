import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Validaciones de esquema (como en el controlador)
const updateMeSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  career: z.string().min(2).max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
  neighborhood: z.string().min(2).max(100).optional(),
});

const vehicleSchema = z.object({
  brand: z.string().min(2).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  plateNumber: z.string().min(4).max(10).toUpperCase(),
  color: z.string().min(2).max(30),
});

const updateVehicleSchema = vehicleSchema.partial();

describe('UsersController Validation', () => {
  describe('updateMeSchema validation', () => {
    it('accepts valid fullName', () => {
      const data = { fullName: 'John Doe' };
      const result = updateMeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects fullName too short', () => {
      const data = { fullName: 'A' };
      const result = updateMeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('accepts valid phone', () => {
      const data = { phone: '1234567' };
      const result = updateMeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects phone too short', () => {
      const data = { phone: '123' };
      const result = updateMeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('accepts empty object', () => {
      const data = {};
      const result = updateMeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('accepts partial data', () => {
      const data = { fullName: 'John', career: 'CS' };
      const result = updateMeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('vehicleSchema validation', () => {
    const validVehicle = {
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
      plateNumber: 'ABC1234',
      color: 'Blanco',
    };

    it('accepts valid vehicle data', () => {
      const result = vehicleSchema.safeParse(validVehicle);
      expect(result.success).toBe(true);
    });

    it('converts plateNumber to uppercase', () => {
      const data = { ...validVehicle, plateNumber: 'abc1234' };
      const result = vehicleSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plateNumber).toBe('ABC1234');
      }
    });

    it('rejects year too old', () => {
      const data = { ...validVehicle, year: 1980 };
      const result = vehicleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects plateNumber too short', () => {
      const data = { ...validVehicle, plateNumber: 'AB' };
      const result = vehicleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects brand too short', () => {
      const data = { ...validVehicle, brand: 'T' };
      const result = vehicleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects invalid color (too short)', () => {
      const data = { ...validVehicle, color: 'A' };
      const result = vehicleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('updateVehicleSchema validation', () => {
    it('accepts partial vehicle update', () => {
      const data = { color: 'Negro' };
      const result = updateVehicleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const data = {};
      const result = updateVehicleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('accepts multiple partial fields', () => {
      const data = { brand: 'Honda', color: 'Rojo' };
      const result = updateVehicleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects invalid data in partial', () => {
      const data = { year: 1980 };
      const result = updateVehicleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
