import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { useAuthStore } from '@/store/authStore'
import type { AuthUser } from '@/store/authStore'

const { mockLogout, mockNavigate } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: useAuthStore.getState().user,
    logout: mockLogout,
    isAdmin: useAuthStore.getState().user?.role === 'ADMIN',
  })),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import Navbar from './Navbar'
import { useAuth } from '@/hooks/useAuth'

const mockUser: AuthUser = {
  id: 'u1', email: 'a@uta.edu.ec', fullName: 'Ana García', role: 'STUDENT',
  status: 'ACTIVE', emailVerified: true, reputationScore: 5, photoUrl: null, career: null, phone: null, neighborhood: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, accessToken: null })
})

describe('Navbar — sin usuario', () => {
  it('muestra "Iniciar Sesión" cuando no hay usuario', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, logout: mockLogout, isAdmin: false })
    render(<Navbar />)
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
  })

  it('muestra "Registrarse" cuando no hay usuario', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, logout: mockLogout, isAdmin: false })
    render(<Navbar />)
    expect(screen.getByText('Registrarse')).toBeInTheDocument()
  })

  it('no muestra links de navegación interna sin usuario', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, logout: mockLogout, isAdmin: false })
    render(<Navbar />)
    expect(screen.queryByText('Buscar Viaje')).not.toBeInTheDocument()
  })
})

describe('Navbar — usuario STUDENT', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser, logout: mockLogout, isAdmin: false })
  })

  it('muestra "Buscar Viaje"', () => {
    render(<Navbar />)
    expect(screen.getByText('Buscar Viaje')).toBeInTheDocument()
  })

  it('muestra "Publicar Viaje"', () => {
    render(<Navbar />)
    expect(screen.getByText('Publicar Viaje')).toBeInTheDocument()
  })

  it('muestra "Mis Solicitudes"', () => {
    render(<Navbar />)
    expect(screen.getByText('Mis Solicitudes')).toBeInTheDocument()
  })

  it('muestra "Mis Viajes"', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: 'Mis Viajes' })).toBeInTheDocument()
  })

  it('NO muestra "Admin" para usuario STUDENT', () => {
    render(<Navbar />)
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })
})

describe('Navbar — usuario ADMIN', () => {
  it('muestra el link "Admin"', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { ...mockUser, role: 'ADMIN' }, logout: mockLogout, isAdmin: true })
    render(<Navbar />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })
})

describe('Navbar — logout', () => {
  it('llama logout y navega a /login al hacer click en el botón de cierre', async () => {
    const user = userEvent.setup()
    mockLogout.mockResolvedValue(undefined)
    vi.mocked(useAuth).mockReturnValue({ user: mockUser, logout: mockLogout, isAdmin: false })
    render(<Navbar />)
    const logoutBtn = screen.getByTitle('Cerrar sesión')
    await user.click(logoutBtn)
    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
