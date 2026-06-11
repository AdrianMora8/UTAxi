import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Esquema de validación del componente (mismo que en el componente)
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

describe('Login Component Validation', () => {
  it('accepts valid email and password', () => {
    const data = {
      email: 'test@uta.edu.ec',
      password: 'password123',
    }
    const result = loginSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const data = {
      email: 'invalid-email',
      password: 'password123',
    }
    const result = loginSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects missing password', () => {
    const data = {
      email: 'test@uta.edu.ec',
      password: '',
    }
    const result = loginSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('accepts any non-empty password', () => {
    const data = {
      email: 'test@uta.edu.ec',
      password: 'a',
    }
    const result = loginSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

