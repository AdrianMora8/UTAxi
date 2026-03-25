import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface Props {
  requireAdmin?: boolean
}

export default function ProtectedRoute({ requireAdmin = false }: Props) {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
