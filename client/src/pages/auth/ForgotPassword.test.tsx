import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const { mockForgotPassword, mockNavigate } = vi.hoisted(() => ({
  mockForgotPassword: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/api/auth.api', () => ({
  authApi: { forgotPassword: mockForgotPassword },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import ForgotPassword from './ForgotPassword'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ForgotPassword — renderizado', () => {
  it('muestra el heading "Recupera tu contraseña"', () => {
    render(<ForgotPassword />)
    expect(screen.getByText('Recupera tu contraseña')).toBeInTheDocument()
  })

  it('muestra el campo de correo institucional', () => {
    render(<ForgotPassword />)
    expect(screen.getByPlaceholderText('usuario@uta.edu.ec')).toBeInTheDocument()
  })

  it('muestra el botón "Enviar código"', () => {
    render(<ForgotPassword />)
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeInTheDocument()
  })

  it('muestra el link "Ingrésalo aquí" hacia /reset-password', () => {
    render(<ForgotPassword />)
    expect(screen.getByRole('link', { name: 'Ingrésalo aquí' })).toHaveAttribute('href', '/reset-password')
  })

  it('muestra el link "Volver a iniciar sesión" hacia /login', () => {
    render(<ForgotPassword />)
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '/login')
  })
})

describe('ForgotPassword — validación', () => {
  it('muestra "Correo inválido" al enviar un email mal formado', async () => {
    const user = userEvent.setup()
    render(<ForgotPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'no-es-email')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))

    await waitFor(() => expect(screen.getByText('Correo inválido')).toBeInTheDocument())
    expect(mockForgotPassword).not.toHaveBeenCalled()
  })
})

describe('ForgotPassword — submit exitoso', () => {
  it('llama authApi.forgotPassword con el email ingresado', async () => {
    const user = userEvent.setup()
    mockForgotPassword.mockResolvedValue({})
    render(<ForgotPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'student1@uta.edu.ec')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))

    await waitFor(() =>
      expect(mockForgotPassword).toHaveBeenCalledWith({ email: 'student1@uta.edu.ec' })
    )
  })

  it('muestra el mensaje de éxito tras enviar', async () => {
    const user = userEvent.setup()
    mockForgotPassword.mockResolvedValue({})
    render(<ForgotPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'student1@uta.edu.ec')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))

    await waitFor(() =>
      expect(screen.getByText(/Correo enviado correctamente/i)).toBeInTheDocument()
    )
  })

  it('el botón cambia a "Enviando..." durante el submit', async () => {
    const user = userEvent.setup()
    mockForgotPassword.mockReturnValue(new Promise(() => {}))
    render(<ForgotPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'student1@uta.edu.ec')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled())
  })
})

describe('ForgotPassword — error del servidor', () => {
  it('muestra el mensaje de error del servidor', async () => {
    const user = userEvent.setup()
    mockForgotPassword.mockRejectedValue({
      response: { data: { error: 'Correo no registrado' } },
    })
    render(<ForgotPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'noexiste@uta.edu.ec')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))

    await waitFor(() => expect(screen.getByText(/Correo no registrado/i)).toBeInTheDocument())
  })

  it('muestra mensaje genérico cuando el servidor no retorna error', async () => {
    const user = userEvent.setup()
    mockForgotPassword.mockRejectedValue(new Error('Network error'))
    render(<ForgotPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'x@uta.edu.ec')
    await user.click(screen.getByRole('button', { name: 'Enviar código' }))

    await waitFor(() => expect(screen.getByText(/Error al enviar el código/i)).toBeInTheDocument())
  })
})
