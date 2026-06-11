import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const { mockGetRequestsByTrip, mockRespondToRequest, mockMarkArrival,
        mockGetTripById, mockUpdateTripStatus,
        mockUseParams, mockNavigate,
        mockCreateReport } = vi.hoisted(() => ({
  mockGetRequestsByTrip: vi.fn(),
  mockRespondToRequest: vi.fn(),
  mockMarkArrival: vi.fn(),
  mockGetTripById: vi.fn(),
  mockUpdateTripStatus: vi.fn(),
  mockUseParams: vi.fn(() => ({ id: 'trip-1' })),
  mockNavigate: vi.fn(),
  mockCreateReport: vi.fn(),
}))

vi.mock('@/api/requests.api', () => ({
  requestsApi: {
    getRequestsByTrip: mockGetRequestsByTrip,
    respondToRequest: mockRespondToRequest,
    markArrival: mockMarkArrival,
  },
}))

vi.mock('@/api/trips.api', () => ({
  tripsApi: {
    getTripById: mockGetTripById,
    updateTripStatus: mockUpdateTripStatus,
  },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useParams: mockUseParams, useNavigate: () => mockNavigate }
})

vi.mock('@/components/map/RouteMap', () => ({
  default: () => <div data-testid="route-map" />,
}))

vi.mock('@/components/ratings/RatingModal', () => ({
  default: ({ driverName, onClose }: { driverName: string; onClose: () => void }) => (
    <div data-testid="rating-modal">
      <span>{driverName}</span>
      <button onClick={onClose}>Cerrar</button>
    </div>
  ),
}))

vi.mock('@/api/reports.api', () => ({
  reportsApi: {
    createReport: mockCreateReport,
  },
}))

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}))

import ManageRequests from './ManageRequests'

function makeTripResponse(status = 'SCHEDULED') {
  return {
    data: {
      trip: {
        id: 'trip-1', driverId: 'driver-1', originZone: 'Campus Huachi',
        destinationZone: 'Mercado Central',
        departureTime: '2026-06-01T08:00:00Z',
        totalSeats: 4, availableSeats: 3, pricePerSeat: 0.5, status,
        notes: null, rules: null,
        driver: { id: 'driver-1', fullName: 'Carlos', reputationScore: 4.8, totalTrips: 10, vehicle: null, career: null },
        originLat: -1.25, originLng: -78.62, destLat: -1.26, destLng: -78.63,
      },
    },
  }
}

function makePendingRequest(id = 'req-1', passengerName = 'Ana López') {
  return {
    id,
    status: 'PENDING',
    message: null,
    createdAt: '2026-06-01T07:00:00Z',
    arrivedAt: null,
    rejectionCount: 0,
    rating: null,
    passenger: { id: 'p1', fullName: passengerName, career: 'Ingeniería', reputationScore: 4.5 },
  }
}

function makeAcceptedRequest(id = 'req-2', passengerName = 'Luis Vera', arrived = false) {
  return {
    id,
    status: 'ACCEPTED',
    message: null,
    createdAt: '2026-06-01T07:00:00Z',
    arrivedAt: arrived ? '2026-06-01T08:05:00Z' : null,
    rejectionCount: 0,
    rating: null,
    passenger: { id: 'p2', fullName: passengerName, career: 'Medicina', reputationScore: 4.2 },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTripById.mockResolvedValue(makeTripResponse())
  mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [] } })
  mockRespondToRequest.mockResolvedValue({})
  mockMarkArrival.mockResolvedValue({})
  mockUpdateTripStatus.mockResolvedValue({})
  mockCreateReport.mockResolvedValue({})
})

describe('ManageRequests — estado vacío', () => {
  it('muestra "No hay solicitudes pendientes." cuando no hay solicitudes', async () => {
    render(<ManageRequests />)
    await waitFor(() =>
      expect(screen.getByText('No hay solicitudes pendientes.')).toBeInTheDocument()
    )
  })

  it('muestra "Aún no hay pasajeros confirmados." cuando no hay aceptados', async () => {
    render(<ManageRequests />)
    await waitFor(() =>
      expect(screen.getByText('Aún no hay pasajeros confirmados.')).toBeInTheDocument()
    )
  })

  it('muestra el encabezado del viaje con las zonas', async () => {
    render(<ManageRequests />)
    await waitFor(() =>
      expect(screen.getByText('Campus Huachi → Mercado Central')).toBeInTheDocument()
    )
  })
})

describe('ManageRequests — solicitudes pendientes', () => {
  it('renderiza la tarjeta del pasajero con Aceptar y Declinar', async () => {
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makePendingRequest()] } })
    render(<ManageRequests />)

    await waitFor(() => {
      expect(screen.getByText('Ana López')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Aceptar/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Declinar/i })).toBeInTheDocument()
    })
  })

  it('llama respondToRequest con ACCEPT al hacer clic en Aceptar', async () => {
    const user = userEvent.setup()
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makePendingRequest('req-1')] } })
    render(<ManageRequests />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Aceptar/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Aceptar/i }))

    await waitFor(() =>
      expect(mockRespondToRequest).toHaveBeenCalledWith('req-1', 'ACCEPT')
    )
  })

  it('llama respondToRequest con REJECT al hacer clic en Declinar', async () => {
    const user = userEvent.setup()
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makePendingRequest('req-1')] } })
    render(<ManageRequests />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Declinar/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Declinar/i }))

    await waitFor(() =>
      expect(mockRespondToRequest).toHaveBeenCalledWith('req-1', 'REJECT')
    )
  })
})

describe('ManageRequests — pasajeros confirmados', () => {
  it('muestra el pasajero aceptado con botón Marcar llegada', async () => {
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makeAcceptedRequest()] } })
    render(<ManageRequests />)

    await waitFor(() => {
      expect(screen.getByText('Luis Vera')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Marcar llegada/i })).toBeInTheDocument()
    })
  })

  it('muestra botón Calificar para pasajero sin rating', async () => {
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makeAcceptedRequest()] } })
    render(<ManageRequests />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Calificar/i })).toBeInTheDocument()
    )
  })

  it('abre el RatingModal al hacer clic en Calificar', async () => {
    const user = userEvent.setup()
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makeAcceptedRequest('req-2', 'Luis Vera')] } })
    render(<ManageRequests />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Calificar/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Calificar/i }))

    await waitFor(() =>
      expect(screen.getByTestId('rating-modal')).toBeInTheDocument()
    )
  })
})

describe('ManageRequests — reportar pasajero', () => {
  it('muestra el botón de reportar (flag) para pasajeros aceptados', async () => {
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makeAcceptedRequest()] } })
    render(<ManageRequests />)

    await waitFor(() =>
      expect(screen.getByTitle('Reportar pasajero')).toBeInTheDocument()
    )
  })

  it('abre el modal de reporte al hacer clic en el botón flag', async () => {
    const user = userEvent.setup()
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makeAcceptedRequest('req-2', 'Luis Vera')] } })
    render(<ManageRequests />)

    await waitFor(() => expect(screen.getByTitle('Reportar pasajero')).toBeInTheDocument())
    await user.click(screen.getByTitle('Reportar pasajero'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enviar Reporte/i })).toBeInTheDocument()
      expect(screen.getByText(/Reporte sobre/i)).toBeInTheDocument()
    })
  })

  it('muestra toast de error si la descripción tiene menos de 10 caracteres', async () => {
    const user = userEvent.setup()
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makeAcceptedRequest()] } })
    render(<ManageRequests />)

    await waitFor(() => expect(screen.getByTitle('Reportar pasajero')).toBeInTheDocument())
    await user.click(screen.getByTitle('Reportar pasajero'))

    await waitFor(() => expect(screen.getByText('Enviar Reporte')).toBeInTheDocument())
    const textarea = screen.getByPlaceholderText(/Describe lo que ocurrió/i)
    await user.type(textarea, 'corta')
    await user.click(screen.getByRole('button', { name: /Enviar Reporte/i }))

    await waitFor(() =>
      expect(screen.getByText(/al menos 10 caracteres/i)).toBeInTheDocument()
    )
    expect(mockCreateReport).not.toHaveBeenCalled()
  })

  it('llama reportsApi.createReport con los datos correctos al enviar', async () => {
    const user = userEvent.setup()
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makeAcceptedRequest('req-2', 'Luis Vera')] } })
    render(<ManageRequests />)

    await waitFor(() => expect(screen.getByTitle('Reportar pasajero')).toBeInTheDocument())
    await user.click(screen.getByTitle('Reportar pasajero'))

    await waitFor(() => expect(screen.getByText('Enviar Reporte')).toBeInTheDocument())
    const textarea = screen.getByPlaceholderText(/Describe lo que ocurrió/i)
    await user.type(textarea, 'Conducta inapropiada durante el viaje compartido')
    await user.click(screen.getByRole('button', { name: /Enviar Reporte/i }))

    await waitFor(() => expect(mockCreateReport).toHaveBeenCalledTimes(1))
    const fd = mockCreateReport.mock.calls[0][0] as FormData
    expect(fd.get('reportedId')).toBe('p2')
    expect(fd.get('reason')).toBe('INAPPROPRIATE_BEHAVIOR')
    expect(fd.get('description')).toBe('Conducta inapropiada durante el viaje compartido')
  })

  it('cierra el modal y muestra toast de éxito tras enviar el reporte', async () => {
    const user = userEvent.setup()
    mockGetRequestsByTrip.mockResolvedValue({ data: { requests: [makeAcceptedRequest()] } })
    render(<ManageRequests />)

    await waitFor(() => expect(screen.getByTitle('Reportar pasajero')).toBeInTheDocument())
    await user.click(screen.getByTitle('Reportar pasajero'))

    await waitFor(() => expect(screen.getByText('Enviar Reporte')).toBeInTheDocument())
    const textarea = screen.getByPlaceholderText(/Describe lo que ocurrió/i)
    await user.type(textarea, 'Conducta inapropiada durante el viaje compartido')
    await user.click(screen.getByRole('button', { name: /Enviar Reporte/i }))

    await waitFor(() => {
      expect(screen.queryByText('Enviar Reporte')).not.toBeInTheDocument()
      expect(screen.getByText('Reporte enviado correctamente')).toBeInTheDocument()
    })
  })
})

describe('ManageRequests — control del viaje', () => {
  it('muestra "Empezar Viaje" cuando el viaje está SCHEDULED', async () => {
    mockGetTripById.mockResolvedValue(makeTripResponse('SCHEDULED'))
    render(<ManageRequests />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Empezar Viaje/i })).toBeInTheDocument()
    )
  })

  it('muestra "Ir al Mapa GPS" cuando el viaje está IN_PROGRESS', async () => {
    mockGetTripById.mockResolvedValue(makeTripResponse('IN_PROGRESS'))
    render(<ManageRequests />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Ir al Mapa GPS/i })).toBeInTheDocument()
    )
  })

  it('muestra "Viaje Completado" cuando el status es COMPLETED', async () => {
    mockGetTripById.mockResolvedValue(makeTripResponse('COMPLETED'))
    render(<ManageRequests />)

    await waitFor(() =>
      expect(screen.getByText('Viaje Completado')).toBeInTheDocument()
    )
  })
})
