import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <>
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0e0e0e]/80 backdrop-blur-md shadow-[0_0_32px_rgba(0,255,65,0.08)]">
        <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tighter text-white uppercase font-headline"
          >
            U-Ride
          </Link>

          {user && (
            <div className="hidden md:flex items-center gap-8">
              <Link
                to="/trips"
                className={`font-headline tracking-tight transition-colors pb-1 ${
                  isActive('/trips')
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Buscar Viaje
              </Link>
              <Link
                to="/trips/new"
                className={`font-headline tracking-tight transition-colors pb-1 ${
                  isActive('/trips/new')
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Publicar Viaje
              </Link>
              <Link
                to="/requests"
                className={`font-headline tracking-tight transition-colors pb-1 ${
                  isActive('/requests')
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Mis Solicitudes
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`font-headline tracking-tight transition-colors pb-1 ${
                    isActive('/admin')
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-2 ml-2">
                <Link
                  to="/profile"
                  className="material-symbols-outlined text-primary hover:bg-surface-container-highest p-2 rounded-full transition-all duration-300"
                >
                  account_circle
                </Link>
                <button
                  onClick={handleLogout}
                  className="material-symbols-outlined text-zinc-400 hover:text-error hover:bg-surface-container-highest p-2 rounded-full transition-all duration-300"
                  title="Cerrar sesión"
                >
                  logout
                </button>
              </div>
            </div>
          )}

          {!user && (
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/login"
                className="font-headline tracking-tight text-zinc-400 hover:text-white transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="bg-gradient-primary text-on-primary px-5 py-2 rounded-lg font-headline font-bold text-sm hover:shadow-[0_0_20px_rgba(156,255,147,0.3)] transition-all"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      {user && (
        <nav className="md:hidden fixed bottom-0 w-full bg-surface-container-low z-50 border-t border-white/5">
          <div className="flex justify-around items-center py-3 px-4">
            <Link
              to="/trips"
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive('/trips') ? 'text-primary' : 'text-zinc-500'
              }`}
            >
              <span className="material-symbols-outlined text-xl">search</span>
              <span className="text-[10px] font-label uppercase tracking-widest">Buscar</span>
            </Link>
            <Link
              to="/trips/new"
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive('/trips/new') ? 'text-primary' : 'text-zinc-500'
              }`}
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              <span className="text-[10px] font-label uppercase tracking-widest">Publicar</span>
            </Link>
            <Link
              to="/requests"
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive('/requests') ? 'text-primary' : 'text-zinc-500'
              }`}
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="text-[10px] font-label uppercase tracking-widest">Alertas</span>
            </Link>
            <Link
              to="/profile"
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive('/profile') ? 'text-primary' : 'text-zinc-500'
              }`}
            >
              <span className="material-symbols-outlined text-xl">person</span>
              <span className="text-[10px] font-label uppercase tracking-widest">Perfil</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  )
}
