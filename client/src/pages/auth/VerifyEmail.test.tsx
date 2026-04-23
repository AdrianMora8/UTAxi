import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Esquema de validación del componente
const verifySchema = z.object({
  email: z.string().email('Email inválido'),
  code: z.string().length(6, 'Debe tener exactamente 6 dígitos'),
})

describe('VerifyEmail Component Validation', () => {
  it('accepts valid verification code (6 digits)', () => {
    const data = {
      email: 'test@uta.edu.ec',
      code: '123456',
    }
    const result = verifySchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects code that is too short (5 digits)', () => {
    const data = {
      email: 'test@uta.edu.ec',
      code: '12345',
    }
    const result = verifySchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects code that is too long (7 digits)', () => {
    const data = {
      email: 'test@uta.edu.ec',
      code: '1234567',
    }
    const result = verifySchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const data = {
      email: 'invalid-email',
      code: '123456',
    }
    const result = verifySchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('requires email to be present', () => {
    const data = {
      code: '123456',
    }
    const result = verifySchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('requires code to be present', () => {
    const data = {
      email: 'test@uta.edu.ec',
    }
    const result = verifySchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('accepts numeric code', () => {
    const data = {
      email: 'test@uta.edu.ec',
      code: '000000',
    }
    const result = verifySchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('accepts codes with leading zeros', () => {
    const data = {
      email: 'test@uta.edu.ec',
      code: '000123',
    }
    const result = verifySchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

