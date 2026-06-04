import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'STUDENT' | 'ADMIN'
  status: 'ACTIVE' | 'WARNED' | 'SUSPENDED'
  emailVerified: boolean
  reputationScore: number
  photoUrl: string | null
  career: string | null
  phone: string | null
  neighborhood: string | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, accessToken: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (token) => set({ accessToken: token }),
      clearAuth: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'uride-auth',
      // Persistir tanto user como accessToken para evitar perder el token al recargar
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    },
  ),
)
