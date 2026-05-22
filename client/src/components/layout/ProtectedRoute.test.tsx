import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeQueryClient } from '@/test/test-utils'
import { useAuthStore } from '@/store/authStore'
import type { AuthUser } from '@/store/authStore'
import ProtectedRoute from './ProtectedRoute'

const mockUser: AuthUser = {
  id: 'u1', email: 'a@uta.edu.ec', fullName: 'Ana', role: 'STUDENT',
  status: 'ACTIVE', emailVerified: true, reputationScore: 5, photoUrl: null, career: null, phone: null, neighborhood: null,
}

function renderRoutes(initialPath: string) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<div>Home Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin" element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null })
})

describe('ProtectedRoute', () => {
  it('redirige a /login cuando no hay usuario autenticado', () => {
    renderRoutes('/protected')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renderiza el contenido protegido cuando el usuario está autenticado', () => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok' })
    renderRoutes('/protected')
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('redirige a / cuando requireAdmin=true y el usuario es STUDENT', () => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok' })
    renderRoutes('/admin')
    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('renderiza el contenido admin cuando requireAdmin=true y el usuario es ADMIN', () => {
    useAuthStore.setState({ user: { ...mockUser, role: 'ADMIN' }, accessToken: 'tok' })
    renderRoutes('/admin')
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })
})
