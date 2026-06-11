import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'
import type { AuthUser } from './authStore'

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

const adminUser: AuthUser = { ...mockUser, id: 'admin-1', role: 'ADMIN' }

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, accessToken: null })
})

describe('authStore — estado inicial', () => {
  it('user es null por defecto', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('accessToken es null por defecto', () => {
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})

describe('authStore — setAuth', () => {
  it('actualiza user y accessToken al mismo tiempo', () => {
    useAuthStore.getState().setAuth(mockUser, 'tok-abc')
    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.accessToken).toBe('tok-abc')
  })

  it('sobreescribe un setAuth anterior con el nuevo', () => {
    useAuthStore.getState().setAuth(mockUser, 'tok-1')
    useAuthStore.getState().setAuth(adminUser, 'tok-2')
    const state = useAuthStore.getState()
    expect(state.user?.id).toBe('admin-1')
    expect(state.accessToken).toBe('tok-2')
  })
})

describe('authStore — setAccessToken', () => {
  it('actualiza solo el token sin tocar el user', () => {
    useAuthStore.getState().setAuth(mockUser, 'tok-original')
    useAuthStore.getState().setAccessToken('tok-nuevo')
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('tok-nuevo')
    expect(state.user).toEqual(mockUser)
  })

  it('puede actualizar el token aunque user sea null', () => {
    useAuthStore.getState().setAccessToken('tok-sin-user')
    expect(useAuthStore.getState().accessToken).toBe('tok-sin-user')
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe('authStore — clearAuth', () => {
  it('resetea user y accessToken a null', () => {
    useAuthStore.getState().setAuth(mockUser, 'tok-abc')
    useAuthStore.getState().clearAuth()
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })

  it('clearAuth es idempotente — no falla si ya está vacío', () => {
    expect(() => useAuthStore.getState().clearAuth()).not.toThrow()
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe('authStore — persistencia en localStorage', () => {
  it('persiste user y accessToken tras setAuth', () => {
    useAuthStore.getState().setAuth(mockUser, 'tok-persist')
    const stored = JSON.parse(localStorage.getItem('uride-auth') ?? '{}')
    expect(stored.state.user?.id).toBe('user-1')
    expect(stored.state.accessToken).toBe('tok-persist')
  })

  it('clearAuth borra los datos del localStorage', () => {
    useAuthStore.getState().setAuth(mockUser, 'tok-persist')
    useAuthStore.getState().clearAuth()
    const stored = JSON.parse(localStorage.getItem('uride-auth') ?? '{}')
    expect(stored.state.user).toBeNull()
    expect(stored.state.accessToken).toBeNull()
  })

  it('no persiste las funciones del store (solo user y accessToken)', () => {
    useAuthStore.getState().setAuth(mockUser, 'tok-persist')
    const stored = JSON.parse(localStorage.getItem('uride-auth') ?? '{}')
    expect(stored.state.setAuth).toBeUndefined()
    expect(stored.state.clearAuth).toBeUndefined()
  })
})
