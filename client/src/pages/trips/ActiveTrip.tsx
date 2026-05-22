import { lazy, Suspense, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tripsApi } from '@/api/trips.api'
import { useAuthStore } from '@/store/authStore'
import { useTracking } from '@/hooks/useTracking'

// Lazy-load the map to avoid SSR issues with Leaflet
const TripMap = lazy(() => import('@/components/map/TripMap'))

export default function ActiveTrip() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.getTripById(id!).then((r) => r.data.trip),
    enabled: !!id,
    refetchInterval: 30_000,
  })

  const isDriver = trip?.driverId === user?.id
  const [eta, setEta] = useState<number | null>(null)

  const { driverLocation, connected, error } = useTracking({
    tripId: id ?? '',
    isDriver,
  })

  const driverInitials = trip?.driver?.fullName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('') ?? '?'

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-surface flex items-center justify-center z-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-tertiary border-t-transparent" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center gap-4 z-50">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <p className="text-on-surface-variant">Viaje no encontrado.</p>
        <Link to="/trips" className="text-primary text-sm hover:underline">← Volver a viajes</Link>
      </div>
    )
  }

  return (
    /* Full-screen layout — intentionally breaks out of AppShell max-width */
    <div className="fixed inset-0 bg-surface text-on-surface font-body flex flex-col z-40 overflow-hidden">

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-3 bg-gradient-to-b from-surface/90 to-transparent">
        <Link
          to={`/trips/${id}`}
          className="flex items-center gap-2 bg-surface-container-low/80 backdrop-blur-md px-3 py-2 rounded-lg text-on-surface-variant hover:text-white transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Detalle
        </Link>

        <div className="flex items-center gap-2 bg-surface-container-low/80 backdrop-blur-md px-3 py-2 rounded-lg">
          {connected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <span className="text-tertiary text-xs font-bold uppercase tracking-widest">
                {isDriver ? 'Transmitiendo GPS' : 'Tracking activo'}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Conectando...</span>
            </>
          )}
        </div>
      </div>

      {/* ── Map (65% height) ── */}
      <div className="flex-1 relative" style={{ minHeight: '65vh' }}>
        <Suspense
          fallback={
            <div className="w-full h-full bg-surface-container-high flex flex-col items-center justify-center gap-4">
              <span className="material-symbols-outlined text-tertiary text-5xl animate-pulse">map</span>
              <p className="text-on-surface-variant text-sm">Cargando mapa...</p>
            </div>
          }
        >
          <TripMap
            driverLocation={driverLocation}
            originZone={trip.originZone}
            destinationZone={trip.destinationZone}
            destLat={trip.destLat}
            destLng={trip.destLng}
            onEtaUpdate={setEta}
          />
        </Suspense>

        {/* Floating driver location label — only when tracking */}
        {driverLocation && (
          <div className="absolute top-16 left-4 z-[999] flex items-center gap-2 bg-surface-container-low/90 backdrop-blur-md px-3 py-2 rounded-lg border border-tertiary/20">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-tertiary animate-ping opacity-40" />
              <span className="relative w-2 h-2 rounded-full bg-tertiary block" />
            </div>
            <span className="text-tertiary text-xs font-bold">
              {trip.originZone} • En Camino
            </span>
          </div>
        )}

        {/* GPS error pill */}
        {error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 bg-error/20 border border-error/30 backdrop-blur-md px-4 py-2 rounded-full">
            <span className="material-symbols-outlined text-error text-sm">gps_off</span>
            <span className="text-error text-xs font-bold">{error}</span>
          </div>
        )}
      </div>

      {/* ── Bottom panel (35%) ── */}
      <div
        className="bg-surface-container-low flex flex-col px-6 pt-6 pb-8 gap-6 shadow-[0_-32px_48px_rgba(0,0,0,0.6)]"
        style={{ minHeight: '35vh' }}
      >
        {/* Status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-tertiary/10 text-tertiary border border-tertiary/20">
              {trip.status === 'IN_PROGRESS' ? 'Viaje en Curso' : trip.status}
            </span>
            {isDriver && (
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                Conductor
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-on-surface-variant text-[10px] uppercase tracking-widest">ETA</p>
            <p className="font-headline text-3xl font-extrabold text-white">
              {eta !== null ? `${eta} MIN` : '— MIN'}
            </p>
          </div>
        </div>

        {/* Route + driver row */}
        <div className="flex items-center gap-4">
          {/* Route summary */}
          <div className="flex-1 flex items-center gap-3 bg-surface-container p-4 rounded-xl">
            <div className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="w-px h-5 bg-outline-variant" />
              <div className="w-2 h-2 rounded-sm bg-tertiary" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{trip.originZone}</p>
              <p className="text-xs text-on-surface-variant truncate">{trip.destinationZone}</p>
            </div>
          </div>

          {/* Driver card */}
          <div className="flex items-center gap-3 bg-surface-container p-4 rounded-xl">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center">
                <span className="font-headline font-bold text-sm text-on-surface-variant">
                  {driverInitials}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-tertiary rounded-full border-2 border-surface-container-low animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-on-surface-variant">Conductor</p>
              <p className="text-sm font-bold text-white truncate max-w-[100px]">
                {trip.driver?.fullName ?? '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-on-surface-variant uppercase tracking-widest">
            <span>{trip.originZone}</span>
            <span>{trip.destinationZone}</span>
          </div>
          <div className="relative h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: driverLocation ? '45%' : '10%',
                background: 'linear-gradient(90deg, #9cff93, #8af2ff)',
                transition: 'width 1s ease',
              }}
            />
            {/* Pulse dot on progress */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-tertiary shadow-[0_0_8px_#8af2ff] border-2 border-surface-container-low"
              style={{
                left: `calc(${driverLocation ? 45 : 10}% - 6px)`,
                transition: 'left 1s ease',
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Chat — decorative */}
          <button
            type="button"
            className="flex items-center justify-center gap-2 bg-surface-container py-3 rounded-xl text-on-surface-variant hover:text-white border border-white/5 transition-colors text-sm font-bold"
            onClick={() => {/* decorative */}}
          >
            <span className="material-symbols-outlined text-xl">chat_bubble</span>
            Chat
          </button>

          {/* SOS — decorative coral */}
          <button
            type="button"
            className="flex items-center justify-center gap-2 bg-error/10 hover:bg-error/20 border border-error/20 py-3 rounded-xl text-error transition-colors text-sm font-bold"
            onClick={() => {/* decorative */}}
          >
            <span className="material-symbols-outlined text-xl">sos</span>
            Seguridad U-Ride
          </button>
        </div>
      </div>
    </div>
  )
}
