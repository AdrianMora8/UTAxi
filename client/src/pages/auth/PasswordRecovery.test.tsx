import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Esquemas de validación del componente ForgotPassword
const forgotPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
})

const resetPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

describe('Password Recovery Validation', () => {
  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      const data = { email: 'user@uta.edu.ec' }
      const result = forgotPasswordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const data = { email: 'invalid-email' }
      const result = forgotPasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects empty email', () => {
      const data = { email: '' }
      const result = forgotPasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('resetPasswordSchema', () => {
    const validData = {
      email: 'user@uta.edu.ec',
      code: '123456',
      newPassword: 'NewPassword456!',
      confirmPassword: 'NewPassword456!',
    }

    it('accepts valid reset data', () => {
      const result = resetPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const data = { ...validData, email: 'invalid' }
      const result = resetPasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects code with wrong length', () => {
      const data = { ...validData, code: '12345' } // 5 digits
      const result = resetPasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects password too short', () => {
      const data = { ...validData, newPassword: 'Short1!' } // 7 chars
      const result = resetPasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects mismatched passwords', () => {
      const data = { ...validData, confirmPassword: 'DifferentPassword456!' }
      const result = resetPasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword')
      }
    })

    it('accepts exactly 8 character password', () => {
      const data = {
        ...validData,
        newPassword: 'Pass1234',
        confirmPassword: 'Pass1234',
      }
      const result = resetPasswordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})
