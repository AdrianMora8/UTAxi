import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const { mockRegister, mockNavigate } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/api/auth.api', () => ({
  authApi: { register: mockRegister },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import Register from './Register'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Register — renderizado', () => {
  it('muestra el campo de nombre completo', () => {
    render(<Register />)
    expect(screen.getByPlaceholderText('Ej. Alex Maldonado')).toBeInTheDocument()
  })

  it('muestra el campo de email institucional', () => {
    render(<Register />)
    expect(screen.getByPlaceholderText('usuario@uta.edu.ec')).toBeInTheDocument()
  })

  it('muestra el select de carrera con la opción por defecto', () => {
    render(<Register />)
    expect(screen.getByText('Selecciona tu carrera')).toBeInTheDocument()
  })

  it('muestra todas las carreras como opciones del select', () => {
    render(<Register />)
    expect(screen.getByRole('option', { name: 'Ingeniería en Sistemas' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Ciencias Administrativas' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Diseño y Arquitectura' })).toBeInTheDocument()
  })

  it('muestra el botón "Crear Cuenta Institucional"', () => {
    render(<Register />)
    expect(screen.getByRole('button', { name: /Crear Cuenta Institucional/i })).toBeInTheDocument()
  })
})

describe('Register — submit exitoso', () => {
  it('llama authApi.register con los datos del formulario', async () => {
    const user = userEvent.setup()
    mockRegister.mockResolvedValue({ data: { message: 'ok' } })
    render(<Register />)

    await user.type(screen.getByPlaceholderText('Ej. Alex Maldonado'), 'Ana García')
    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'ana@uta.edu.ec')
    await user.selectOptions(screen.getByRole('combobox'), 'Ingeniería en Sistemas')
    await user.type(screen.getByPlaceholderText('••••••••'), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /Crear Cuenta Institucional/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ana@uta.edu.ec',
          fullName: 'Ana García',
          career: 'Ingeniería en Sistemas',
          password: 'SecurePass123!',
        }),
      )
    })
  })

  it('navega a /verify-email con el email tras registro exitoso', async () => {
    const user = userEvent.setup()
    mockRegister.mockResolvedValue({ data: { message: 'ok' } })
    render(<Register />)

    await user.type(screen.getByPlaceholderText('Ej. Alex Maldonado'), 'Ana García')
    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'ana@uta.edu.ec')
    await user.selectOptions(screen.getByRole('combobox'), 'Ingeniería en Sistemas')
    await user.type(screen.getByPlaceholderText('••••••••'), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /Crear Cuenta Institucional/i }))

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/verify-email'))
    )
  })
})

describe('Register — validaciones', () => {
  it('muestra error cuando el nombre es muy corto', async () => {
    const user = userEvent.setup()
    render(<Register />)

    await user.type(screen.getByPlaceholderText('Ej. Alex Maldonado'), 'AB')
    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'ab@uta.edu.ec')
    await user.selectOptions(screen.getByRole('combobox'), 'Ingeniería en Sistemas')
    await user.type(screen.getByPlaceholderText('••••••••'), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /Crear Cuenta Institucional/i }))

    await waitFor(() => expect(screen.getByText('Nombre muy corto')).toBeInTheDocument())
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('muestra error cuando el email no es @uta.edu.ec', async () => {
    const user = userEvent.setup()
    render(<Register />)

    await user.type(screen.getByPlaceholderText('Ej. Alex Maldonado'), 'Ana García')
    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'ana@gmail.com')
    await user.selectOptions(screen.getByRole('combobox'), 'Ingeniería en Sistemas')
    await user.type(screen.getByPlaceholderText('••••••••'), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /Crear Cuenta Institucional/i }))

    await waitFor(() => expect(screen.getByText('Debe ser un correo @uta.edu.ec')).toBeInTheDocument())
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('muestra error cuando la contraseña tiene menos de 8 caracteres', async () => {
    const user = userEvent.setup()
    render(<Register />)

    await user.type(screen.getByPlaceholderText('Ej. Alex Maldonado'), 'Ana García')
    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'ana@uta.edu.ec')
    await user.selectOptions(screen.getByRole('combobox'), 'Ingeniería en Sistemas')
    await user.type(screen.getByPlaceholderText('••••••••'), 'corto')
    await user.click(screen.getByRole('button', { name: /Crear Cuenta Institucional/i }))

    await waitFor(() => expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument())
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('muestra error del servidor en el formulario', async () => {
    const user = userEvent.setup()
    mockRegister.mockRejectedValue({ response: { data: { message: 'El email ya está registrado' } } })
    render(<Register />)

    await user.type(screen.getByPlaceholderText('Ej. Alex Maldonado'), 'Ana García')
    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'ana@uta.edu.ec')
    await user.selectOptions(screen.getByRole('combobox'), 'Ingeniería en Sistemas')
    await user.type(screen.getByPlaceholderText('••••••••'), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /Crear Cuenta Institucional/i }))

    await waitFor(() => expect(screen.getByText('El email ya está registrado')).toBeInTheDocument())
  })
})
