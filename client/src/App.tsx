import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { router } from '@/router'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/api/client'

export default function App() {
  useEffect(() => {
    const initializeAuth = async () => {
      const user = useAuthStore.getState().user
      const token = useAuthStore.getState().accessToken

      // Si hay usuario pero no hay token, intentar refrescar
      if (user && !token) {
        try {
          const { data } = await apiClient.post('/auth/refresh', {})
          useAuthStore.getState().setAccessToken(data.accessToken)
        } catch (error) {
          // Si no se puede refrescar, limpiar la autenticación
          useAuthStore.getState().clearAuth()
        }
      }
    }

    initializeAuth()
  }, [])

  return <RouterProvider router={router} />
}
