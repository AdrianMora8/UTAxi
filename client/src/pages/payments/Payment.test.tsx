import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const { mockGetMyRequests, mockGetPayment, mockCreateIntent, mockNavigate } = vi.hoisted(() => ({
  mockGetMyRequests: vi.fn(),
  mockGetPayment: vi.fn(),
  mockCreateIntent: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/api/requests.api', () => ({
  requestsApi: { getMyRequests: mockGetMyRequests },
}))

vi.mock('@/api/payments.api', () => ({
  paymentsApi: {
    getPayment: mockGetPayment,
    createIntent: mockCreateIntent,
    confirmCardPayment: vi.fn(),
  },
}))

vi.mock('./StripeWrapper', () => ({
  StripeWrapper: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-wrapper">{children}</div>,
}))

vi.mock('./CardForm', () => ({
  CardForm: () => <div data-testid="stripe-card-form">Formulario Stripe</div>,
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
  it('muestra el heading "Pagar con Tarjeta"', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Pagar con Tarjeta' })).toBeInTheDocument()
    )
  })



  it('muestra el botón "Continuar con tarjeta"', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Continuar con tarjeta/i })).toBeInTheDocument()
    )
  })

  it('muestra el link "Cancelar"', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Cancelar' })).toBeInTheDocument()
    )
  })

  it('muestra el disclaimer de entorno de demostración', async () => {
    render(<Payment />)

    await waitFor(() =>
      expect(screen.getByText(/Modo prueba/i)).toBeInTheDocument()
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
      expect(screen.getByText(/2\.50/)).toBeInTheDocument()
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

describe('Payment — iniciar pago', () => {
  it('muestra el CardForm tras crear el intent exitosamente', async () => {
    const user = userEvent.setup()
    mockCreateIntent.mockResolvedValue({ data: { clientSecret: 'secret_test' } })

    render(<Payment />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Continuar con tarjeta/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Continuar con tarjeta/i }))

    await waitFor(() =>
      expect(screen.getByTestId('stripe-card-form')).toBeInTheDocument()
    )
  })

  it('llama paymentsApi.createIntent al hacer click en Continuar con tarjeta', async () => {
    const user = userEvent.setup()
    mockCreateIntent.mockResolvedValue({ data: { clientSecret: 'secret_test' } })

    render(<Payment />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Continuar con tarjeta/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Continuar con tarjeta/i }))

    await waitFor(() => expect(mockCreateIntent).toHaveBeenCalledTimes(1))
  })

  it('muestra error del servidor cuando createIntent falla', async () => {
    const user = userEvent.setup()
    mockCreateIntent.mockRejectedValue({
      response: { data: { message: 'Monto inválido para Stripe' } },
    })

    render(<Payment />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Continuar con tarjeta/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Continuar con tarjeta/i }))

    await waitFor(() =>
      expect(screen.getByText('Monto inválido para Stripe')).toBeInTheDocument()
    )
  })

  it('muestra error genérico cuando el servidor no retorna mensaje al crear intent', async () => {
    const user = userEvent.setup()
    mockCreateIntent.mockRejectedValue(new Error('Network error'))

    render(<Payment />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Continuar con tarjeta/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Continuar con tarjeta/i }))

    await waitFor(() =>
      expect(screen.getByText('Error al iniciar el pago')).toBeInTheDocument()
    )
  })
})
