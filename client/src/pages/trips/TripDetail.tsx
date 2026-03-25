import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tripsApi } from '@/api/trips.api'
import { requestsApi } from '@/api/requests.api'
import { useAuthStore } from '@/store/authStore'

export default function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [message, setMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [requestDone, setRequestDone] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.getTripById(id!).then((r) => r.data.trip),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <p className="text-on-surface-variant">Viaje no encontrado.</p>
        <Link to="/trips" className="text-primary hover:underline text-sm">← Volver a viajes</Link>
      </div>
    )
  }

  const trip = data
  const depTime = new Date(trip.departureTime)
  const timeStr = depTime.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true })
  const isDriver = trip.driverId === user?.id
  const isInProgress = trip.status === 'IN_PROGRESS'

  const driverInitials = trip.driver.fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <main className="pt-6 pb-12 px-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link to="/trips" className="flex items-center gap-2 text-on-surface-variant hover:text-white text-sm transition-colors w-fit">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Volver a viajes
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          {/* Left Column (7/12) */}
          <div className="md:w-7/12 flex flex-col gap-8">

            {/* Driver Profile Card */}
            <section className="bg-surface-container-low p-8 rounded-xl">
              <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-xl bg-surface-container-highest flex items-center justify-center">
                    <span className="font-headline font-bold text-2xl text-on-surface-variant">{driverInitials}</span>
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-primary p-1 rounded-lg text-on-primary">
                    <span className="material-symbols-outlined text-sm material-symbols-filled">verified</span>
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
                    {trip.driver.fullName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex text-primary">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`material-symbols-outlined text-lg ${
                            star <= Math.round(trip.driver.reputationScore) ? 'material-symbols-filled' : ''
                          }`}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-on-surface-variant font-label text-sm uppercase tracking-widest">
                      ({trip.driver.totalTrips ?? 0} Viajes)
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4">
                    {trip.driver.vehicle && (
                      <div className="flex items-center gap-2 text-on-surface-variant bg-surface-container p-2 px-3 rounded-lg">
                        <span className="material-symbols-outlined text-primary">directions_car</span>
                        <span className="text-sm font-medium">
                          {trip.driver.vehicle.brand} {trip.driver.vehicle.model} • {trip.driver.vehicle.color}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-on-surface-variant bg-surface-container p-2 px-3 rounded-lg">
                      <span className="material-symbols-outlined text-primary">shield</span>
                      <span className="text-sm font-medium">Conductor Verificado</span>
                    </div>
                    {trip.driver.career && (
                      <div className="flex items-center gap-2 text-on-surface-variant bg-surface-container p-2 px-3 rounded-lg">
                        <span className="material-symbols-outlined text-primary">school</span>
                        <span className="text-sm font-medium">{trip.driver.career}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Route Timeline */}
            <section className="bg-surface-container-low p-8 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <span className="material-symbols-outlined text-[120px]">route</span>
              </div>
              <h3 className="font-headline text-xl font-bold mb-10 text-on-surface-variant uppercase tracking-widest">
                Itinerario del Viaje
              </h3>
              <div className="relative pl-12">
                {/* Vertical line */}
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary-container to-surface-container-highest" />

                {/* Origin */}
                <div className="relative mb-16">
                  <div className="absolute -left-12 top-0 w-7 h-7 bg-surface-container-low border-2 border-primary rounded-full flex items-center justify-center z-10">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <div>
                    <span className="text-primary font-headline text-lg font-bold">{timeStr}</span>
                    <h4 className="text-on-surface text-2xl font-bold mt-1">{trip.originZone}</h4>
                    <p className="text-on-surface-variant mt-2 text-sm max-w-md leading-relaxed">
                      Punto de salida acordado.
                    </p>
                  </div>
                </div>

                {/* Destination */}
                <div className="relative">
                  <div className="absolute -left-12 top-0 w-7 h-7 bg-primary border-2 border-primary rounded-full flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-on-primary text-sm material-symbols-filled">location_on</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant font-headline text-lg font-bold italic">Llegada estimada</span>
                    <h4 className="text-on-surface text-2xl font-bold mt-1">{trip.destinationZone}</h4>
                    <p className="text-on-surface-variant mt-2 text-sm max-w-md leading-relaxed">
                      Destino final del recorrido.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Rules / Notes */}
            {(trip.rules || trip.notes) && (
              <section className="bg-surface-container-low p-8 rounded-xl border-l-4 border-tertiary/20">
                <div className="flex items-center gap-4 mb-6">
                  <span className="material-symbols-outlined text-tertiary">info</span>
                  <h3 className="font-headline text-xl font-bold uppercase tracking-widest text-on-surface">
                    Reglas de Convivencia
                  </h3>
                </div>

                {trip.rules && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    {trip.rules.split('\n').filter(Boolean).map((rule, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-surface-container">
                        <span className="material-symbols-outlined text-on-surface-variant">check_circle</span>
                        <p className="text-on-surface text-sm font-medium">{rule}</p>
                      </div>
                    ))}
                  </div>
                )}

                {trip.notes && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-on-surface-variant italic text-sm leading-relaxed">
                      "{trip.notes}"
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right Column (5/12) — sticky action panel */}
          <div className="md:w-5/12">
            <div className="sticky top-24 flex flex-col gap-6">

              {/* Main Action Card */}
              <div className="bg-surface-container p-8 rounded-xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] border border-white/5">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <p className="text-on-surface-variant font-label text-xs uppercase tracking-[0.2em] mb-1">
                      Precio por Asiento
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-primary text-4xl font-headline font-bold">
                        ${Number(trip.pricePerSeat).toFixed(2)}
                      </span>
                      <span className="text-on-surface-variant font-label text-sm uppercase">USD</span>
                    </div>
                  </div>
                  <div className="bg-surface-container-highest/50 text-secondary px-4 py-2 rounded-lg border border-surface-container-highest">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-center text-on-surface-variant">
                      Disponibles
                    </p>
                    <p className="text-xl font-headline font-bold text-center">
                      {trip.availableSeats}/{trip.totalSeats}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-on-surface-variant">Precio por asiento</span>
                    <span className="text-on-surface">${Number(trip.pricePerSeat).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold py-2">
                    <span className="text-on-surface">Total</span>
                    <span className="text-primary">${Number(trip.pricePerSeat).toFixed(2)}</span>
                  </div>
                </div>

                {isInProgress ? (
                  <button
                    onClick={() => navigate(`/trips/${trip.id}/active`)}
                    className="w-full bg-gradient-to-r from-tertiary/20 to-primary/20 hover:from-tertiary/30 hover:to-primary/30 border border-tertiary/30 text-tertiary font-headline font-black py-5 rounded-xl text-lg uppercase tracking-wider transition-all active:scale-95"
                  >
                    <span className="flex items-center justify-center gap-3">
                      <span className="material-symbols-outlined animate-pulse">location_on</span>
                      Ver Viaje Activo
                    </span>
                  </button>
                ) : isDriver ? (
                  <button
                    onClick={() => navigate(`/trips/${trip.id}/requests`)}
                    className="w-full bg-gradient-primary hover:shadow-[0_0_20px_rgba(156,255,147,0.4)] text-on-primary font-headline font-black py-5 rounded-xl text-lg uppercase tracking-wider transition-all active:scale-95 group"
                  >
                    <span className="flex items-center justify-center gap-3">
                      <span className="material-symbols-outlined">group</span>
                      Gestionar Solicitudes
                    </span>
                  </button>
                ) : trip.availableSeats === 0 ? (
                  <div className="w-full bg-error/10 text-error font-headline font-bold py-5 rounded-xl text-center text-lg uppercase tracking-wider border border-error/20">
                    Sin asientos disponibles
                  </div>
                ) : requestDone ? (
                  <div className="w-full bg-primary/10 border border-primary/20 text-primary font-headline font-bold py-5 rounded-xl text-center text-lg uppercase tracking-wider">
                    ¡Solicitud enviada!
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={2}
                      maxLength={300}
                      placeholder="Mensaje al conductor (opcional)"
                      className="w-full bg-surface-container-highest border-none rounded-xl p-4 text-on-surface placeholder:text-outline text-sm resize-none focus:ring-1 focus:ring-primary/40 outline-none"
                    />
                    {requestError && (
                      <p className="text-xs text-error">{requestError}</p>
                    )}
                    <button
                      onClick={() => {
                        setRequestError('')
                        requestsApi.createRequest(trip.id, message || undefined)
                          .then(() => { setRequestDone(true); qc.invalidateQueries({ queryKey: ['trip', id] }) })
                          .catch((err: unknown) => {
                            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al enviar la solicitud'
                            setRequestError(msg)
                          })
                      }}
                      className="w-full bg-gradient-primary hover:shadow-[0_0_20px_rgba(156,255,147,0.4)] text-on-primary font-headline font-black py-5 rounded-xl text-lg uppercase tracking-wider transition-all active:scale-95 group overflow-hidden"
                    >
                      <span className="flex items-center justify-center gap-3">
                        Solicitar Unirse
                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </span>
                    </button>
                  </div>
                )}

                <p className="text-center text-on-surface-variant text-[11px] mt-6 uppercase tracking-widest leading-relaxed">
                  Al solicitar, aceptas las Políticas de Cancelación de U-Ride.
                </p>
              </div>

              {/* Stats grid */}
              <div className="bg-surface-container-low rounded-xl overflow-hidden">
                {/* Map placeholder */}
                <div className="h-48 w-full bg-surface-container-highest relative flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant/20 text-[80px]">map</span>
                  {isInProgress && (
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-tertiary/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-tertiary/20">
                      <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                      <span className="text-tertiary text-xs font-bold uppercase tracking-widest">GPS Activo</span>
                    </div>
                  )}
                </div>

                <div className="p-6 grid grid-cols-2 gap-4">
                  <div className="bg-surface-container p-4 rounded-lg">
                    <span className="material-symbols-outlined text-tertiary mb-2 block">event_seat</span>
                    <p className="text-on-surface-variant text-[10px] uppercase tracking-widest">Asientos</p>
                    <p className="text-on-surface font-headline font-bold">{trip.totalSeats} total</p>
                  </div>
                  <div className="bg-surface-container p-4 rounded-lg">
                    <span className="material-symbols-outlined text-tertiary mb-2 block">schedule</span>
                    <p className="text-on-surface-variant text-[10px] uppercase tracking-widest">Salida</p>
                    <p className="text-on-surface font-headline font-bold">{timeStr}</p>
                  </div>
                  <div className="bg-surface-container p-4 rounded-lg">
                    <span className="material-symbols-outlined text-tertiary mb-2 block">stars</span>
                    <p className="text-on-surface-variant text-[10px] uppercase tracking-widest">Reputación</p>
                    <p className="text-on-surface font-headline font-bold">{trip.driver.reputationScore.toFixed(1)}</p>
                  </div>
                  <div className="bg-surface-container p-4 rounded-lg">
                    <span className="material-symbols-outlined text-tertiary mb-2 block">group</span>
                    <p className="text-on-surface-variant text-[10px] uppercase tracking-widest">Estado</p>
                    <p className="text-on-surface font-headline font-bold capitalize">{trip.status}</p>
                  </div>
                </div>
              </div>

              {/* Report button */}
              {!isDriver && (
                <button
                  onClick={() => navigate(`/reports?userId=${trip.driver.id}&name=${encodeURIComponent(trip.driver.fullName)}`)}
                  className="w-full flex items-center justify-center gap-2 text-on-surface-variant hover:text-error border border-white/5 hover:border-error/20 py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">flag</span>
                  Reportar conductor
                </button>
              )}

              {/* Security pulse */}
              <div className="glass-panel p-6 rounded-xl border border-tertiary/10 flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-tertiary rounded-full animate-ping opacity-20" />
                  <div className="w-12 h-12 bg-tertiary/20 rounded-full flex items-center justify-center relative z-10">
                    <span className="material-symbols-outlined text-tertiary">security</span>
                  </div>
                </div>
                <div>
                  <p className="text-on-surface font-headline font-bold text-sm">Viaje Seguro Monitoreado</p>
                  <p className="text-on-surface-variant text-xs mt-1">
                    Este trayecto está bajo el protocolo de seguridad Kinetic-Guard.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
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
