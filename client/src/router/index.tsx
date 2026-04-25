import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AppShell from '@/components/layout/AppShell'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const Home = lazy(() => import('@/pages/Home'))
const TripList = lazy(() => import('@/pages/trips/TripList'))
const TripDetail = lazy(() => import('@/pages/trips/TripDetail'))
const Profile = lazy(() => import('@/pages/profile/Profile'))
const CreateTrip = lazy(() => import('@/pages/trips/CreateTrip'))
const ManageRequests = lazy(() => import('@/pages/trips/ManageRequests'))
const MyRequests = lazy(() => import('@/pages/requests/MyRequests'))
const Payment = lazy(() => import('@/pages/payments/Payment'))
const ActiveTrip = lazy(() => import('@/pages/trips/ActiveTrip'))
const Report = lazy(() => import('@/pages/reports/Report'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))

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
  {
    path: '/forgot-password',
    element: (
      <Suspense fallback={<Loading />}>
        <ForgotPassword />
      </Suspense>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <Suspense fallback={<Loading />}>
        <ResetPassword />
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
          {
            path: '/trips',
            element: (
              <Suspense fallback={<Loading />}>
                <TripList />
              </Suspense>
            ),
          },
          {
            path: '/trips/:id',
            element: (
              <Suspense fallback={<Loading />}>
                <TripDetail />
              </Suspense>
            ),
          },
          {
            path: '/profile',
            element: (
              <Suspense fallback={<Loading />}>
                <Profile />
              </Suspense>
            ),
          },
          {
            path: '/trips/new',
            element: (
              <Suspense fallback={<Loading />}>
                <CreateTrip />
              </Suspense>
            ),
          },
          {
            path: '/trips/:id/requests',
            element: (
              <Suspense fallback={<Loading />}>
                <ManageRequests />
              </Suspense>
            ),
          },
          {
            path: '/requests',
            element: (
              <Suspense fallback={<Loading />}>
                <MyRequests />
              </Suspense>
            ),
          },
          {
            path: '/pay/:requestId',
            element: (
              <Suspense fallback={<Loading />}>
                <Payment />
              </Suspense>
            ),
          },
          {
            path: '/trips/:id/active',
            element: (
              <Suspense fallback={<Loading />}>
                <ActiveTrip />
              </Suspense>
            ),
          },
          {
            path: '/reports',
            element: (
              <Suspense fallback={<Loading />}>
                <Report />
              </Suspense>
            ),
          },
          // Fase 8: admin
        ],
      },
    ],
  },

  // Ruta admin — layout propio (sidebar), solo rol ADMIN
  {
    element: <ProtectedRoute requireAdmin />,
    children: [
      {
        path: '/admin',
        element: (
          <Suspense fallback={<Loading />}>
            <AdminDashboard />
          </Suspense>
        ),
      },
    ],
  },

  // Fallback — rutas no encontradas van al login (evita loop con rutas aún no implementadas)
  { path: '*', element: <Navigate to="/login" replace /> },
])
