import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockGet: ReturnType<typeof vi.fn>
let mockPost: ReturnType<typeof vi.fn>

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn((url: string) => mockGet(url)),
    post: vi.fn((url: string, data?: unknown) => mockPost(url, data)),
  },
}))

import { paymentsApi } from './payments.api'

const mockPayment = {
  id: 'pay-1',
  tripRequestId: 'req-1',
  tripId: 'trip-1',
  payerId: 'user-2',
  amount: 0.5,
  status: 'PENDING' as const,
  confirmedAt: null,
  createdAt: '2026-05-21T09:00:00Z',
}

describe('paymentsApi', () => {
  beforeEach(() => {
    mockGet = vi.fn()
    mockPost = vi.fn()
  })

  describe('createIntent', () => {
    it('llama POST /payments/create-intent con tripRequestId', async () => {
      mockPost.mockResolvedValue({
        data: { clientSecret: 'pi_secret', paymentId: 'pay-1', amount: 0.5 },
      })
      await paymentsApi.createIntent('req-1')
      expect(mockPost).toHaveBeenCalledWith('/payments/create-intent', { tripRequestId: 'req-1' })
    })

    it('retorna el clientSecret y el amount', async () => {
      mockPost.mockResolvedValue({
        data: { clientSecret: 'pi_secret_xyz', paymentId: 'pay-1', amount: 1.0 },
      })
      const result = await paymentsApi.createIntent('req-1')
      expect(result.data.clientSecret).toBe('pi_secret_xyz')
      expect(result.data.amount).toBe(1.0)
    })

    it('propaga el error 404 si la solicitud no existe', async () => {
      mockPost.mockRejectedValue({ response: { status: 404 } })
      await expect(paymentsApi.createIntent('no-existe')).rejects.toMatchObject({ response: { status: 404 } })
    })
  })

  describe('simulateConfirm', () => {
    it('llama POST /payments/simulate-confirm con tripRequestId', async () => {
      mockPost.mockResolvedValue({
        data: { payment: { ...mockPayment, status: 'CONFIRMED' }, amount: 0.5 },
      })
      await paymentsApi.simulateConfirm('req-1')
      expect(mockPost).toHaveBeenCalledWith('/payments/simulate-confirm', { tripRequestId: 'req-1' })
    })

    it('el pago simulado queda en estado CONFIRMED', async () => {
      mockPost.mockResolvedValue({
        data: { payment: { ...mockPayment, status: 'CONFIRMED' }, amount: 0.5 },
      })
      const result = await paymentsApi.simulateConfirm('req-1')
      expect(result.data.payment.status).toBe('CONFIRMED')
    })
  })

  describe('getPayment', () => {
    it('llama GET /payments/:tripRequestId', async () => {
      mockGet.mockResolvedValue({ data: { payment: mockPayment } })
      await paymentsApi.getPayment('req-1')
      expect(mockGet).toHaveBeenCalledWith('/payments/req-1')
    })

    it('retorna los datos del pago', async () => {
      mockGet.mockResolvedValue({ data: { payment: mockPayment } })
      const result = await paymentsApi.getPayment('req-1')
      expect(result.data.payment.tripRequestId).toBe('req-1')
    })

    it('propaga el error 404 si el pago no existe', async () => {
      mockGet.mockRejectedValue({ response: { status: 404 } })
      await expect(paymentsApi.getPayment('no-existe')).rejects.toMatchObject({ response: { status: 404 } })
    })
  })
})
