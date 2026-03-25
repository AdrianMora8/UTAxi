import { Link } from 'react-router-dom'
import type { Trip } from '@/api/trips.api'

interface TripCardProps {
  trip: Trip
}

function seatBadge(available: number, total: number) {
  if (available === 1) return { label: '¡Último asiento!', className: 'bg-error-container text-on-error-container' }
  if (available <= total * 0.4) return { label: `Quedan ${available} asientos`, className: 'bg-primary/90 text-on-primary' }
  return { label: `Quedan ${available} asientos`, className: 'bg-tertiary text-on-tertiary' }
}

export default function TripCard({ trip }: TripCardProps) {
  const badge = seatBadge(trip.availableSeats, trip.totalSeats)
  const depTime = new Date(trip.departureTime)
  const timeStr = depTime.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true })
  const [timePart, period] = timeStr.split(' ')

  const driverInitials = trip.driver.fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="bg-surface-container-low rounded-xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300 flex flex-col"
    >
      {/* Card header with seats badge */}
      <div className="relative h-32 bg-surface-container flex items-center justify-center">
        <span className="material-symbols-outlined text-on-surface-variant/20 text-[80px]">directions_car</span>
        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${badge.className}`}>
          {badge.label}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {/* Driver + time */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest border-2 border-surface-container-highest flex items-center justify-center">
              <span className="font-headline font-bold text-sm text-on-surface-variant">{driverInitials}</span>
            </div>
            <div>
              <h3 className="font-bold text-on-surface">{trip.driver.fullName}</h3>
              <div className="flex items-center gap-1 text-tertiary">
                <span className="material-symbols-outlined text-xs material-symbols-filled">star</span>
                <span className="text-xs font-bold">{trip.driver.reputationScore.toFixed(1)}</span>
                {trip.driver.totalTrips !== undefined && (
                  <span className="text-[10px] text-on-surface-variant font-normal">
                    ({trip.driver.totalTrips} viajes)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-headline font-bold text-primary">{timePart}</p>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">{period}</p>
          </div>
        </div>

        {/* Route timeline */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-4 items-start">
            <div className="flex flex-col items-center pt-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="w-px h-8 bg-zinc-800" />
              <div className="w-2 h-2 rounded-full border border-primary" />
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[10px] uppercase text-zinc-500 font-bold">Origen</p>
                <p className="text-sm font-medium">{trip.originZone}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-500 font-bold">Destino</p>
                <p className="text-sm font-medium">{trip.destinationZone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto w-full py-4 bg-surface-container-highest text-on-surface font-headline font-bold rounded-lg border border-white/5 hover:border-primary/50 hover:bg-surface-container-high transition-all text-center text-sm">
          Ver Viaje
        </div>
      </div>
    </Link>
  )
}
