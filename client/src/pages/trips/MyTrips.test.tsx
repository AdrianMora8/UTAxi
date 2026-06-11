import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { useAuthStore } from '@/store/authStore'

const { mockGetMyTrips, mockNavigate } = vi.hoisted(() => ({
  mockGetMyTrips: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/api/trips.api', () => ({
  tripsApi: { getMyTrips: mockGetMyTrips, cancelTrip: vi.fn() },
}))

vi.mock('@/api/users.api', () => ({
  usersApi: {
    getMe: vi.fn().mockResolvedValue({ data: { user: { vehicle: { plate: 'XYZ' } } } }),
  },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import MyTrips from './MyTrips'

const mockUser = {
  id: 'user-1',
  email: 'driver@uta.edu.ec',
  fullName: 'Ana Driver',
  role: 'STUDENT' as const,
  status: 'ACTIVE' as const,
  emailVerified: true,
  reputationScore: 4.9,
  photoUrl: null,
  career: null,
  phone: null,
  neighborhood: null,
}

const makeTrip = (overrides: Record<string, unknown> = {}) => ({
  id: 'trip-001',
  status: 'SCHEDULED',
  originZone: 'Campus Huachi',
  destinationZone: 'Sector Los Pinos',
  departureTime: '2026-06-01T08:00:00.000Z',
  pricePerSeat: '2.50',
  availableSeats: 3,
  totalSeats: 4,
  driverId: 'user-1',
  driver: { fullName: 'Ana Driver', id: 'user-1' },
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: mockUser, accessToken: 'tok' })
  mockGetMyTrips.mockResolvedValue({ data: { trips: [] } })
})

describe('MyTrips — renderizado', () => {
  it('muestra el label "Panel del Conductor"', async () => {
    render(<MyTrips />)
    await waitFor(() => expect(screen.getByText('Panel del Conductor')).toBeInTheDocument())
  })

  it('muestra el heading "Mis Viajes"', async () => {
    render(<MyTrips />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Mis Viajes' })).toBeInTheDocument()
    )
  })

  it('muestra los botones de tab Activos y Completados', async () => {
    render(<MyTrips />)
    expect(screen.getByRole('button', { name: 'Activos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completados' })).toBeInTheDocument()
  })

  it('muestra el link "+ Publicar" hacia /trips/new', async () => {
    render(<MyTrips />)
    const link = screen.getByRole('link', { name: '+ Publicar' })
    expect(link).toHaveAttribute('href', '/trips/new')
  })
})

describe('MyTrips — tab Activos vacía', () => {
  it('muestra "Sin viajes activos" cuando no hay trips activos', async () => {
    render(<MyTrips />)
    await waitFor(() => expect(screen.getByText('Sin viajes activos')).toBeInTheDocument())
  })

  it('muestra el link "Publicar Viaje" en estado vacío de Activos', async () => {
    render(<MyTrips />)
    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Publicar Viaje' })
      expect(link).toHaveAttribute('href', '/trips/new')
    })
  })
})

describe('MyTrips — tab Completados vacía', () => {
  it('muestra "Sin viajes completados" en tab Completados vacía', async () => {
    const user = userEvent.setup()
    render(<MyTrips />)

    await user.click(screen.getByRole('button', { name: 'Completados' }))
    await waitFor(() => expect(screen.getByText('Sin viajes completados')).toBeInTheDocument())
  })
})

describe('MyTrips — viaje PROGRAMADO', () => {
  beforeEach(() => {
    mockGetMyTrips.mockResolvedValue({
      data: { trips: [makeTrip({ status: 'SCHEDULED' })] },
    })
  })

  it('muestra el badge "PROGRAMADO"', async () => {
    render(<MyTrips />)
    await waitFor(() => expect(screen.getByText('PROGRAMADO')).toBeInTheDocument())
  })

  it('muestra el botón "Gestionar"', async () => {
    render(<MyTrips />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Gestionar/i })).toBeInTheDocument()
    )
  })

  it('"Gestionar" navega a /trips/:id/requests', async () => {
    const user = userEvent.setup()
    render(<MyTrips />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Gestionar/i })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Gestionar/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/trips/trip-001/requests')
  })

  it('muestra el origen y destino del viaje', async () => {
    render(<MyTrips />)
    await waitFor(() => {
      expect(screen.getByText('Campus Huachi')).toBeInTheDocument()
      expect(screen.getByText('Sector Los Pinos')).toBeInTheDocument()
    })
  })
})

describe('MyTrips — viaje EN CURSO', () => {
  it('muestra el badge "EN CURSO" para trips IN_PROGRESS', async () => {
    mockGetMyTrips.mockResolvedValue({
      data: { trips: [makeTrip({ status: 'IN_PROGRESS' })] },
    })
    render(<MyTrips />)
    await waitFor(() => expect(screen.getByText('EN CURSO')).toBeInTheDocument())
  })

  it('muestra el botón "Gestionar" para trips IN_PROGRESS', async () => {
    mockGetMyTrips.mockResolvedValue({
      data: { trips: [makeTrip({ status: 'IN_PROGRESS' })] },
    })
    render(<MyTrips />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Gestionar/i })).toBeInTheDocument()
    )
  })
})

describe('MyTrips — viaje COMPLETADO', () => {
  it('muestra el badge "COMPLETADO" en tab Completados', async () => {
    const user = userEvent.setup()
    mockGetMyTrips.mockResolvedValue({
      data: { trips: [makeTrip({ status: 'COMPLETED' })] },
    })
    render(<MyTrips />)

    await user.click(screen.getByRole('button', { name: 'Completados' }))
    await waitFor(() => expect(screen.getByText('COMPLETADO')).toBeInTheDocument())
  })

  it('muestra el link "Ver detalles" para trips completados', async () => {
    const user = userEvent.setup()
    mockGetMyTrips.mockResolvedValue({
      data: { trips: [makeTrip({ status: 'COMPLETED' })] },
    })
    render(<MyTrips />)

    await user.click(screen.getByRole('button', { name: 'Completados' }))
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Ver detalles/i })
      expect(link).toHaveAttribute('href', '/trips/trip-001/requests')
    })
  })
})
