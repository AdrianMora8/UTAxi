import { lazy, Suspense, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestsApi } from '@/api/requests.api'
import { tripsApi } from '@/api/trips.api'
import RatingModal from '@/components/ratings/RatingModal'
import { useNotifications } from '@/hooks/useNotifications'

const RouteMap = lazy(() => import('@/components/map/RouteMap'))

export default function ManageRequests() {
  const { id: tripId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [ratingTarget, setRatingTarget] = useState<{ requestId: string; driverName: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  useNotifications({
    onRequestNew: useCallback(({ tripId: incomingTripId, passengerName }) => {
      if (incomingTripId !== tripId) return
      qc.invalidateQueries({ queryKey: ['trip-requests', tripId] })
      qc.invalidateQueries({ queryKey: ['trip', tripId] })
      showToast(`Nueva solicitud de ${passengerName}`)
    }, [tripId, qc, showToast]),
  })

  const { data: tripData } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.getTripById(tripId!).then((r) => r.data.trip),
    enabled: !!tripId,
  })

  const { data: reqData, isLoading } = useQuery({
    queryKey: ['trip-requests', tripId],
    queryFn: () => requestsApi.getRequestsByTrip(tripId!).then((r) => r.data.requests),
    enabled: !!tripId,
    refetchInterval: 15_000,
  })

  const respondMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ACCEPT' | 'REJECT' }) =>
      requestsApi.respondToRequest(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip-requests', tripId] })
      qc.invalidateQueries({ queryKey: ['trip', tripId] })
    },
  })

  const startTripMut = useMutation({
    mutationFn: () => tripsApi.updateTripStatus(tripId!, 'IN_PROGRESS'),
    onSuccess: () => {
      navigate(`/trips/${tripId}/active`)
    },
  })

  const completeTripMut = useMutation({
    mutationFn: () => tripsApi.updateTripStatus(tripId!, 'COMPLETED'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip', tripId] })
      qc.invalidateQueries({ queryKey: ['trip-requests', tripId] })
    },
  })

  const arrivalMut = useMutation({
    mutationFn: ({ id, arrived }: { id: string; arrived: boolean }) =>
      requestsApi.markArrival(id, arrived),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trip-requests', tripId] }),
  })

  const trip = tripData
  const requests = reqData ?? []
  const pending  = requests.filter((r) => r.status === 'PENDING')
  const accepted = requests.filter((r) => r.status === 'ACCEPTED')
  const history  = requests.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED')

  const depTime = trip
    ? new Date(trip.departureTime).toLocaleString('es-EC', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—'

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <main className="pt-6 pb-12 px-6 lg:px-24 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ── Left: Trip summary (4/12) ── */}
        <div className="lg:col-span-4 space-y-8">

          {/* Breadcrumb */}
          <Link
            to="/trips"
            className="flex items-center gap-2 text-on-surface-variant hover:text-white text-sm transition-colors w-fit"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Mis viajes
          </Link>

          {/* Trip summary card */}
          <section className="bg-surface-container-low rounded-xl p-6 border-l-4 border-primary">
            <span className="text-primary font-headline font-bold text-xs uppercase tracking-[0.2em] block mb-2">
              Viaje Programado
            </span>
            {trip ? (
              <>
                <h1 className="text-2xl font-headline font-bold text-on-surface mb-4">
                  {trip.originZone} → {trip.destinationZone}
                </h1>
                <div className="space-y-3 text-on-surface-variant text-sm">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                      schedule
                    </span>
                    <span>{depTime}</span>
                  </div>
                  {trip.driver.vehicle && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                        directions_car
                      </span>
                      <span>
                        {trip.driver.vehicle.brand} {trip.driver.vehicle.model} •{' '}
                        {trip.driver.vehicle.color}
                        {trip.driver.vehicle.plateNumber ? ` • ${trip.driver.vehicle.plateNumber}` : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                      event_seat
                    </span>
                    <span>
                      {trip.availableSeats} asiento{trip.availableSeats !== 1 ? 's' : ''} disponible
                      {trip.availableSeats !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                      payments
                    </span>
                    <span>${Number(trip.pricePerSeat).toFixed(2)} / asiento</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-24 animate-pulse bg-surface-container rounded-lg" />
            )}
          </section>

          {/* Control de Viaje */}
          {trip?.status === 'SCHEDULED' && (
            <section className="bg-surface-container-low rounded-xl p-6 border-l-4 border-tertiary">
              <h2 className="text-xl font-headline font-bold mb-4 text-tertiary">Control de Viaje</h2>
              <p className="text-sm text-on-surface-variant mb-6">
                Cuando todos tus pasajeros estén a bordo o sea la hora de partida, inicia el viaje para comenzar a transmitir tu ubicación por GPS.
              </p>
              <button
                onClick={() => startTripMut.mutate()}
                disabled={startTripMut.isPending}
                className="w-full bg-gradient-to-r from-tertiary/20 to-primary/20 hover:from-tertiary/30 hover:to-primary/30 border border-tertiary/30 text-tertiary font-headline font-bold py-4 rounded-xl text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">play_arrow</span>
                {startTripMut.isPending ? 'Iniciando...' : 'Empezar Viaje'}
              </button>
            </section>
          )}

          {trip?.status === 'IN_PROGRESS' && (
            <section className="bg-surface-container-low rounded-xl p-6 border-l-4 border-primary space-y-3">
              <h2 className="text-xl font-headline font-bold mb-4 text-primary">Viaje en Curso</h2>
              <button
                onClick={() => navigate(`/trips/${tripId}/active`)}
                className="w-full bg-gradient-primary hover:shadow-[0_0_20px_rgba(156,255,147,0.4)] text-on-primary font-headline font-bold py-4 rounded-xl text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">map</span>
                Ir al Mapa GPS
              </button>
              <button
                onClick={() => {
                  if (window.confirm('¿Confirmas que el viaje ha finalizado?')) {
                    completeTripMut.mutate()
                  }
                }}
                disabled={completeTripMut.isPending}
                className="w-full bg-surface-container hover:bg-surface-container-high border border-primary/30 text-primary font-headline font-bold py-4 rounded-xl text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">check_circle</span>
                {completeTripMut.isPending ? 'Completando...' : 'Completar Viaje'}
              </button>
            </section>
          )}

          {trip?.status === 'COMPLETED' && (
            <section className="bg-surface-container-low rounded-xl p-6 border-l-4 border-on-surface-variant">
              <h2 className="text-xl font-headline font-bold mb-2 text-on-surface-variant">Viaje Completado</h2>
              <p className="text-sm text-on-surface-variant/70">Este viaje ha finalizado exitosamente.</p>
            </section>
          )}

          {/* Route map */}
          <div className="rounded-xl overflow-hidden h-48 relative">
            {tripData ? (
              <Suspense fallback={<div className="h-full w-full bg-surface-container flex items-center justify-center"><span className="material-symbols-outlined text-on-surface-variant/20 text-[80px]">map</span></div>}>
                <RouteMap
                  originZone={tripData.originZone}
                  originLat={tripData.originLat}
                  originLng={tripData.originLng}
                  destinationZone={tripData.destinationZone}
                  destLat={tripData.destLat}
                  destLng={tripData.destLng}
                />
              </Suspense>
            ) : (
              <div className="h-full w-full bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant/20 text-[80px]">map</span>
              </div>
            )}
          </div>

          {/* Safety rules */}
          <section className="bg-surface-container rounded-xl p-6">
            <h2 className="text-xl font-headline font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">shield</span>
              Reglas de Seguridad
            </h2>
            <div className="space-y-4">
              {[
                { icon: 'badge', title: 'Identificación Requerida', desc: 'Muestra tu credencial universitaria digital antes de abordar.' },
                { icon: 'share_location', title: 'Seguimiento en Vivo', desc: 'Este viaje está bajo monitoreo GPS institucional.' },
                { icon: 'contact_support', title: 'Botón de Pánico', desc: 'Disponible en la app durante todo el trayecto.' },
              ].map((r) => (
                <div key={r.icon} className="flex gap-4">
                  <div className="w-8 h-8 rounded bg-tertiary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-tertiary text-lg">{r.icon}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    <strong className="text-on-surface block">{r.title}</strong>
                    {r.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right: Requests (8/12) ── */}
        <div className="lg:col-span-8 space-y-8">

          {/* Pending requests */}
          <section>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-headline font-bold">Solicitudes Pendientes</h2>
              {pending.length > 0 && (
                <span className="text-primary font-headline font-bold text-sm bg-primary/10 px-3 py-1 rounded-full">
                  {pending.length} Nueva{pending.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map((i) => (
                  <div key={i} className="bg-surface-container rounded-xl h-48 animate-pulse" />
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="bg-surface-container-low rounded-xl p-10 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/20 text-[60px]">inbox</span>
                <p className="text-on-surface-variant mt-3">No hay solicitudes pendientes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pending.map((req) => {
                  const p = req.passenger!
                  const initials = p.fullName.split(' ').slice(0, 2).map((n) => n[0]).join('')
                  const ago = new Date(req.createdAt).toLocaleTimeString('es-EC', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  return (
                    <div
                      key={req.id}
                      className="bg-surface-container rounded-xl p-5 hover:bg-surface-container-high transition-all border border-white/5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                            <span className="font-headline font-bold text-sm text-on-surface-variant">
                              {initials}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-headline font-bold text-on-surface">{p.fullName}</h3>
                            <p className="text-xs text-on-surface-variant">
                              {p.career ?? 'Estudiante'} •{' '}
                              <span className="text-tertiary">{p.reputationScore.toFixed(1)} ★</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">{ago}</span>
                      </div>

                      {req.message && (
                        <p className="text-sm text-on-surface-variant mb-6 italic">"{req.message}"</p>
                      )}
                      {!req.message && <div className="mb-6" />}

                      <div className="flex gap-3">
                        <button
                          onClick={() => respondMut.mutate({ id: req.id, action: 'REJECT' })}
                          disabled={respondMut.isPending}
                          className="flex-1 py-3 rounded-lg bg-surface-container-highest text-white font-headline font-bold text-xs uppercase tracking-widest hover:bg-error/20 hover:text-error transition-all active:scale-95 disabled:opacity-50"
                        >
                          Declinar
                        </button>
                        <button
                          onClick={() => respondMut.mutate({ id: req.id, action: 'ACCEPT' })}
                          disabled={respondMut.isPending}
                          className="flex-1 py-3 rounded-lg bg-gradient-primary text-on-primary font-headline font-bold text-xs uppercase tracking-widest shadow-[0_4px_16px_rgba(0,252,64,0.2)] active:scale-95 transition-transform disabled:opacity-50"
                        >
                          Aceptar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Confirmed passengers */}
          <section className="bg-surface-container-low rounded-2xl p-8">
            <h2 className="text-2xl font-headline font-bold mb-8">Pasajeros Confirmados</h2>

            {accepted.length === 0 ? (
              <div className="text-center py-6">
                <span className="material-symbols-outlined text-on-surface-variant/20 text-[60px]">
                  group
                </span>
                <p className="text-on-surface-variant mt-3 text-sm">
                  Aún no hay pasajeros confirmados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {accepted.map((req) => {
                  const p = req.passenger!
                  const initials = p.fullName.split(' ').slice(0, 2).map((n) => n[0]).join('')
                  const arrived = !!req.arrivedAt
                  const hasRating = !!req.rating
                  return (
                    <div
                      key={req.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        arrived
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-surface-container/50 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center">
                            <span className="font-headline font-bold text-on-surface-variant">
                              {initials}
                            </span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-surface-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-primary material-symbols-filled" style={{ fontSize: 12 }}>
                              check
                            </span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-headline font-bold">{p.fullName}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-primary font-bold">Aceptado</span>
                            <span className="text-xs text-on-surface-variant">• {p.reputationScore.toFixed(1)} ★</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => arrivalMut.mutate({ id: req.id, arrived: !arrived })}
                          disabled={arrivalMut.isPending}
                          className={`flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            arrived
                              ? 'bg-primary text-on-primary'
                              : 'border border-primary/30 text-primary hover:bg-primary/10'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm material-symbols-filled">
                            {arrived ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          {arrived ? 'Llegó' : 'Marcar llegada'}
                        </button>
                        {!hasRating ? (
                          <button
                            onClick={() => setRatingTarget({ requestId: req.id, driverName: p.fullName })}
                            className="flex items-center gap-1 py-2 px-3 rounded-lg text-xs font-bold border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm material-symbols-filled">star</span>
                            Calificar
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 py-2 px-3 rounded-lg text-xs font-bold text-primary border border-primary/10 bg-primary/5">
                            <span className="material-symbols-outlined text-sm material-symbols-filled">star</span>
                            {req.rating!.score}/5
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Security pulse */}
            <div className="mt-6 p-6 rounded-xl bg-tertiary/5 border border-tertiary/20 flex items-center gap-6">
              <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                <div className="absolute inset-0 bg-tertiary rounded-full animate-pulse opacity-20" />
                <div className="w-12 h-12 bg-tertiary rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-tertiary material-symbols-filled">security</span>
                </div>
              </div>
              <div>
                <p className="text-tertiary font-headline font-bold uppercase tracking-widest text-xs mb-1">Monitoreo U-Ride</p>
                <p className="text-on-surface-variant text-sm">Tu viaje está bajo supervisión activa del equipo de transporte institucional.</p>
              </div>
            </div>
          </section>

          {/* Historial (rechazados / cancelados) */}
          {history.length > 0 && (
            <section className="bg-surface-container-low rounded-2xl p-8">
              <h2 className="text-xl font-headline font-bold mb-6 text-on-surface-variant">
                Historial de Solicitudes
              </h2>
              <div className="space-y-3">
                {history.map((req) => {
                  const p = req.passenger!
                  const initials = p.fullName.split(' ').slice(0, 2).map((n) => n[0]).join('')
                  const isRejected = req.status === 'REJECTED'
                  const rejCount = req.rejectionCount ?? 0
                  return (
                    <div key={req.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-container/30 border border-white/5 opacity-70">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
                          <span className="font-headline font-bold text-xs text-on-surface-variant">{initials}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{p.fullName}</p>
                          {p.career && <p className="text-xs text-on-surface-variant">{p.career}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isRejected && (
                          <span className="text-xs text-on-surface-variant">
                            {rejCount}/3 rechazos{rejCount >= 3 ? ' · Bloqueado' : ''}
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                          isRejected
                            ? 'bg-error/10 text-error border border-error/20'
                            : 'bg-zinc-700/30 text-zinc-500 border border-zinc-700/30'
                        }`}>
                          {isRejected ? 'Rechazado' : 'Cancelado'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-container-highest border border-primary/30 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-lg">notifications_active</span>
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}

      {ratingTarget && (
        <RatingModal
          tripRequestId={ratingTarget.requestId}
          driverName={ratingTarget.driverName}
          onClose={() => setRatingTarget(null)}
        />
      )}

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
