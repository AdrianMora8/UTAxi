import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '@/store/authStore'
import type { AuthUser } from '@/store/authStore'

const { mockLogout, mockQueryClear } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockQueryClear: vi.fn(),
}))

vi.mock('@/api/auth.api', () => ({
  authApi: { logout: mockLogout },
}))

vi.mock('@/lib/queryClient', () => ({
  queryClient: { clear: mockQueryClear },
}))

import { useAuth } from './useAuth'

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'student@uta.edu.ec',
  fullName: 'Ana García',
  role: 'STUDENT',
  status: 'ACTIVE',
  emailVerified: true,
  reputationScore: 4.8,
  photoUrl: null,
  career: 'FISE',
  phone: null,
  neighborhood: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, accessToken: null })
})

describe('useAuth — user', () => {
  it('retorna null cuando no hay usuario autenticado', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
  })

  it('retorna el usuario cuando está autenticado', () => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok' })
    const { result } = renderHook(() => useAuth())
    expect(result.current.user?.id).toBe('user-1')
  })
})

describe('useAuth — isAdmin', () => {
  it('es false cuando user es null', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAdmin).toBe(false)
  })

  it('es false cuando user tiene role STUDENT', () => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok' })
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAdmin).toBe(false)
  })

  it('es true cuando user tiene role ADMIN', () => {
    useAuthStore.setState({ user: { ...mockUser, role: 'ADMIN' }, accessToken: 'tok' })
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAdmin).toBe(true)
  })
})

describe('useAuth — logout', () => {
  it('llama authApi.logout en el happy path', async () => {
    mockLogout.mockResolvedValue({})
    const { result } = renderHook(() => useAuth())
    await act(async () => { await result.current.logout() })
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('siempre llama clearAuth aunque logout falle', async () => {
    mockLogout.mockRejectedValue(new Error('server down'))
    useAuthStore.setState({ user: mockUser, accessToken: 'tok' })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      try { await result.current.logout() } catch { /* error esperado */ }
    })

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('siempre llama queryClient.clear aunque logout falle', async () => {
    mockLogout.mockRejectedValue(new Error('server down'))
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      try { await result.current.logout() } catch { /* error esperado */ }
    })
    expect(mockQueryClear).toHaveBeenCalledTimes(1)
  })

  it('llama clearAuth y queryClient.clear también en el happy path', async () => {
    mockLogout.mockResolvedValue({})
    useAuthStore.setState({ user: mockUser, accessToken: 'tok' })

    const { result } = renderHook(() => useAuth())
    await act(async () => { await result.current.logout() })

    expect(useAuthStore.getState().user).toBeNull()
    expect(mockQueryClear).toHaveBeenCalledTimes(1)
  })
})
