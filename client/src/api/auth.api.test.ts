import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockPost: ReturnType<typeof vi.fn>

vi.mock('@/api/client', () => ({
  apiClient: {
    post: vi.fn((...args: unknown[]) => mockPost(...args)),
  },
}))

import { authApi } from './auth.api'

describe('authApi', () => {
  beforeEach(() => {
    mockPost = vi.fn()
  })

  describe('register', () => {
    it('llama POST /auth/register con el payload correcto', async () => {
      const payload = { email: 'a@uta.edu.ec', password: 'Pass123!', fullName: 'Ana', career: 'FISE' }
      mockPost.mockResolvedValue({ data: { message: 'ok' } })
      await authApi.register(payload)
      expect(mockPost).toHaveBeenCalledWith('/auth/register', payload)
    })

    it('propaga el error del servidor', async () => {
      mockPost.mockRejectedValue({ response: { status: 409 } })
      await expect(authApi.register({} as never)).rejects.toMatchObject({ response: { status: 409 } })
    })
  })

  describe('login', () => {
    it('llama POST /auth/login y retorna accessToken + user', async () => {
      const resp = { accessToken: 'tok', user: { id: '1', email: 'a@uta.edu.ec' } }
      mockPost.mockResolvedValue({ data: resp })
      const result = await authApi.login({ email: 'a@uta.edu.ec', password: 'Pass123!' })
      expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'a@uta.edu.ec', password: 'Pass123!' })
      expect(result.data.accessToken).toBe('tok')
    })

    it('propaga el error 401 de credenciales inválidas', async () => {
      mockPost.mockRejectedValue({ response: { status: 401 } })
      await expect(authApi.login({ email: 'x@uta.edu.ec', password: 'wrong' })).rejects.toMatchObject({
        response: { status: 401 },
      })
    })
  })

  describe('verifyEmail', () => {
    it('llama POST /auth/verify-email con email y code', async () => {
      mockPost.mockResolvedValue({ data: { message: 'verified' } })
      await authApi.verifyEmail('a@uta.edu.ec', '123456')
      expect(mockPost).toHaveBeenCalledWith('/auth/verify-email', { email: 'a@uta.edu.ec', code: '123456' })
    })

    it('propaga el error 400 de código inválido', async () => {
      mockPost.mockRejectedValue({ response: { status: 400 } })
      await expect(authApi.verifyEmail('x@uta.edu.ec', '000000')).rejects.toMatchObject({
        response: { status: 400 },
      })
    })
  })

  describe('resendCode', () => {
    it('llama POST /auth/resend-code con el email', async () => {
      mockPost.mockResolvedValue({ data: { message: 'sent' } })
      await authApi.resendCode('a@uta.edu.ec')
      expect(mockPost).toHaveBeenCalledWith('/auth/resend-code', { email: 'a@uta.edu.ec' })
    })
  })

  describe('refresh', () => {
    it('llama POST /auth/refresh sin body', async () => {
      mockPost.mockResolvedValue({ data: { accessToken: 'new-tok' } })
      const result = await authApi.refresh()
      expect(mockPost).toHaveBeenCalledWith('/auth/refresh')
      expect(result.data.accessToken).toBe('new-tok')
    })
  })

  describe('logout', () => {
    it('llama POST /auth/logout', async () => {
      mockPost.mockResolvedValue({})
      await authApi.logout()
      expect(mockPost).toHaveBeenCalledWith('/auth/logout')
    })
  })

  describe('forgotPassword', () => {
    it('llama POST /auth/forgot-password con el email', async () => {
      mockPost.mockResolvedValue({ data: { message: 'sent' } })
      await authApi.forgotPassword({ email: 'a@uta.edu.ec' })
      expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@uta.edu.ec' })
    })
  })

  describe('resetPassword', () => {
    it('llama POST /auth/reset-password con email, code y newPassword', async () => {
      const payload = { email: 'a@uta.edu.ec', code: '654321', newPassword: 'NewPass123!' }
      mockPost.mockResolvedValue({ data: { message: 'reset' } })
      await authApi.resetPassword(payload)
      expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', payload)
    })

    it('propaga el error 400 de código expirado', async () => {
      mockPost.mockRejectedValue({ response: { status: 400, data: { message: 'Código expirado' } } })
      await expect(authApi.resetPassword({} as never)).rejects.toMatchObject({ response: { status: 400 } })
    })
  })
})
