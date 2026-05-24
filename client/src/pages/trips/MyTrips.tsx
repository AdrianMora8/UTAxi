import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tripsApi, type Trip } from '@/api/trips.api'
import { usersApi } from '@/api/users.api'
import { useAuthStore } from '@/store/authStore'

type TabMode = 'active' | 'history'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })
}

const STATUS_BADGE: Record<string, { text: string; className: string }> = {
  SCHEDULED:   { text: 'PROGRAMADO',  className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  IN_PROGRESS: { text: 'EN CURSO',    className: 'bg-primary/10 text-primary border border-primary/20' },
  COMPLETED:   { text: 'COMPLETADO',  className: 'bg-tertiary/10 text-tertiary border border-tertiary/20' },
  CANCELLED:   { text: 'CANCELADO',   className: 'bg-zinc-700/30 text-zinc-500 border border-zinc-700/30' },
}

function TripRow({ trip, onCancel }: { trip: Trip; onCancel: (id: string) => void }) {
  const navigate = useNavigate()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const badge = STATUS_BADGE[trip.status] ?? STATUS_BADGE.SCHEDULED
  const isActive = trip.status === 'SCHEDULED' || trip.status === 'IN_PROGRESS'
  const isScheduled = trip.status === 'SCHEDULED'

  return (
    <div className="group bg-surface-container-low rounded-xl overflow-hidden hover:bg-surface-container transition-all duration-200 shadow-lg">
      {trip.status === 'IN_PROGRESS' && (
        <div className="w-full h-0.5 bg-primary animate-pulse" />
      )}
      <div className="p-6 flex flex-col md:flex-row justify-between gap-6">

        {/* Route */}
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-on-surface-variant" />
            <div className="w-px h-8 bg-outline-variant" />
            <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Origen</p>
              <p className="font-headline font-semibold text-lg">{trip.originZone}</p>
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Destino</p>
              <p className="font-headline font-semibold text-lg">{trip.destinationZone}</p>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-2 md:items-center justify-center">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase w-fit ${badge.className}`}>
            {badge.text}
          </span>
          <p className="text-sm text-on-surface-variant">{formatDate(trip.departureTime)}</p>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-on-surface-variant">
              <span className="material-symbols-outlined text-sm align-middle mr-1">people</span>
              {trip.availableSeats}/{trip.totalSeats}
            </span>
            <span className="font-headline font-bold text-white">${Number(trip.pricePerSeat).toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 md:items-end justify-center">
          {isActive && (
            <button
              onClick={() => navigate(`/trips/${trip.id}/requests`)}
              className="flex items-center gap-2 bg-gradient-primary text-on-primary font-headline font-bold py-2 px-5 rounded-lg text-sm uppercase tracking-tighter hover:shadow-[0_0_16px_rgba(156,255,147,0.3)] transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">manage_accounts</span>
              Gestionar
            </button>
          )}
          {isScheduled && (
            <button
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
              className="flex items-center gap-2 border border-white/10 text-on-surface-variant hover:text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Editar
            </button>
          )}
          {isScheduled && !confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex items-center gap-2 text-error/70 hover:text-error font-bold py-2 px-5 rounded-lg text-sm transition-colors border border-error/10 hover:border-error/30"
            >
              <span className="material-symbols-outlined text-sm">cancel</span>
              Cancelar viaje
            </button>
          )}
          {isScheduled && confirmCancel && (
            <div className="bg-error/5 border border-error/20 rounded-xl p-3 space-y-2">
              <p className="text-error text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                Esta acción notificará a todos los pasajeros y reembolsará sus pagos.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCancel(trip.id)}
                  className="flex items-center gap-1 bg-error/10 border border-error/30 text-error font-bold py-2 px-4 rounded-lg text-xs transition-colors hover:bg-error/20"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="text-on-surface-variant hover:text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors border border-white/10"
                >
                  No
                </button>
              </div>
            </div>
          )}
          {trip.status === 'COMPLETED' && (
            <Link
              to={`/trips/${trip.id}/requests`}
              className="flex items-center gap-2 border border-white/10 text-on-surface-variant hover:text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors"
            >
              <span className="material-symbols-outlined text-sm">history</span>
              Ver detalles
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MyTrips() {
  const [tab, setTab] = useState<TabMode>('active')
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe().then((r) => r.data),
    staleTime: 60_000,
  })
  const hasVehicle = !!profileData?.user?.vehicle

  const { data, isLoading } = useQuery({
    queryKey: ['my-trips', user?.id, tab],
    queryFn: () => tripsApi.getMyTrips(
      user!.id,
      tab === 'active' ? undefined : 'COMPLETED',
    ).then((r) => r.data),
    enabled: !!user?.id,
  })

  const cancelMut = useMutation({
    mutationFn: (id: string) => tripsApi.cancelTrip(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-trips'] }),
  })

  const trips = data?.trips ?? []
  const displayed = tab === 'active'
    ? trips.filter((t) => t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS')
    : trips.filter((t) => t.status === 'COMPLETED')

  if (!profileLoading && !hasVehicle) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center mb-8 border border-white/5">
          <span className="material-symbols-outlined text-4xl text-zinc-600">directions_car</span>
        </div>
        <h2 className="text-3xl font-headline font-bold text-white mb-3">Necesitas registrar un vehículo</h2>
        <p className="text-on-surface-variant max-w-sm mb-8">
          Para gestionar viajes como conductor primero debes registrar tu vehículo en tu perfil.
        </p>
        <Link
          to="/profile"
          className="bg-gradient-primary text-on-primary px-8 py-3 rounded-xl font-headline font-bold uppercase tracking-tighter hover:shadow-[0_0_20px_rgba(156,255,147,0.4)] transition-all"
        >
          Ir a mi Perfil
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <main className="pt-6 pb-20 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">

        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-primary font-label text-xs font-bold tracking-[0.2em] uppercase mb-2 block">
                Panel del Conductor
              </span>
              <h2 className="text-5xl md:text-6xl font-headline font-bold tracking-tighter text-white leading-none">
                Mis Viajes
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2 bg-surface-container-low p-1 rounded-xl">
                <button
                  onClick={() => setTab('active')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === 'active'
                      ? 'bg-surface-container-highest text-white'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  Activos
                </button>
                <button
                  onClick={() => setTab('history')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === 'history'
                      ? 'bg-surface-container-highest text-white'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  Completados
                </button>
              </div>
              <Link
                to="/trips/new"
                className="bg-gradient-primary text-on-primary font-headline font-bold py-2 px-6 rounded-xl text-sm uppercase tracking-tighter hover:shadow-[0_0_20px_rgba(156,255,147,0.4)] transition-all"
              >
                + Publicar
              </Link>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-surface-container-low rounded-xl h-32 animate-pulse" />
            ))
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center mb-8 border border-white/5">
                <span className="material-symbols-outlined text-4xl text-zinc-600">
                  {tab === 'active' ? 'directions_car' : 'history'}
                </span>
              </div>
              <h3 className="text-2xl font-headline font-bold text-white mb-2">
                {tab === 'active' ? 'Sin viajes activos' : 'Sin viajes completados'}
              </h3>
              <p className="text-on-surface-variant max-w-xs mx-auto mb-8">
                {tab === 'active'
                  ? 'Publica tu primer viaje y conecta con tus compañeros.'
                  : 'Tus viajes completados aparecerán aquí.'}
              </p>
              {tab === 'active' && (
                <Link
                  to="/trips/new"
                  className="bg-gradient-primary text-on-primary px-8 py-3 rounded-lg font-headline font-bold uppercase tracking-tighter"
                >
                  Publicar Viaje
                </Link>
              )}
            </div>
          ) : (
            displayed.map((trip) => (
              <TripRow key={trip.id} trip={trip} onCancel={(id) => cancelMut.mutate(id)} />
            ))
          )}
        </div>
      </main>

      <footer className="w-full py-12 px-8 bg-[#0e0e0e] border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="font-headline font-bold text-primary text-xl">U-Ride</span>
            <p className="font-label text-xs uppercase tracking-widest text-zinc-600 mt-4">
              © 2024 U-Ride Institutional. Powered by Academic Kinetic.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 md:justify-end">
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Centro de Ayuda</span>
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Privacidad</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
