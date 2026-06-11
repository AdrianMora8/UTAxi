import { render, screen, waitFor } from '@/test/test-utils'
import { useAuthStore } from '@/store/authStore'
import type { AuthUser } from '@/store/authStore'

const { mockGetTripById, mockGetMyRequests, mockUseParams } = vi.hoisted(() => ({
  mockGetTripById: vi.fn(),
  mockGetMyRequests: vi.fn(),
  mockUseParams: vi.fn(() => ({ id: 'trip-1' })),
}))

vi.mock('@/api/trips.api', () => ({
  tripsApi: { getTripById: mockGetTripById },
}))

vi.mock('@/api/requests.api', () => ({
  requestsApi: { getMyRequests: mockGetMyRequests },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useParams: mockUseParams, useNavigate: () => vi.fn() }
})

vi.mock('@/components/map/RouteMap', () => ({
  default: () => <div data-testid="route-map" />,
}))

import TripDetail from './TripDetail'
import type { AuthUser as AU } from '@/store/authStore'

const passenger: AU = {
  id: 'passenger-1', email: 'p@uta.edu.ec', fullName: 'Pedro', role: 'STUDENT',
  status: 'ACTIVE', emailVerified: true, reputationScore: 4, photoUrl: null, career: null, phone: null, neighborhood: null,
}

const driver: AU = { ...passenger, id: 'driver-1', fullName: 'Carlos Driver' }

function makeTripData(driverId: string, availableSeats: number, status = 'SCHEDULED') {
  return {
    data: {
      trip: {
        id: 'trip-1', driverId, originZone: 'Huachi', destinationZone: 'Campus',
        departureTime: '2026-05-22T08:00:00Z', totalSeats: 4, availableSeats,
        pricePerSeat: 0.5, status, notes: null, rules: null,
        driver: { id: driverId, fullName: 'Carlos Driver', reputationScore: 4.8, totalTrips: 15, vehicle: null, career: null },
      },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, accessToken: null })
  mockGetMyRequests.mockResolvedValue({ data: { requests: [] } })
})

describe('TripDetail — botón de acción', () => {
  it('muestra "Solicitar Unirse" cuando el usuario no es el conductor y hay asientos', async () => {
    useAuthStore.setState({ user: passenger, accessToken: 'tok' })
    mockGetTripById.mockResolvedValue(makeTripData('driver-1', 3))
    render(<TripDetail />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Solicitar Unirse/i })).toBeInTheDocument())
  })

  it('muestra "Gestionar Solicitudes" cuando el usuario es el conductor', async () => {
    useAuthStore.setState({ user: driver, accessToken: 'tok' })
    mockGetTripById.mockResolvedValue(makeTripData('driver-1', 3))
    render(<TripDetail />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Gestionar Solicitudes/i })).toBeInTheDocument())
  })

  it('muestra "Sin asientos disponibles" cuando availableSeats === 0', async () => {
    useAuthStore.setState({ user: passenger, accessToken: 'tok' })
    mockGetTripById.mockResolvedValue(makeTripData('driver-1', 0))
    render(<TripDetail />)
    await waitFor(() => expect(screen.getByText('Sin asientos disponibles')).toBeInTheDocument())
  })

  it('muestra "Ver Viaje Activo" cuando el viaje está IN_PROGRESS', async () => {
    useAuthStore.setState({ user: passenger, accessToken: 'tok' })
    mockGetTripById.mockResolvedValue(makeTripData('driver-1', 2, 'IN_PROGRESS'))
    render(<TripDetail />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Ver Viaje Activo/i })).toBeInTheDocument())
  })

  it('muestra spinner de carga al inicio', () => {
    useAuthStore.setState({ user: passenger, accessToken: 'tok' })
    mockGetTripById.mockReturnValue(new Promise(() => {}))
    const { container } = render(<TripDetail />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('muestra error cuando el viaje no existe', async () => {
    useAuthStore.setState({ user: passenger, accessToken: 'tok' })
    mockGetTripById.mockRejectedValue({ response: { status: 404 } })
    render(<TripDetail />)
    await waitFor(() => expect(screen.getByText('Viaje no encontrado.')).toBeInTheDocument())
  })
})

describe('TripDetail — contenido', () => {
  it('muestra "Itinerario del Viaje" con las zonas', async () => {
    useAuthStore.setState({ user: passenger, accessToken: 'tok' })
    mockGetTripById.mockResolvedValue(makeTripData('driver-1', 3))
    render(<TripDetail />)
    await waitFor(() => {
      expect(screen.getByText('Itinerario del Viaje')).toBeInTheDocument()
      expect(screen.getByText('Huachi')).toBeInTheDocument()
      expect(screen.getByText('Campus')).toBeInTheDocument()
    })
  })
})
