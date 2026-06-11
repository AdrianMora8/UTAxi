import { render, screen, waitFor, fireEvent } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import type { Campus } from '@/constants/campuses'
import type { DestinationValue } from '@/components/map/DestinationPickerField'

const { mockCreateTrip, mockNavigate } = vi.hoisted(() => ({
  mockCreateTrip: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/api/trips.api', () => ({
  tripsApi: { createTrip: mockCreateTrip },
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

const mockCampus: Campus = { id: 'huachi', label: 'Campus Huachi', shortLabel: 'Huachi', description: '', lat: -1.254, lng: -78.62 }
const mockDest: DestinationValue = { address: 'Mercado Central', lat: -1.26, lng: -78.63 }

vi.mock('@/components/CampusPicker', () => ({
  default: ({ onChange, error }: { onChange: (c: Campus) => void; error?: string }) => (
    <>
      <button type="button" data-testid="campus-picker" onClick={() => onChange(mockCampus)}>
        Seleccionar Campus
      </button>
      {error && <p>{error}</p>}
    </>
  ),
}))

vi.mock('@/components/map/DestinationPickerField', () => ({
  default: ({ onChange, error }: { onChange: (v: DestinationValue) => void; error?: string }) => (
    <>
      <button type="button" data-testid="dest-picker" onClick={() => onChange(mockDest)}>
        Seleccionar Destino
      </button>
      {error && <p>{error}</p>}
    </>
  ),
}))

vi.mock('@/components/map/RouteMap', () => ({
  default: () => <div data-testid="route-map" />,
}))

import CreateTrip from './CreateTrip'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CreateTrip — validaciones', () => {
  it('muestra error si se envía sin seleccionar campus', async () => {
    const user = userEvent.setup()
    const { container } = render(<CreateTrip />)

    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2030-06-01' } })
    fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: '08:00' } })
    await user.click(screen.getByRole('button', { name: /Publicar Viaje/i }))

    await waitFor(() =>
      expect(screen.getByText('Selecciona el campus de origen')).toBeInTheDocument()
    )
    expect(mockCreateTrip).not.toHaveBeenCalled()
  })

  it('muestra error si se envía sin seleccionar destino', async () => {
    const user = userEvent.setup()
    const { container } = render(<CreateTrip />)

    await user.click(screen.getByTestId('campus-picker'))
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2030-06-01' } })
    fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: '08:00' } })
    await user.click(screen.getByRole('button', { name: /Publicar Viaje/i }))

    await waitFor(() =>
      expect(screen.getByText('Elige el destino en el mapa')).toBeInTheDocument()
    )
    expect(mockCreateTrip).not.toHaveBeenCalled()
  })

  it('muestra error de validación cuando la fecha está vacía', async () => {
    const user = userEvent.setup()
    render(<CreateTrip />)

    await user.click(screen.getByTestId('campus-picker'))
    await user.click(screen.getByTestId('dest-picker'))
    await user.click(screen.getByRole('button', { name: /Publicar Viaje/i }))

    await waitFor(() =>
      expect(screen.getByText('Selecciona una fecha')).toBeInTheDocument()
    )
  })
})

describe('CreateTrip — submit exitoso', () => {
  it('llama tripsApi.createTrip con el payload correcto', async () => {
    const user = userEvent.setup()
    mockCreateTrip.mockResolvedValue({ data: { trip: { id: 'new-trip' } } })
    const { container } = render(<CreateTrip />)

    await user.click(screen.getByTestId('campus-picker'))
    await user.click(screen.getByTestId('dest-picker'))
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2030-06-01' } })
    fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: '08:00' } })
    await user.click(screen.getByRole('button', { name: /Publicar Viaje/i }))

    await waitFor(() =>
      expect(mockCreateTrip).toHaveBeenCalledWith(
        expect.objectContaining({
          originZone: 'Campus Huachi',
          destinationZone: 'Mercado Central',
        }),
      )
    )
  })

  it('navega a /trips/:id/requests tras crear el viaje', async () => {
    const user = userEvent.setup()
    mockCreateTrip.mockResolvedValue({ data: { trip: { id: 'new-trip' } } })
    const { container } = render(<CreateTrip />)

    await user.click(screen.getByTestId('campus-picker'))
    await user.click(screen.getByTestId('dest-picker'))
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2030-06-01' } })
    fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: '08:00' } })
    await user.click(screen.getByRole('button', { name: /Publicar Viaje/i }))

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/trips/new-trip/requests')
    )
  })

  it('muestra error del servidor si falla la creación', async () => {
    const user = userEvent.setup()
    mockCreateTrip.mockRejectedValue({ response: { data: { message: 'Error al publicar el viaje' } } })
    const { container } = render(<CreateTrip />)

    await user.click(screen.getByTestId('campus-picker'))
    await user.click(screen.getByTestId('dest-picker'))
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2030-06-01' } })
    fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: '08:00' } })
    await user.click(screen.getByRole('button', { name: /Publicar Viaje/i }))

    await waitFor(() =>
      expect(screen.getByText('Error al publicar el viaje')).toBeInTheDocument()
    )
  })
})
