import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Esquema de validación del componente
const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  fullName: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  career: z.string().max(100).optional(),
})

describe('Register Component Validation', () => {
  it('accepts valid registration data', () => {
    const data = {
      email: 'newuser@uta.edu.ec',
      password: 'Password123!',
      fullName: 'John Doe',
      career: 'Computer Science',
    }
    const result = registerSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('accepts registration without career', () => {
    const data = {
      email: 'newuser@uta.edu.ec',
      password: 'Password123!',
      fullName: 'John Doe',
    }
    const result = registerSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const data = {
      email: 'invalid-email',
      password: 'Password123!',
      fullName: 'John Doe',
    }
    const result = registerSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects weak password (less than 8 characters)', () => {
    const data = {
      email: 'test@uta.edu.ec',
      password: 'weak',
      fullName: 'John Doe',
    }
    const result = registerSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects short fullName', () => {
    const data = {
      email: 'test@uta.edu.ec',
      password: 'Password123!',
      fullName: 'A',
    }
    const result = registerSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects fullName that is too long', () => {
    const data = {
      email: 'test@uta.edu.ec',
      password: 'Password123!',
      fullName: 'A'.repeat(101),
    }
    const result = registerSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('accepts 8-character password', () => {
    const data = {
      email: 'test@uta.edu.ec',
      password: 'Pass1234',
      fullName: 'John Doe',
    }
    const result = registerSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

