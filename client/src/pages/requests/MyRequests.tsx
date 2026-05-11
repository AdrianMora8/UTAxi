import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestsApi } from '@/api/requests.api'
import RatingModal from '@/components/ratings/RatingModal'
import { useNotifications, type RequestUpdatePayload } from '@/hooks/useNotifications'

type TabMode = 'active' | 'history'

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  PENDING:   { text: 'PENDIENTE',  className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  ACCEPTED:  { text: 'ACEPTADO',   className: 'bg-primary/10 text-primary border border-primary/20' },
  COMPLETED: { text: 'COMPLETADO', className: 'bg-tertiary/10 text-tertiary border border-tertiary/20' },
  REJECTED:  { text: 'RECHAZADO',  className: 'bg-error/10 text-error border border-error/20' },
  CANCELLED: { text: 'CANCELADO',  className: 'bg-zinc-700/30 text-zinc-500 border border-zinc-700/30' },
}

export default function MyRequests() {
  const [tab, setTab] = useState<TabMode>('active')
  const [ratingTarget, setRatingTarget] = useState<{ requestId: string; driverName: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  useNotifications({
    onRequestUpdate: useCallback((payload: RequestUpdatePayload) => {
      qc.invalidateQueries({ queryKey: ['my-requests'] })
      if (payload.status === 'ACCEPTED') showToast('¡Tu solicitud fue aceptada!')
      else if (payload.status === 'REJECTED') showToast(`Solicitud rechazada (${payload.rejectionCount}/3 intentos)`)
    }, [qc, showToast]),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => requestsApi.getMyRequests().then((r) => r.data.requests),
    refetchInterval: 20_000,
  })

  const cancelMut = useMutation({
    mutationFn: (id: string) => requestsApi.cancelRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-requests'] }),
  })

  const retryMut = useMutation({
    mutationFn: (tripId: string) => requestsApi.createRequest(tripId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-requests'] }),
  })

  const requests = data ?? []
  const active  = requests.filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED' || r.status === 'COMPLETED')
  const history = requests.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED')
  const displayed = tab === 'active' ? active : history

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <main className="pt-6 pb-20 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">

        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-primary font-label text-xs font-bold tracking-[0.2em] uppercase mb-2 block">
                Panel de Pasajero
              </span>
              <h2 className="text-5xl md:text-6xl font-headline font-bold tracking-tighter text-white leading-none">
                Mis Solicitudes
              </h2>
            </div>
            <div className="flex gap-2 bg-surface-container-low p-1 rounded-xl w-fit">
              <button
                onClick={() => setTab('active')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === 'active'
                    ? 'bg-surface-container-highest text-white'
                    : 'text-on-surface-variant hover:text-white'
                }`}
              >
                Activas
              </button>
              <button
                onClick={() => setTab('history')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === 'history'
                    ? 'bg-surface-container-highest text-white'
                    : 'text-on-surface-variant hover:text-white'
                }`}
              >
                Historial
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left: Request list (8/12) ── */}
          <div className="lg:col-span-8 space-y-6">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-surface-container-low rounded-xl h-40 animate-pulse" />
              ))
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center mb-8 border border-white/5">
                  <span className="material-symbols-outlined text-4xl text-zinc-600">directions_car</span>
                </div>
                <h3 className="text-2xl font-headline font-bold text-white mb-2">
                  {tab === 'active' ? 'No tienes viajes activos' : 'Sin historial'}
                </h3>
                <p className="text-on-surface-variant max-w-xs mx-auto mb-8">
                  {tab === 'active'
                    ? '¿Planeando tu próxima clase? Busca un viaje compartido.'
                    : 'Tus solicitudes pasadas aparecerán aquí.'}
                </p>
                <Link
                  to="/trips"
                  className="bg-gradient-primary text-on-primary px-8 py-3 rounded-lg font-headline font-bold uppercase tracking-tighter"
                >
                  Buscar Viaje
                </Link>
              </div>
            ) : (
              displayed.map((req) => {
                const trip = req.trip!
                const driver = trip.driver
                const depTime = new Date(trip.departureTime).toLocaleString('es-EC', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
                const badge = STATUS_LABEL[req.status] ?? STATUS_LABEL.PENDING
                const driverInitials = driver
                  ? driver.fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('')
                  : '?'
                const isAccepted  = req.status === 'ACCEPTED'
                const isPending   = req.status === 'PENDING'
                const isRejected  = req.status === 'REJECTED'
                const isCompleted = req.status === 'COMPLETED'
                const hasRating   = !!req.rating
                const isPaid      = req.payment?.status === 'CONFIRMED'
                const rejCount    = req.rejectionCount ?? 0
                const canRetry    = isRejected && rejCount < 3

                return (
                  <div
                    key={req.id}
                    className={`group relative bg-surface-container-low rounded-xl overflow-hidden hover:bg-surface-container transition-all duration-300 shadow-xl ${
                      isRejected ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : ''
                    }`}
                  >
                    {/* Left accent bar — only accepted */}
                    {isAccepted && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    )}

                    <div className="p-8">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        {/* Route + driver */}
                        <div className="flex-1 space-y-6">
                          {/* Route timeline */}
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-3 h-3 rounded-full border-2 ${isAccepted ? 'border-primary' : 'border-zinc-500'}`} />
                              <div className="w-px h-6 bg-outline-variant" />
                              <div className={`w-3 h-3 rounded-sm ${isAccepted ? 'bg-primary' : 'bg-zinc-500'}`} />
                            </div>
                            <div className="flex flex-col gap-3">
                              <div>
                                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Origen</p>
                                <p className="text-lg font-headline font-semibold">{trip.originZone}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Destino</p>
                                <p className="text-lg font-headline font-semibold">{trip.destinationZone}</p>
                              </div>
                            </div>
                          </div>

                          {/* Driver info */}
                          {driver ? (
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center">
                                  <span className="font-headline font-bold text-sm text-on-surface-variant">
                                    {driverInitials}
                                  </span>
                                </div>
                                {isAccepted && (
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-tertiary rounded-full border-2 border-surface-container-low animate-pulse" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{driver.fullName}</p>
                                <div className="flex items-center gap-1 text-tertiary">
                                  <span className="material-symbols-outlined text-xs material-symbols-filled">star</span>
                                  <span className="text-xs font-bold">{driver.reputationScore.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center">
                                <span className="material-symbols-outlined text-zinc-500">person</span>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-on-surface-variant">Buscando conductor...</p>
                                <p className="text-xs text-zinc-600">Tu solicitud está siendo revisada</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: price + actions */}
                        <div className="md:w-48 flex flex-col justify-between items-end gap-6">
                          <div className="flex flex-col items-end">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 ${badge.className}`}>
                              {badge.text}
                            </span>
                            <p className="text-3xl font-headline font-bold text-white">
                              ${Number(trip.pricePerSeat).toFixed(2)}
                            </p>
                            <p className="text-xs text-on-surface-variant">{depTime}</p>
                          </div>

                          {isAccepted && !isPaid && (
                            <button
                              onClick={() => navigate(`/pay/${req.id}`)}
                              className="w-full bg-gradient-primary text-on-primary font-headline font-bold py-3 px-6 rounded-lg text-sm uppercase tracking-tighter hover:shadow-[0_0_20px_rgba(156,255,147,0.4)] transition-all active:scale-95"
                            >
                              Pagar Ahora
                            </button>
                          )}

                          {isAccepted && isPaid && (
                            <div className="flex items-center justify-center gap-1.5 text-primary text-xs font-bold border border-primary/20 rounded-lg py-3 px-4 bg-primary/5">
                              <span className="material-symbols-outlined text-sm material-symbols-filled">check_circle</span>
                              Pago Confirmado
                            </div>
                          )}

                          {isPending && (
                            <button
                              onClick={() => cancelMut.mutate(req.id)}
                              disabled={cancelMut.isPending}
                              className="mt-2 text-on-surface-variant hover:text-error text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                              Cancelar Solicitud
                            </button>
                          )}

                          {isRejected && (
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-on-surface-variant">
                                Intentos: {rejCount}/3
                              </span>
                              {canRetry ? (
                                <button
                                  onClick={() => retryMut.mutate(trip.id)}
                                  disabled={retryMut.isPending}
                                  className="flex items-center gap-1.5 bg-gradient-primary text-on-primary font-headline font-bold py-2 px-4 rounded-lg text-xs uppercase tracking-wider hover:shadow-[0_0_16px_rgba(156,255,147,0.3)] transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-sm">refresh</span>
                                  Reintentar
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5 text-error text-xs font-bold border border-error/20 rounded-lg py-2 px-3 bg-error/5">
                                  <span className="material-symbols-outlined text-sm">block</span>
                                  Bloqueado
                                </div>
                              )}
                            </div>
                          )}

                          {isCompleted && !hasRating && (
                            <button
                              onClick={() => setRatingTarget({ requestId: req.id, driverName: driver?.fullName ?? 'Conductor' })}
                              className="w-full flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 text-primary font-headline font-bold py-2 px-4 rounded-lg text-xs uppercase tracking-wider hover:bg-primary/20 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm material-symbols-filled">star</span>
                              Calificar
                            </button>
                          )}

                          {isCompleted && hasRating && (
                            <div className="flex items-center gap-1 text-primary text-xs font-bold">
                              <span className="material-symbols-outlined text-sm material-symbols-filled">star</span>
                              Calificado
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* ── Right: Stats sidebar (4/12) ── */}
          <div className="lg:col-span-4 space-y-8">

            {/* U-Wallet card (decorative) */}
            <div className="bg-surface-container rounded-2xl overflow-hidden">
              <div className="h-32 relative bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant/10 text-[80px]">map</span>
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-white font-headline font-bold">U-Ride Pasajero</p>
                  <p className="text-xs text-primary font-bold uppercase tracking-widest">Panel activo</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                    Saldo U-Wallet
                  </span>
                  <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                </div>
                <p className="text-4xl font-headline font-bold text-white mb-6">$342.50</p>
                <button className="w-full bg-surface-container-highest hover:bg-surface-bright text-white font-bold py-3 rounded-lg text-sm transition-all border border-white/5">
                  Recargar Saldo
                </button>
              </div>
            </div>

            {/* Security tip */}
            <div className="bg-tertiary/5 border border-tertiary/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <span className="material-symbols-outlined text-[120px]">verified_user</span>
              </div>
              <h4 className="text-tertiary font-headline font-bold text-xl mb-3">Protocolo Kinetic</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
                Recuerda siempre verificar la matrícula y el nombre del conductor antes de subir al vehículo. Tu seguridad es nuestra prioridad institucional.
              </p>
              <span className="text-tertiary text-xs font-bold uppercase tracking-widest">Ver más consejos →</span>
            </div>
          </div>
        </div>
      </main>

      {/* Toast de notificación en tiempo real */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-container-highest border border-primary/30 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-primary text-lg">notifications</span>
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
