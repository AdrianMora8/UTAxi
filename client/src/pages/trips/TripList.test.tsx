import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const { mockGetTrips } = vi.hoisted(() => ({
  mockGetTrips: vi.fn(),
}))

vi.mock('@/api/trips.api', () => ({
  tripsApi: { getTrips: mockGetTrips },
}))

import TripList from './TripList'
import type { Trip } from '@/api/trips.api'

function makeTrip(id: string, origin: string, dest: string): Trip {
  return {
    id, driverId: 'u1', originZone: origin, destinationZone: dest,
    departureTime: '2026-05-21T08:00:00Z', totalSeats: 4, availableSeats: 3,
    pricePerSeat: 0.5, status: 'SCHEDULED',
    driver: { id: 'u1', fullName: 'Juan Mora', reputationScore: 4.5, totalTrips: 10 },
  }
}

const mockTripsResponse = {
  data: {
    trips: [makeTrip('t1', 'Campus Huachi', 'Mercado Central'), makeTrip('t2', 'Ingahurco', 'El Recreo')],
    total: 2, page: 1, limit: 20,
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TripList', () => {
  it('muestra el heading "Viajes Disponibles"', async () => {
    mockGetTrips.mockResolvedValue(mockTripsResponse)
    render(<TripList />)
    await waitFor(() => expect(screen.getByText('Viajes Disponibles')).toBeInTheDocument())
  })

  it('muestra skeletons mientras carga', () => {
    mockGetTrips.mockReturnValue(new Promise(() => {}))
    const { container } = render(<TripList />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renderiza una TripCard por cada viaje retornado', async () => {
    mockGetTrips.mockResolvedValue(mockTripsResponse)
    render(<TripList />)
    await waitFor(() => {
      expect(screen.getByText('Campus Huachi')).toBeInTheDocument()
      expect(screen.getByText('Ingahurco')).toBeInTheDocument()
    })
  })

  it('muestra el estado vacío cuando no hay viajes', async () => {
    mockGetTrips.mockResolvedValue({ data: { trips: [], total: 0, page: 1, limit: 20 } })
    render(<TripList />)
    await waitFor(() =>
      expect(screen.getByText('No hay viajes disponibles con esos filtros.')).toBeInTheDocument()
    )
  })

  it('muestra el botón "Limpiar filtros" en el estado vacío', async () => {
    mockGetTrips.mockResolvedValue({ data: { trips: [], total: 0, page: 1, limit: 20 } })
    render(<TripList />)
    await waitFor(() => expect(screen.getByText('Limpiar filtros')).toBeInTheDocument())
  })

  it('llama getTrips con destinationZone al buscar', async () => {
    const user = userEvent.setup()
    mockGetTrips.mockResolvedValue(mockTripsResponse)
    render(<TripList />)

    await user.type(screen.getByPlaceholderText('¿A dónde vas?'), 'Huachi')
    await user.click(screen.getByRole('button', { name: /Encontrar Viaje/i }))

    await waitFor(() =>
      expect(mockGetTrips).toHaveBeenCalledWith(expect.objectContaining({ destinationZone: 'Huachi' }))
    )
  })

  it('muestra los botones de ordenación', async () => {
    mockGetTrips.mockResolvedValue(mockTripsResponse)
    render(<TripList />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'MÁS RECIENTES' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'MEJOR CALIFICADOS' })).toBeInTheDocument()
    })
  })
})
