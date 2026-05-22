import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const { mockCreateRating } = vi.hoisted(() => ({
  mockCreateRating: vi.fn(),
}))

vi.mock('@/api/ratings.api', () => ({
  ratingsApi: { createRating: mockCreateRating },
}))

import RatingModal from './RatingModal'

const defaultProps = {
  tripRequestId: 'req-1',
  driverName: 'Carlos Pérez',
  onClose: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RatingModal', () => {
  it('muestra el nombre del conductor', () => {
    render(<RatingModal {...defaultProps} />)
    expect(screen.getByText('Carlos Pérez')).toBeInTheDocument()
  })

  it('el botón "Enviar Calificación" está deshabilitado con score=0', () => {
    render(<RatingModal {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Enviar Calificación/i })).toBeDisabled()
  })

  it('muestra "Selecciona una puntuación" antes de elegir estrella', () => {
    render(<RatingModal {...defaultProps} />)
    expect(screen.getByText('Selecciona una puntuación')).toBeInTheDocument()
  })

  it('habilita el botón al seleccionar una estrella', async () => {
    const user = userEvent.setup()
    render(<RatingModal {...defaultProps} />)
    const starButtons = screen.getAllByRole('button').filter(b =>
      b.querySelector('span')?.textContent?.trim() === 'star'
    )
    await user.click(starButtons[0])
    expect(screen.getByRole('button', { name: /Enviar Calificación/i })).not.toBeDisabled()
  })

  it('muestra "Excelente" al hacer hover o click en la estrella 5', async () => {
    const user = userEvent.setup()
    render(<RatingModal {...defaultProps} />)
    const starButtons = screen.getAllByRole('button').filter(b =>
      b.querySelector('span')?.textContent?.trim() === 'star'
    )
    await user.click(starButtons[4]) // estrella 5
    expect(screen.getByText('Excelente')).toBeInTheDocument()
  })

  it('muestra "Bueno" al seleccionar la estrella 3', async () => {
    const user = userEvent.setup()
    render(<RatingModal {...defaultProps} />)
    const starButtons = screen.getAllByRole('button').filter(b =>
      b.querySelector('span')?.textContent?.trim() === 'star'
    )
    await user.click(starButtons[2]) // estrella 3
    expect(screen.getByText('Bueno')).toBeInTheDocument()
  })

  it('llama ratingsApi.createRating con score al enviar', async () => {
    const user = userEvent.setup()
    mockCreateRating.mockResolvedValue({ data: { rating: { id: 'r1', score: 4 } } })
    render(<RatingModal {...defaultProps} />)

    const starButtons = screen.getAllByRole('button').filter(b =>
      b.querySelector('span')?.textContent?.trim() === 'star'
    )
    await user.click(starButtons[3]) // estrella 4
    await user.click(screen.getByRole('button', { name: /Enviar Calificación/i }))

    await waitFor(() => {
      expect(mockCreateRating).toHaveBeenCalledWith(
        expect.objectContaining({ tripRequestId: 'req-1', score: 4 }),
      )
    })
  })

  it('incluye el comment si el usuario escribe uno', async () => {
    const user = userEvent.setup()
    mockCreateRating.mockResolvedValue({ data: { rating: { id: 'r1', score: 5 } } })
    render(<RatingModal {...defaultProps} />)

    const starButtons = screen.getAllByRole('button').filter(b =>
      b.querySelector('span')?.textContent?.trim() === 'star'
    )
    await user.click(starButtons[4]) // estrella 5
    await user.type(screen.getByPlaceholderText(/¿Cómo fue tu experiencia/i), 'Muy puntual')
    await user.click(screen.getByRole('button', { name: /Enviar Calificación/i }))

    await waitFor(() => {
      expect(mockCreateRating).toHaveBeenCalledWith(
        expect.objectContaining({ comment: 'Muy puntual' }),
      )
    })
  })

  it('llama onClose tras envío exitoso', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockCreateRating.mockResolvedValue({ data: { rating: { id: 'r1', score: 5 } } })
    render(<RatingModal {...defaultProps} onClose={onClose} />)

    const starButtons = screen.getAllByRole('button').filter(b =>
      b.querySelector('span')?.textContent?.trim() === 'star'
    )
    await user.click(starButtons[4])
    await user.click(screen.getByRole('button', { name: /Enviar Calificación/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('muestra error del servidor cuando falla el envío', async () => {
    const user = userEvent.setup()
    mockCreateRating.mockRejectedValue({ response: { data: { message: 'Ya calificaste este viaje' } } })
    render(<RatingModal {...defaultProps} />)

    const starButtons = screen.getAllByRole('button').filter(b =>
      b.querySelector('span')?.textContent?.trim() === 'star'
    )
    await user.click(starButtons[0])
    await user.click(screen.getByRole('button', { name: /Enviar Calificación/i }))

    await waitFor(() => expect(screen.getByText('Ya calificaste este viaje')).toBeInTheDocument())
  })

  it('llama onClose al hacer click en "Cancelar"', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<RatingModal {...defaultProps} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('llama onClose al hacer click en el botón X', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<RatingModal {...defaultProps} onClose={onClose} />)
    const closeButton = screen.getAllByRole('button').find(b =>
      b.querySelector('span')?.textContent?.trim() === 'close'
    )!
    await user.click(closeButton)
    expect(onClose).toHaveBeenCalled()
  })
})
