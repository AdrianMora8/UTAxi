import { render, screen, waitFor } from '@/test/test-utils'
import { useAuthStore } from '@/store/authStore'
import { vi } from 'vitest'

const { mockGetTripById, mockUseTracking } = vi.hoisted(() => ({
  mockGetTripById: vi.fn(),
  mockUseTracking: vi.fn(),
}))

vi.mock('@/api/trips.api', () => ({
  tripsApi: { getTripById: mockGetTripById },
}))

vi.mock('@/hooks/useTracking', () => ({
  useTracking: mockUseTracking,
}))

vi.mock('@/components/map/TripMap', () => ({
  default: () => <div data-testid="trip-map">TripMap</div>,
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useParams: () => ({ id: 'trip-001' }),
  }
})

import ActiveTrip from './ActiveTrip'

const mockUser = {
  id: 'user-passenger',
  email: 'passenger@uta.edu.ec',
  fullName: 'Ana Pasajero',
  role: 'STUDENT' as const,
  status: 'ACTIVE' as const,
  emailVerified: true,
  reputationScore: 4.5,
  photoUrl: null,
  career: null,
  phone: null,
  neighborhood: null,
}

const mockDriverUser = { ...mockUser, id: 'driver-1', fullName: 'Luis Vera' }

const mockTrip = {
  id: 'trip-001',
  status: 'IN_PROGRESS',
  originZone: 'Campus Huachi',
  destinationZone: 'Sector Los Pinos',
  departureTime: '2026-06-01T08:00:00.000Z',
  pricePerSeat: '2.50',
  availableSeats: 2,
  totalSeats: 4,
  driverId: 'driver-1',
  driver: { fullName: 'Luis Vera', id: 'driver-1' },
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: mockUser, accessToken: 'tok' })
  mockGetTripById.mockResolvedValue({ data: { trip: mockTrip } })
  mockUseTracking.mockReturnValue({ driverLocation: null, connected: false, error: null })
})

describe('ActiveTrip — viaje no encontrado', () => {
  it('muestra "Viaje no encontrado." cuando el viaje no existe', async () => {
    mockGetTripById.mockResolvedValue({ data: { trip: null } })

    render(<ActiveTrip />)

    await waitFor(() =>
      expect(screen.getByText('Viaje no encontrado.')).toBeInTheDocument()
    )
  })

  it('muestra el link "← Volver a viajes" cuando no se encuentra el viaje', async () => {
    mockGetTripById.mockResolvedValue({ data: { trip: null } })

    render(<ActiveTrip />)

    await waitFor(() => {
      const link = screen.getByRole('link', { name: '← Volver a viajes' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/trips')
    })
  })
})

describe('ActiveTrip — estado de conexión', () => {
  it('muestra "Conectando..." cuando no está conectado', async () => {
    mockUseTracking.mockReturnValue({ driverLocation: null, connected: false, error: null })

    render(<ActiveTrip />)

    await waitFor(() => expect(screen.getByText('Conectando...')).toBeInTheDocument())
  })

  it('muestra "Tracking activo" cuando está conectado como pasajero', async () => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok' })
    mockUseTracking.mockReturnValue({ driverLocation: null, connected: true, error: null })

    render(<ActiveTrip />)

    await waitFor(() => expect(screen.getByText('Tracking activo')).toBeInTheDocument())
  })

  it('muestra "Transmitiendo GPS" cuando está conectado como conductor', async () => {
    useAuthStore.setState({ user: mockDriverUser, accessToken: 'tok' })
    mockUseTracking.mockReturnValue({ driverLocation: null, connected: true, error: null })

    render(<ActiveTrip />)

    await waitFor(() => expect(screen.getByText('Transmitiendo GPS')).toBeInTheDocument())
  })
})

describe('ActiveTrip — panel inferior', () => {
  it('muestra el badge "Viaje en Curso"', async () => {
    render(<ActiveTrip />)

    await waitFor(() => expect(screen.getByText('Viaje en Curso')).toBeInTheDocument())
  })

  it('muestra el ETA "~15 MIN"', async () => {
    render(<ActiveTrip />)

    await waitFor(() => expect(screen.getByText('~15 MIN')).toBeInTheDocument())
  })

  it('muestra el botón "Chat"', async () => {
    render(<ActiveTrip />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Chat/i })).toBeInTheDocument())
  })

  it('muestra el botón "Seguridad U-Ride"', async () => {
    render(<ActiveTrip />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Seguridad U-Ride/i })).toBeInTheDocument()
    )
  })

  it('muestra el origen y destino en el panel de ruta', async () => {
    render(<ActiveTrip />)

    await waitFor(() => {
      expect(screen.getAllByText('Campus Huachi').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Sector Los Pinos').length).toBeGreaterThan(0)
    })
  })

  it('muestra el nombre del conductor', async () => {
    render(<ActiveTrip />)

    await waitFor(() => expect(screen.getByText('Luis Vera')).toBeInTheDocument())
  })

  it('muestra el badge "Conductor" cuando el usuario es el driver', async () => {
    useAuthStore.setState({ user: mockDriverUser, accessToken: 'tok' })

    render(<ActiveTrip />)

    // El badge aparece además del label "Conductor" del card del conductor — hay 2 elementos
    await waitFor(() => expect(screen.getAllByText('Conductor').length).toBeGreaterThanOrEqual(2))
  })

  it('no muestra el badge "Conductor" cuando el usuario es pasajero', async () => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok' })

    render(<ActiveTrip />)

    // Solo el label del card del conductor — exactamente 1 elemento
    await waitFor(() => expect(screen.getByText('Viaje en Curso')).toBeInTheDocument())
    expect(screen.getAllByText('Conductor').length).toBe(1)
  })
})

describe('ActiveTrip — navegación', () => {
  it('muestra el link "Detalle" de vuelta al detalle del viaje', async () => {
    render(<ActiveTrip />)

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Detalle/i })
      expect(link).toHaveAttribute('href', '/trips/trip-001')
    })
  })
})

describe('ActiveTrip — error de GPS', () => {
  it('muestra el pill de error GPS cuando hay error', async () => {
    mockUseTracking.mockReturnValue({
      driverLocation: null,
      connected: true,
      error: 'GPS no disponible',
    })

    render(<ActiveTrip />)

    await waitFor(() =>
      expect(screen.getByText('GPS no disponible')).toBeInTheDocument()
    )
  })
})
