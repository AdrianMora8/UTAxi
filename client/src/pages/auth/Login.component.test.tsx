import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { useAuthStore } from '@/store/authStore'

const { mockLogin, mockNavigate } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/api/auth.api', () => ({
  authApi: { login: mockLogin },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import Login from './Login'

const mockUserResponse = {
  data: {
    accessToken: 'tok-123',
    user: {
      id: 'u1', email: 'student1@uta.edu.ec', fullName: 'Ana', role: 'STUDENT' as const,
      status: 'ACTIVE' as const, emailVerified: true, reputationScore: 5,
      photoUrl: null, career: null, phone: null, neighborhood: null,
    },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, accessToken: null })
})

describe('Login — renderizado', () => {
  it('muestra el campo de email', () => {
    render(<Login />)
    expect(screen.getByPlaceholderText('usuario@uta.edu.ec')).toBeInTheDocument()
  })

  it('muestra el campo de contraseña', () => {
    render(<Login />)
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('muestra el botón "Iniciar Sesión"', () => {
    render(<Login />)
    expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument()
  })

  it('muestra el mensaje de email verificado cuando ?verified=1', () => {
    render(<Login />, { initialEntries: ['/login?verified=1'] })
    expect(screen.getByText(/Email verificado/i)).toBeInTheDocument()
  })
})

describe('Login — submit exitoso', () => {
  it('llama authApi.login con email y password', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(mockUserResponse)
    render(<Login />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'student1@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'student1@uta.edu.ec', password: 'Password123!' })
    })
  })

  it('navega a /trips tras login exitoso', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(mockUserResponse)
    render(<Login />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'student1@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/trips'))
  })

  it('actualiza el store con user y accessToken tras login exitoso', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(mockUserResponse)
    render(<Login />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'student1@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password123!')
    await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('tok-123')
    })
  })
})

describe('Login — errores', () => {
  it('muestra el mensaje de error del servidor', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue({ response: { data: { message: 'Credenciales incorrectas' } } })
    render(<Login />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'student1@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument())
  })

  it('muestra "Credenciales incorrectas" por defecto cuando no hay mensaje del servidor', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new Error('Network error'))
    render(<Login />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'a@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('••••••••'), 'pass')
    await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument())
  })

  it('muestra error de validación "Email inválido" sin hacer submit', async () => {
    const user = userEvent.setup()
    render(<Login />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'no-es-email')
    await user.type(screen.getByPlaceholderText('••••••••'), 'pass')
    await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => expect(screen.getByText('Email inválido')).toBeInTheDocument())
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('el botón cambia a "Entrando..." durante el submit', async () => {
    const user = userEvent.setup()
    // Promise que nunca resuelve para mantener isSubmitting=true
    mockLogin.mockReturnValue(new Promise(() => {}))
    render(<Login />)

    await user.type(screen.getByPlaceholderText('usuario@uta.edu.ec'), 'a@uta.edu.ec')
    await user.type(screen.getByPlaceholderText('••••••••'), 'pass')
    await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrando...' })).toBeDisabled())
  })
})
