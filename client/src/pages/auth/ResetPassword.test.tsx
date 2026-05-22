import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const { mockResetPassword, mockNavigate } = vi.hoisted(() => ({
  mockResetPassword: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/api/auth.api', () => ({
  authApi: { resetPassword: mockResetPassword },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import ResetPassword from './ResetPassword'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ResetPassword — renderizado', () => {
  it('muestra el heading "Restablecer contraseña"', () => {
    render(<ResetPassword />)
    expect(screen.getByRole('heading', { name: 'Restablecer contraseña' })).toBeInTheDocument()
  })

  it('muestra el campo de correo institucional', () => {
    render(<ResetPassword />)
    expect(screen.getByPlaceholderText('usuario@uta.edu.ec')).toBeInTheDocument()
  })

  it('muestra el campo de código de recuperación', () => {
    render(<ResetPassword />)
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
  })

  it('muestra el campo de nueva contraseña', () => {
    render(<ResetPassword />)
    expect(screen.getByPlaceholderText('Mínimo 8 caracteres')).toBeInTheDocument()
  })

  it('muestra el campo de confirmar contraseña', () => {
    render(<ResetPassword />)
    expect(screen.getByPlaceholderText('Repite la contraseña')).toBeInTheDocument()
  })

  it('muestra el botón "Restablecer contraseña"', () => {
    render(<ResetPassword />)
    expect(screen.getByRole('button', { name: 'Restablecer contraseña' })).toBeInTheDocument()
  })

  it('muestra el link "Solicitar otro" hacia /forgot-password', () => {
    render(<ResetPassword />)
    expect(screen.getByRole('link', { name: 'Solicitar otro' })).toHaveAttribute('href', '/forgot-password')
  })

  it('muestra el link "Volver a iniciar sesión" hacia /login', () => {
    render(<ResetPassword />)
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '/login')
  })
})

describe('ResetPassword — validación', () => {
  it('muestra "Correo inválido" con email mal formado', async () => {
    const user = userEvent.setup()
    render(<ResetPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'no-es-email')
    await user.type(screen.getByPlaceholderText('000000'), '123456')
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'Password1!')
    await user.type(screen.getByPlaceholderText('Repite la contraseña'), 'Password1!')
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() => expect(screen.getByText('Correo inválido')).toBeInTheDocument())
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('muestra "El código debe tener 6 dígitos" con código corto', async () => {
    const user = userEvent.setup()
    render(<ResetPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'user@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('000000'), '123')
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'Password1!')
    await user.type(screen.getByPlaceholderText('Repite la contraseña'), 'Password1!')
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() => expect(screen.getByText('El código debe tener 6 dígitos')).toBeInTheDocument())
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('muestra "La contraseña debe tener al menos 8 caracteres" con contraseña corta', async () => {
    const user = userEvent.setup()
    render(<ResetPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'user@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('000000'), '123456')
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'short')
    await user.type(screen.getByPlaceholderText('Repite la contraseña'), 'short')
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() =>
      expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument()
    )
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('muestra "Las contraseñas no coinciden" cuando no coinciden', async () => {
    const user = userEvent.setup()
    render(<ResetPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'user@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('000000'), '123456')
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'Password1!')
    await user.type(screen.getByPlaceholderText('Repite la contraseña'), 'OtraPassword!')
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() => expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument())
    expect(mockResetPassword).not.toHaveBeenCalled()
  })
})

describe('ResetPassword — submit exitoso', () => {
  const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'user@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('000000'), '123456')
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'Password1!')
    await user.type(screen.getByPlaceholderText('Repite la contraseña'), 'Password1!')
  }

  it('llama authApi.resetPassword con email, code y newPassword', async () => {
    const user = userEvent.setup()
    mockResetPassword.mockResolvedValue({})
    render(<ResetPassword />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith({
        email: 'user@uta.edu.ec',
        code: '123456',
        newPassword: 'Password1!',
      })
    )
  })

  it('muestra el mensaje de éxito tras restablecer', async () => {
    const user = userEvent.setup()
    mockResetPassword.mockResolvedValue({})
    render(<ResetPassword />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() =>
      expect(screen.getByText(/Contraseña restablecida correctamente/i)).toBeInTheDocument()
    )
  })

  it('el botón cambia a "Procesando..." durante el submit', async () => {
    const user = userEvent.setup()
    mockResetPassword.mockReturnValue(new Promise(() => {}))
    render(<ResetPassword />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Procesando...' })).toBeDisabled()
    )
  })
})

describe('ResetPassword — error del servidor', () => {
  it('muestra el mensaje de error del servidor', async () => {
    const user = userEvent.setup()
    mockResetPassword.mockRejectedValue({
      response: { data: { error: 'Código inválido o expirado' } },
    })
    render(<ResetPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'user@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('000000'), '000000')
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'Password1!')
    await user.type(screen.getByPlaceholderText('Repite la contraseña'), 'Password1!')
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() =>
      expect(screen.getByText(/Código inválido o expirado/i)).toBeInTheDocument()
    )
  })

  it('muestra mensaje genérico cuando el servidor no retorna error', async () => {
    const user = userEvent.setup()
    mockResetPassword.mockRejectedValue(new Error('Network error'))
    render(<ResetPassword />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'user@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('000000'), '123456')
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), 'Password1!')
    await user.type(screen.getByPlaceholderText('Repite la contraseña'), 'Password1!')
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))

    await waitFor(() =>
      expect(screen.getByText(/Error al restablecer la contraseña/i)).toBeInTheDocument()
    )
  })
})
