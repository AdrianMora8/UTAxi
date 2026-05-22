import { render, screen } from '@/test/test-utils'
import TripCard from './TripCard'
import type { Trip } from '@/api/trips.api'

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    driverId: 'user-1',
    originZone: 'Campus Huachi',
    destinationZone: 'Mercado Central',
    departureTime: '2026-05-21T08:00:00Z',
    totalSeats: 4,
    availableSeats: 3,
    pricePerSeat: 0.5,
    status: 'SCHEDULED',
    driver: { id: 'user-1', fullName: 'Juan Carlos Mora', reputationScore: 4.8, totalTrips: 20 },
    ...overrides,
  }
}

describe('TripCard', () => {
  it('muestra el nombre del conductor', () => {
    render(<TripCard trip={makeTrip()} />)
    expect(screen.getByText('Juan Carlos Mora')).toBeInTheDocument()
  })

  it('muestra las iniciales del conductor (dos palabras)', () => {
    render(<TripCard trip={makeTrip()} />)
    expect(screen.getByText('JC')).toBeInTheDocument()
  })

  it('enlaza a /trips/:id', () => {
    render(<TripCard trip={makeTrip()} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/trips/trip-1')
  })

  it('badge "¡Último asiento!" cuando availableSeats === 1', () => {
    render(<TripCard trip={makeTrip({ availableSeats: 1, totalSeats: 4 })} />)
    expect(screen.getByText('¡Último asiento!')).toBeInTheDocument()
  })

  it('badge "Quedan 2 asientos" con clase bg-primary cuando seats <= 40% del total', () => {
    const { container } = render(<TripCard trip={makeTrip({ availableSeats: 2, totalSeats: 5 })} />)
    const badge = container.querySelector('[class*="bg-primary"]')
    expect(badge?.textContent).toContain('Quedan 2 asientos')
  })

  it('badge "Quedan 3 asientos" verde (bg-tertiary) cuando hay suficientes asientos', () => {
    const { container } = render(<TripCard trip={makeTrip({ availableSeats: 3, totalSeats: 4 })} />)
    const badge = container.querySelector('[class*="bg-tertiary"]')
    expect(badge?.textContent).toContain('Quedan 3 asientos')
  })

  it('muestra zona de origen y destino', () => {
    render(<TripCard trip={makeTrip()} />)
    expect(screen.getByText('Campus Huachi')).toBeInTheDocument()
    expect(screen.getByText('Mercado Central')).toBeInTheDocument()
  })

  it('muestra el botón "Ver Viaje"', () => {
    render(<TripCard trip={makeTrip()} />)
    expect(screen.getByText('Ver Viaje')).toBeInTheDocument()
  })
})
