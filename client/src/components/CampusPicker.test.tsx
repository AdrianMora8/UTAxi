import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import CampusPicker from './CampusPicker'
import { CAMPUSES, type Campus } from '@/constants/campuses'

const huachi = CAMPUSES.find((c) => c.id === 'huachi')!
const ingahurco = CAMPUSES.find((c) => c.id === 'ingahurco')!

describe('CampusPicker — renderizado', () => {
  it('muestra los tres campus disponibles', () => {
    render(<CampusPicker value={null} onChange={vi.fn()} />)

    expect(screen.getByText('Campus Huachi')).toBeInTheDocument()
    expect(screen.getByText('Campus Ingahurco')).toBeInTheDocument()
    expect(screen.getByText('Campus Querochamba')).toBeInTheDocument()
  })

  it('muestra la descripción de cada campus', () => {
    render(<CampusPicker value={null} onChange={vi.fn()} />)

    expect(screen.getByText('Campus central — Av. Los Chasquis')).toBeInTheDocument()
    expect(screen.getByText('Fac. Jurisprudencia y Ciencias Sociales')).toBeInTheDocument()
    expect(screen.getByText('Fac. Ciencias Agropecuarias — Cevallos')).toBeInTheDocument()
  })

  it('no muestra el ícono check cuando ningún campus está seleccionado', () => {
    render(<CampusPicker value={null} onChange={vi.fn()} />)

    expect(screen.queryByText('check_circle')).not.toBeInTheDocument()
  })

  it('muestra el ícono check_circle en el campus seleccionado', () => {
    render(<CampusPicker value={huachi} onChange={vi.fn()} />)

    expect(screen.getByText('check_circle')).toBeInTheDocument()
  })

  it('no muestra error cuando no se pasa el prop error', () => {
    const { container } = render(<CampusPicker value={null} onChange={vi.fn()} />)
    expect(container.querySelector('p.text-error')).not.toBeInTheDocument()
  })

  it('muestra el mensaje de error cuando se pasa el prop error', () => {
    render(<CampusPicker value={null} onChange={vi.fn()} error="Selecciona el campus de origen" />)

    expect(screen.getByText('Selecciona el campus de origen')).toBeInTheDocument()
  })
})

describe('CampusPicker — interacción', () => {
  it('llama onChange con el campus correcto al hacer click', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<CampusPicker value={null} onChange={handleChange} />)

    await user.click(screen.getByText('Campus Huachi'))

    expect(handleChange).toHaveBeenCalledWith(huachi)
  })

  it('llama onChange al seleccionar un campus diferente', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<CampusPicker value={huachi} onChange={handleChange} />)

    await user.click(screen.getByText('Campus Ingahurco'))

    expect(handleChange).toHaveBeenCalledWith(ingahurco)
  })

  it('llama onChange una sola vez por click', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<CampusPicker value={null} onChange={handleChange} />)

    await user.click(screen.getByText('Campus Huachi'))

    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('todos los botones son de tipo "button" (no hacen submit)', () => {
    render(<CampusPicker value={null} onChange={vi.fn()} />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => expect(btn).toHaveAttribute('type', 'button'))
  })
})
