import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const { mockGetMyRequests, mockGetPayment, mockSimulateConfirm, mockNavigate } = vi.hoisted(() => ({
  mockGetMyRequests: vi.fn(),
  mockGetPayment: vi.fn(),
  mockSimulateConfirm: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/api/requests.api', () => ({
  requestsApi: { getMyRequests: mockGetMyRequests },
}))

vi.mock('@/api/payments.api', () => ({
  paymentsApi: {
    getPayment: mockGetPayment,
    simulateConfirm: mockSimulateConfirm,
  },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useParams: () => ({ requestId: 'req-001' }),
    useNavigate: () => mockNavigate,
  }
})

import Payment from './Payment'

const mockRequest = {
  id: 'req-001',
  status: 'ACCEPTED',
  createdAt: '2026-06-01T07:00:00.000Z',
  trip: {
    id: 'trip-001',
    originZone: 'Campus Huachi',
    destinationZone: 'Sector Los Pinos',
    departureTime: '2026-06-01T08:00:00.000Z',
    pricePerSeat: '2.50',
    driverId: 'driver-1',
    driver: { fullName: 'Luis Vera', id: 'driver-1' },
  },
  passenger: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: request found, no existing payment (404)
  mockGetMyRequests.mockResolvedValue({ data: { requests: [mockRequest] } })
  mockGetPayment.mockRejectedValue({ response: { status: 404 } })
})

describe('Payment — solicitud no encontrada', () => {
  it('muestra "Solicitud no encontrada." cuando el requestId no existe', async () => {
    mockGetMyRequests.mockResolvedValue({ data: { requests: [] } })

    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByText('Solicitud no encontrada.')).toBeInTheDocument()
    )
  })

  it('muestra el link "← Volver a mis solicitudes" cuando no se encuentra', async () => {
    mockGetMyRequests.mockResolvedValue({ data: { requests: [] } })

    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByRole('link', { name: '← Volver a mis solicitudes' })).toBeInTheDocument()
    )
  })
})

describe('Payment — formulario de pago (no pagado)', () => {
  it('muestra el heading "Confirmar Pago"', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Confirmar Pago' })).toBeInTheDocument()
    )
  })

  it('muestra el label "Número de Tarjeta"', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByText('Número de Tarjeta')).toBeInTheDocument()
    )
  })

  it('muestra el label "Titular de la Tarjeta"', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByText('Titular de la Tarjeta')).toBeInTheDocument()
    )
  })

  it('muestra el label "Vencimiento"', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByText('Vencimiento')).toBeInTheDocument()
    )
  })

  it('muestra el label "CVV"', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByText('CVV')).toBeInTheDocument()
    )
  })

  it('muestra el botón "Confirmar Pago"', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Confirmar Pago/i })).toBeInTheDocument()
    )
  })

  it('muestra el link "Cancelar Transacción"', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Cancelar Transacción' })).toBeInTheDocument()
    )
  })

  it('muestra el disclaimer de entorno de demostración', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByText(/Entorno de demostración/i)).toBeInTheDocument()
    )
  })

  it('muestra el origen y destino del viaje', async () => {
    render(<Payment />)

    await waitFor(() => {
      expect(screen.getByText('Campus Huachi')).toBeInTheDocument()
      expect(screen.getByText('Sector Los Pinos')).toBeInTheDocument()
    })
  })

  it('muestra el precio del asiento', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByText('$2.50')).toBeInTheDocument()
    )
  })
})

describe('Payment — ya pagado', () => {
  it('muestra "¡Pago Confirmado!" cuando el pago ya existe', async () => {
    mockGetPayment.mockResolvedValue({
      data: { payment: { status: 'CONFIRMED', id: 'pay-001' } },
    })

    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: '¡Pago Confirmado!' })).toBeInTheDocument()
    )
  })

  it('muestra el link "Ver mis solicitudes" en estado ya pagado', async () => {
    mockGetPayment.mockResolvedValue({
      data: { payment: { status: 'CONFIRMED', id: 'pay-001' } },
    })

    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Ver mis solicitudes' })).toBeInTheDocument()
    )
  })
})

describe('Payment — confirmar pago', () => {
  it('muestra "¡Pago Confirmado!" tras confirmar exitosamente', async () => {
    const user = userEvent.setup()
    mockSimulateConfirm.mockResolvedValue({})

    render(<Payment />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Confirmar Pago/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Confirmar Pago/i }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: '¡Pago Confirmado!' })).toBeInTheDocument()
    )
  })

  it('llama paymentsApi.simulateConfirm al hacer click en Confirmar Pago', async () => {
    const user = userEvent.setup()
    mockSimulateConfirm.mockResolvedValue({})

    render(<Payment />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Confirmar Pago/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Confirmar Pago/i }))

    await waitFor(() => expect(mockSimulateConfirm).toHaveBeenCalledTimes(1))
  })

  it('muestra error del servidor cuando la mutación falla', async () => {
    const user = userEvent.setup()
    mockSimulateConfirm.mockRejectedValue({
      response: { data: { message: 'Pago rechazado por el banco' } },
    })

    render(<Payment />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Confirmar Pago/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Confirmar Pago/i }))

    await waitFor(() =>
      expect(screen.getByText('Pago rechazado por el banco')).toBeInTheDocument()
    )
  })

  it('muestra error genérico cuando el servidor no retorna mensaje', async () => {
    const user = userEvent.setup()
    mockSimulateConfirm.mockRejectedValue(new Error('Network error'))

    render(<Payment />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Confirmar Pago/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Confirmar Pago/i }))

    await waitFor(() =>
      expect(screen.getByText('Error al procesar el pago')).toBeInTheDocument()
    )
  })
})
