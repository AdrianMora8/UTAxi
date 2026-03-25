import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AppShell from '@/components/layout/AppShell'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'))
const Home = lazy(() => import('@/pages/Home'))

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export const router = createBrowserRouter([
  // Rutas públicas (sin layout)
  {
    path: '/login',
    element: (
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: '/register',
    element: (
      <Suspense fallback={<Loading />}>
        <Register />
      </Suspense>
    ),
  },
  {
    path: '/verify-email',
    element: (
      <Suspense fallback={<Loading />}>
        <VerifyEmail />
      </Suspense>
    ),
  },

  // Rutas protegidas (con layout)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: (
              <Suspense fallback={<Loading />}>
                <Home />
              </Suspense>
            ),
          },
          // Fase 2+: trips, profile, admin, etc.
        ],
      },
    ],
  },

  // Fallback — rutas no encontradas van al login (evita loop con rutas aún no implementadas)
  { path: '*', element: <Navigate to="/login" replace /> },
])
