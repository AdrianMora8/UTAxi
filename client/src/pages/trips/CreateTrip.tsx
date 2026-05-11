import { lazy, Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { tripsApi } from '@/api/trips.api'
import CampusPicker from '@/components/CampusPicker'
import { type Campus } from '@/constants/campuses'

const RouteMap = lazy(() => import('@/components/map/RouteMap'))

const schema = z.object({
  destinationZone: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  date: z.string().min(1, 'Selecciona una fecha'),
  time: z.string().min(1, 'Selecciona una hora'),
  totalSeats: z.coerce.number().int().min(1, 'Mínimo 1').max(8, 'Máximo 8'),
  pricePerSeat: z.coerce.number().positive('Precio inválido'),
  notes: z.string().max(500).optional(),
})

type FormData = z.infer<typeof schema>



export default function CreateTrip() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null)
  const [campusError, setCampusError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { totalSeats: 3, pricePerSeat: 1.5 },
  })

  const seats = watch('totalSeats') ?? 3
  const destination = watch('destinationZone') ?? ''

  const createMut = useMutation({
    mutationFn: (data: FormData) => {
      const departureTime = new Date(`${data.date}T${data.time}:00`).toISOString()
      return tripsApi.createTrip({
        originZone: selectedCampus!.label,
        originLat: selectedCampus!.lat,
        originLng: selectedCampus!.lng,
        destinationZone: data.destinationZone,
        departureTime,
        totalSeats: data.totalSeats,
        pricePerSeat: data.pricePerSeat,
        notes: data.notes || undefined,
      })
    },
    onSuccess: (res) => {
      navigate(`/trips/${res.data.trip.id}/requests`)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al publicar el viaje'
      setServerError(msg)
    },
  })

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <main className="pt-6 pb-12 px-6 lg:px-24 min-h-screen grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-7xl mx-auto">

        {/* Left: Form */}
        <div className="lg:col-span-7 space-y-12">
          <header>
            <h1 className="text-5xl lg:text-7xl font-headline font-bold text-white tracking-tighter leading-none mb-4">
              PLANEA TU <span className="text-primary italic">MOVIMIENTO.</span>
            </h1>
            <p className="text-on-surface-variant text-lg max-w-md">
              Establece tu ruta, horario y conecta con otros estudiantes para el viaje diario al campus.
            </p>
          </header>

          <form
            onSubmit={handleSubmit((d) => {
              if (!selectedCampus) {
                setCampusError('Selecciona el campus de origen')
                return
              }
              setCampusError('')
              createMut.mutate(d)
            })}
            className="space-y-8"
          >

            {/* Route group */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-primary-container block">
                  Campus de Origen
                </label>
                <CampusPicker
                  value={selectedCampus}
                  onChange={(c) => { setSelectedCampus(c); setCampusError('') }}
                  error={campusError}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary-container block">
                  Punto de Llegada
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-tertiary text-lg">
                    flag
                  </span>
                  <input
                    {...register('destinationZone')}
                    type="text"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-highest rounded-xl border-none focus:ring-1 focus:ring-primary/40 transition-all text-on-surface placeholder:text-zinc-600 outline-none"
                    placeholder="Calle, Barrio, Sector..."
                  />
                </div>
                {errors.destinationZone && (
                  <p className="text-xs text-error">{errors.destinationZone.message}</p>
                )}
              </div>
            </div>

            {/* Schedule group */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary-container block">
                  Fecha
                </label>
                <input
                  {...register('date')}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-4 bg-surface-container-highest rounded-xl border-none focus:ring-1 focus:ring-primary/40 text-on-surface outline-none [color-scheme:dark]"
                />
                {errors.date && (
                  <p className="text-xs text-error">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary-container block">
                  Hora Salida
                </label>
                <input
                  {...register('time')}
                  type="time"
                  className="w-full px-4 py-4 bg-surface-container-highest rounded-xl border-none focus:ring-1 focus:ring-primary/40 text-on-surface outline-none [color-scheme:dark]"
                />
                {errors.time && (
                  <p className="text-xs text-error">{errors.time.message}</p>
                )}
              </div>

              {/* Seats stepper */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary-container block">
                  Asientos
                </label>
                <div className="flex items-center bg-surface-container-highest rounded-xl px-2 h-[58px]">
                  <button
                    type="button"
                    onClick={() => setValue('totalSeats', Math.max(1, seats - 1))}
                    className="p-2 text-primary hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <input
                    {...register('totalSeats')}
                    type="number"
                    min={1}
                    max={8}
                    className="w-full text-center bg-transparent border-none focus:ring-0 text-white font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setValue('totalSeats', Math.min(8, seats + 1))}
                    className="p-2 text-primary hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
                {errors.totalSeats && (
                  <p className="text-xs text-error">{errors.totalSeats.message}</p>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-primary-container block">
                Precio por Asiento (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-lg">$</span>
                <input
                  {...register('pricePerSeat')}
                  type="number"
                  step="0.25"
                  min="0.25"
                  className="w-full pl-10 pr-4 py-4 bg-surface-container-highest rounded-xl border-none focus:ring-1 focus:ring-primary/40 text-on-surface outline-none"
                  placeholder="1.50"
                />
              </div>
              {errors.pricePerSeat && (
                <p className="text-xs text-error">{errors.pricePerSeat.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-primary-container block">
                Notas del Conductor & Reglas
              </label>
              <textarea
                {...register('notes')}
                rows={4}
                className="w-full px-4 py-4 bg-surface-container-highest rounded-xl border-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder:text-zinc-600 resize-none outline-none"
                placeholder="Ej: No fumar en el auto. Puntualidad requerida. Máximo una maleta pequeña..."
              />
            </div>

            {serverError && (
              <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3">
                <span className="material-symbols-outlined text-error text-sm">error</span>
                <p className="text-sm text-error">{serverError}</p>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 items-center pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto bg-gradient-primary px-12 py-4 rounded-xl text-on-primary font-bold text-lg hover:shadow-[0_0_24px_rgba(156,255,147,0.4)] transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Publicando...' : 'Publicar Viaje'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/trips')}
                className="w-full md:w-auto px-12 py-4 rounded-xl bg-surface-container text-on-surface-variant font-medium hover:text-on-surface transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        {/* Right: Visual feedback (sticky) */}
        <div className="lg:col-span-5 relative">
          <div className="sticky top-24 space-y-6">

            {/* Route preview card */}
            <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl bg-surface-container-high">
              <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><span className="material-symbols-outlined text-on-surface-variant/10 text-[160px]">map</span></div>}>
                <RouteMap
                  originZone={selectedCampus?.label ?? ''}
                  destinationZone={destination}
                  onDestinationSelect={(address) => setValue('destinationZone', address, { shouldValidate: true })}
                />
              </Suspense>
              {/* Glass overlay */}
              <div className="absolute bottom-6 left-6 right-6 glass-panel p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-tertiary">
                    Vista Previa de Ruta
                  </span>
                  <span className="text-xs text-on-surface-variant">Ambato, Ecuador</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-tertiary" />
                    <div className="w-2 h-2 rounded-full bg-tertiary" />
                  </div>
                  <div className="flex flex-col gap-4 text-sm font-medium">
                    <span className="text-on-surface-variant">
                      {selectedCampus?.label || 'Campus de Origen'}
                    </span>
                    <span className="text-on-surface-variant">
                      {destination || 'Destino'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kinetic Insights */}
            <div className="bg-surface-container-low p-8 rounded-3xl border border-white/5">
              <h3 className="text-primary font-headline font-bold text-xl mb-4 uppercase tracking-tight">
                Kinetic Insights
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-tertiary">trending_up</span>
                  <p className="text-sm text-on-surface-variant">
                    Publicar en horarios de entrada/salida aumenta tus posibilidades de encontrar pasajeros en un{' '}
                    <span className="text-white font-bold">85%</span>.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">eco</span>
                  <p className="text-sm text-on-surface-variant">
                    Compartir viaje con {seats} pasajero{seats !== 1 ? 's' : ''} ahorra aproximadamente{' '}
                    <span className="text-white font-bold">{(seats * 1.4).toFixed(1)} kg de CO₂</span> respecto a viajes individuales.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">payments</span>
                  <p className="text-sm text-on-surface-variant">
                    Con {seats} asiento{seats !== 1 ? 's' : ''} a ${watch('pricePerSeat') || 1.5} c/u, puedes generar{' '}
                    <span className="text-white font-bold">
                      ${((watch('pricePerSeat') || 1.5) * seats).toFixed(2)}
                    </span>{' '}
                    por viaje.
                  </p>
                </div>
              </div>
            </div>
          </div>
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
