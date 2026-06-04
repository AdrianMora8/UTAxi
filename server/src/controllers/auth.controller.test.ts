import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Validaciones de esquema (como en las rutas de auth)
const registerSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  career: z.string().max(100).optional(),
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
});

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

describe('AuthController Validation', () => {
  describe('registerSchema validation', () => {
    it('accepts valid registration data', () => {
      const data = {
        email: 'newuser@uta.edu.ec',
        password: 'Password123!',
        fullName: 'New User',
        career: 'Computer Science',
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('accepts registration without career', () => {
      const data = {
        email: 'newuser@uta.edu.ec',
        password: 'Password123!',
        fullName: 'New User',
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const data = {
        email: 'invalid-email',
        password: 'Password123!',
        fullName: 'Test User',
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects weak password (too short)', () => {
      const data = {
        email: 'test@uta.edu.ec',
        password: 'weak', // Less than 8 characters
        fullName: 'Test User',
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects short fullName', () => {
      const data = {
        email: 'test@uta.edu.ec',
        password: 'Password123!',
        fullName: 'A', // Less than 2 characters
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects fullName that is too long', () => {
      const data = {
        email: 'test@uta.edu.ec',
        password: 'Password123!',
        fullName: 'A'.repeat(101), // More than 100 characters
      };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('verifySchema validation', () => {
    it('accepts valid verify data', () => {
      const data = {
        email: 'test@uta.edu.ec',
        code: '123456',
      };
      const result = verifySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const data = {
        email: 'invalid-email',
        code: '123456',
      };
      const result = verifySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects code that is too short', () => {
      const data = {
        email: 'test@uta.edu.ec',
        code: '12345', // Should be exactly 6 digits
      };
      const result = verifySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects code that is too long', () => {
      const data = {
        email: 'test@uta.edu.ec',
        code: '1234567', // Should be exactly 6 digits
      };
      const result = verifySchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema validation', () => {
    it('accepts valid login data', () => {
      const data = {
        email: 'test@uta.edu.ec',
        password: 'Password123!',
      };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('accepts login with any non-empty password', () => {
      const data = {
        email: 'test@uta.edu.ec',
        password: 'a',
      };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'Password123!',
      };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const data = {
        email: 'test@uta.edu.ec',
      };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
