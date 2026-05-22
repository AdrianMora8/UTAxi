import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const { mockGetMyRequests, mockCancelRequest, mockNavigate } = vi.hoisted(() => ({
  mockGetMyRequests: vi.fn(),
  mockCancelRequest: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/api/requests.api', () => ({
  requestsApi: {
    getMyRequests: mockGetMyRequests,
    cancelRequest: mockCancelRequest,
    createRequest: vi.fn(),
  },
}))

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}))

vi.mock('@/components/ratings/RatingModal', () => ({
  default: ({ driverName, onClose }: { driverName: string; onClose: () => void }) => (
    <div data-testid="rating-modal">
      <span>{driverName}</span>
      <button onClick={onClose}>Cerrar modal</button>
    </div>
  ),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import MyRequests from './MyRequests'

const mockDriver = {
  id: 'driver-1',
  fullName: 'Luis Vera',
  reputationScore: 4.8,
}

const makeRequest = (overrides: Record<string, unknown> = {}) => ({
  id: 'req-001',
  status: 'PENDING',
  createdAt: '2026-06-01T07:00:00.000Z',
  rating: null,
  payment: null,
  rejectionCount: null,
  trip: {
    id: 'trip-001',
    originZone: 'Campus Huachi',
    destinationZone: 'Sector Los Pinos',
    departureTime: '2026-06-01T08:00:00.000Z',
    pricePerSeat: '2.50',
    driverId: 'driver-1',
    driver: mockDriver,
  },
  passenger: null,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMyRequests.mockResolvedValue({ data: { requests: [] } })
  mockCancelRequest.mockResolvedValue({})
})

describe('MyRequests — renderizado', () => {
  it('muestra el label "Panel de Pasajero"', async () => {
    render(<MyRequests />)
    await waitFor(() => expect(screen.getByText('Panel de Pasajero')).toBeInTheDocument())
  })

  it('muestra el heading "Mis Solicitudes"', async () => {
    render(<MyRequests />)
    await waitFor(() => expect(screen.getByText('Mis Solicitudes')).toBeInTheDocument())
  })

  it('muestra los botones de tab Activas e Historial', async () => {
    render(<MyRequests />)
    expect(screen.getByRole('button', { name: 'Activas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Historial' })).toBeInTheDocument()
  })

  it('muestra el sidebar U-Wallet con "Saldo U-Wallet"', async () => {
    render(<MyRequests />)
    await waitFor(() => expect(screen.getByText('Saldo U-Wallet')).toBeInTheDocument())
  })

  it('muestra el botón "Recargar Saldo"', async () => {
    render(<MyRequests />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Recargar Saldo' })).toBeInTheDocument())
  })
})

describe('MyRequests — tab Activas vacía', () => {
  it('muestra "No tienes viajes activos" cuando no hay solicitudes', async () => {
    render(<MyRequests />)
    await waitFor(() =>
      expect(screen.getByText('No tienes viajes activos')).toBeInTheDocument()
    )
  })

  it('muestra el link "Buscar Viaje" hacia /trips en estado vacío', async () => {
    render(<MyRequests />)
    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Buscar Viaje' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/trips')
    })
  })
})

describe('MyRequests — tab Historial vacía', () => {
  it('muestra "Sin viajes completados" en el historial vacío', async () => {
    const user = userEvent.setup()
    render(<MyRequests />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Historial' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Historial' }))

    await waitFor(() =>
      expect(screen.getByText('Sin viajes completados')).toBeInTheDocument()
    )
  })
})

describe('MyRequests — solicitud PENDIENTE', () => {
  beforeEach(() => {
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'PENDING' })] },
    })
  })

  it('muestra el badge "PENDIENTE"', async () => {
    render(<MyRequests />)
    await waitFor(() => expect(screen.getByText('PENDIENTE')).toBeInTheDocument())
  })

  it('muestra el botón "Cancelar Solicitud"', async () => {
    render(<MyRequests />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancelar Solicitud' })).toBeInTheDocument()
    )
  })

  it('llama cancelRequest al hacer click en "Cancelar Solicitud"', async () => {
    const user = userEvent.setup()
    mockGetMyRequests.mockResolvedValue({
      data: { requests: [makeRequest({ status: 'PENDING', id: 'req-001' })] },
    })
    render(<MyRequests />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar Solicitud' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Cancelar Solicitud' }))

    await waitFor(() => expect(mockCancelRequest).toHaveBeenCalledWith('req-001'))
  })
})

describe('MyRequests — solicitud ACEPTADA sin pago', () => {
  beforeEach(() => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [makeRequest({ status: 'ACCEPTED', payment: null })],
      },
    })
  })

  it('muestra el badge "ACEPTADO"', async () => {
    render(<MyRequests />)
    await waitFor(() => expect(screen.getByText('ACEPTADO')).toBeInTheDocument())
  })

  it('muestra el botón "Pagar Ahora"', async () => {
    render(<MyRequests />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pagar Ahora' })).toBeInTheDocument()
    )
  })

  it('"Pagar Ahora" navega a /pay/:requestId', async () => {
    const user = userEvent.setup()
    render(<MyRequests />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pagar Ahora' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Pagar Ahora' }))

    expect(mockNavigate).toHaveBeenCalledWith('/pay/req-001')
  })
})

describe('MyRequests — solicitud ACEPTADA con pago confirmado', () => {
  it('muestra "Pago Confirmado" en lugar del botón Pagar Ahora', async () => {
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [
          makeRequest({ status: 'ACCEPTED', payment: { status: 'CONFIRMED' } }),
        ],
      },
    })
    render(<MyRequests />)
    await waitFor(() => expect(screen.getByText('Pago Confirmado')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Pagar Ahora' })).not.toBeInTheDocument()
  })
})

describe('MyRequests — solicitud COMPLETADA', () => {
  it('muestra el badge "COMPLETADO" en tab Historial', async () => {
    const user = userEvent.setup()
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [makeRequest({ status: 'COMPLETED', rating: null })],
      },
    })
    render(<MyRequests />)

    await user.click(screen.getByRole('button', { name: 'Historial' }))
    await waitFor(() => expect(screen.getByText('COMPLETADO')).toBeInTheDocument())
  })

  it('muestra el botón "Calificar" cuando no hay rating', async () => {
    const user = userEvent.setup()
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [makeRequest({ status: 'COMPLETED', rating: null })],
      },
    })
    render(<MyRequests />)

    await user.click(screen.getByRole('button', { name: 'Historial' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Calificar/i })).toBeInTheDocument()
    )
  })

  it('abre el RatingModal al hacer click en "Calificar"', async () => {
    const user = userEvent.setup()
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [makeRequest({ status: 'COMPLETED', rating: null })],
      },
    })
    render(<MyRequests />)

    await user.click(screen.getByRole('button', { name: 'Historial' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Calificar/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Calificar/i }))

    expect(screen.getByTestId('rating-modal')).toBeInTheDocument()
  })

  it('muestra "Calificado" cuando ya existe un rating', async () => {
    const user = userEvent.setup()
    mockGetMyRequests.mockResolvedValue({
      data: {
        requests: [makeRequest({ status: 'COMPLETED', rating: { score: 5 } })],
      },
    })
    render(<MyRequests />)

    await user.click(screen.getByRole('button', { name: 'Historial' }))
    await waitFor(() => expect(screen.getByText('Calificado')).toBeInTheDocument())
  })
})
