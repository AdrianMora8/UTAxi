import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth.api'
import { queryClient } from '@/lib/queryClient'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      clearAuth()
      queryClient.clear()
    }
  }

  return { user, logout, isAdmin: user?.role === 'ADMIN' }
}
