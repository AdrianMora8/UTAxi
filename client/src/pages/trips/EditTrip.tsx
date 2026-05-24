import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { tripsApi } from '@/api/trips.api'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  date: z.string().min(1, 'Selecciona una fecha'),
  time: z.string().min(1, 'Selecciona una hora'),
  totalSeats: z.coerce.number().int().min(1).max(8),
  pricePerSeat: z.coerce.number().positive('Precio inválido'),
  notes: z.string().max(500).optional(),
  rules: z.string().max(500).optional(),
})

type FormData = z.infer<typeof schema>

function toLocalDateStr(iso: string) {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function toLocalTimeStr(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function EditTrip() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [serverError, setServerError] = useState('')

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.getTripById(id!).then((r) => r.data.trip),
    enabled: !!id,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: trip
      ? {
          date: toLocalDateStr(trip.departureTime),
          time: toLocalTimeStr(trip.departureTime),
          totalSeats: trip.totalSeats,
          pricePerSeat: Number(trip.pricePerSeat),
          notes: trip.notes ?? '',
          rules: trip.rules ?? '',
        }
      : undefined,
  })

  const seats = watch('totalSeats') ?? 3

  const updateMut = useMutation({
    mutationFn: (data: FormData) => {
      const departureTime = new Date(`${data.date}T${data.time}:00`).toISOString()
      return tripsApi.updateTrip(id!, {
        departureTime,
        totalSeats: data.totalSeats,
        pricePerSeat: data.pricePerSeat,
        notes: data.notes || undefined,
        rules: data.rules || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip', id] })
      qc.invalidateQueries({ queryKey: ['my-trips'] })
      navigate(`/trips/${id}`)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al actualizar el viaje'
      setServerError(msg)
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <p className="text-on-surface-variant">Viaje no encontrado.</p>
        <Link to="/my-trips" className="text-primary hover:underline text-sm">← Mis Viajes</Link>
      </div>
    )
  }

  if (trip.driverId !== user?.id) {
    navigate('/my-trips')
    return null
  }

  if (trip.status !== 'SCHEDULED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-error text-5xl">block</span>
        <p className="text-on-surface-variant">Solo puedes editar viajes programados.</p>
        <Link to="/my-trips" className="text-primary hover:underline text-sm">← Mis Viajes</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <main className="pt-6 pb-12 px-6 lg:px-24 max-w-3xl mx-auto">

        <div className="mb-8">
          <Link
            to={`/trips/${id}`}
            className="flex items-center gap-2 text-on-surface-variant hover:text-white text-sm transition-colors w-fit"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Volver al viaje
          </Link>
        </div>

        <header className="mb-10">
          <span className="text-primary font-label text-xs font-bold tracking-[0.2em] uppercase mb-2 block">
            Conductor
          </span>
          <h1 className="text-5xl font-headline font-bold tracking-tighter text-white leading-none mb-2">
            Editar Viaje
          </h1>
          <p className="text-on-surface-variant text-sm">
            {trip.originZone} → {trip.destinationZone}
          </p>
        </header>

        <form
          onSubmit={handleSubmit((d) => {
            setServerError('')
            updateMut.mutate(d)
          })}
          className="space-y-8"
        >
          {/* Route info — read-only */}
          <div className="bg-surface-container-low rounded-xl p-6 flex items-center gap-4 border border-white/5">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-2 h-2 rounded-full border-2 border-on-surface-variant" />
              <div className="w-px h-6 bg-outline-variant" />
              <div className="w-2 h-2 rounded-sm bg-primary" />
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <p className="text-sm font-bold text-white truncate">{trip.originZone}</p>
              <p className="text-sm text-on-surface-variant truncate">{trip.destinationZone}</p>
            </div>
            <span className="ml-auto text-xs text-on-surface-variant border border-white/10 rounded-lg px-3 py-1">
              Ruta fija
            </span>
          </div>

          {/* Date + Time + Seats */}
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
              {errors.date && <p className="text-xs text-error">{errors.date.message}</p>}
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
              {errors.time && <p className="text-xs text-error">{errors.time.message}</p>}
            </div>

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
              {errors.totalSeats && <p className="text-xs text-error">{errors.totalSeats.message}</p>}
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
            {errors.pricePerSeat && <p className="text-xs text-error">{errors.pricePerSeat.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary-container block">
              Notas del Conductor
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-4 bg-surface-container-highest rounded-xl border-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder:text-zinc-600 resize-none outline-none"
              placeholder="Información adicional para los pasajeros..."
            />
          </div>

          {/* Rules */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary-container block">
              Reglas del Viaje
            </label>
            <textarea
              {...register('rules')}
              rows={3}
              className="w-full px-4 py-4 bg-surface-container-highest rounded-xl border-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder:text-zinc-600 resize-none outline-none"
              placeholder="Ej: No fumar. Puntualidad requerida..."
            />
          </div>

          {serverError && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-4 py-3">
              <span className="material-symbols-outlined text-error text-sm">error</span>
              <p className="text-sm text-error">{serverError}</p>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || updateMut.isPending}
              className="flex-1 bg-gradient-primary px-8 py-4 rounded-xl text-on-primary font-bold text-lg hover:shadow-[0_0_24px_rgba(156,255,147,0.4)] transition-all active:scale-95 disabled:opacity-50"
            >
              {updateMut.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <Link
              to={`/trips/${id}`}
              className="flex-1 text-center px-8 py-4 rounded-xl bg-surface-container text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
