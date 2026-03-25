import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tripsApi } from '@/api/trips.api'
import TripCard from '@/components/trips/TripCard'

type SortMode = 'recent' | 'rating'

export default function TripList() {
  const [destination, setDestination] = useState('')
  const [origin, setOrigin] = useState('')
  const [time, setTime] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')

  const [activeFilters, setActiveFilters] = useState({ destination: '', origin: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['trips', activeFilters],
    queryFn: () =>
      tripsApi.getTrips({
        destinationZone: activeFilters.destination || undefined,
        limit: 20,
      }).then((r) => r.data),
  })

  const trips = data?.trips ?? []

  const sorted = [...trips].sort((a, b) => {
    if (sort === 'rating') return b.driver.reputationScore - a.driver.reputationScore
    return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
  })

  const handleSearch = () => {
    setActiveFilters({ destination, origin })
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <main className="pt-6 pb-12 px-6 lg:px-12 max-w-7xl mx-auto">
        {/* Hero */}
        <section className="mb-16">
          <div className="max-w-2xl mb-10">
            <h1 className="font-headline text-5xl font-bold tracking-tight mb-4 text-on-surface">
              Kinetic <span className="text-primary italic">Movement</span> for the Academic Mind.
            </h1>
            <p className="text-on-surface-variant text-lg max-w-lg">
              Conecta con compañeros para un traslado más seguro, inteligente y sostenible al campus.
            </p>
          </div>

          {/* Search bento */}
          <div className="bg-surface-container-low p-1 rounded-xl shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
              <div className="bg-surface-container-highest p-4 rounded-lg flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-primary font-bold">
                  Zona de Origen
                </label>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">location_on</span>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="bg-transparent border-none p-0 text-on-surface focus:ring-0 w-full placeholder:text-zinc-600 outline-none text-sm"
                    placeholder="¿De dónde sales?"
                  />
                </div>
              </div>

              <div className="bg-surface-container-highest p-4 rounded-lg flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-primary font-bold">
                  Zona de Destino
                </label>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">near_me</span>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="bg-transparent border-none p-0 text-on-surface focus:ring-0 w-full placeholder:text-zinc-600 outline-none text-sm"
                    placeholder="¿A dónde vas?"
                  />
                </div>
              </div>

              <div className="bg-surface-container-highest p-4 rounded-lg flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-primary font-bold">
                  Horario
                </label>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">schedule</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="bg-transparent border-none p-0 text-on-surface focus:ring-0 w-full [color-scheme:dark] outline-none text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleSearch}
                className="bg-gradient-primary text-on-primary font-headline font-bold text-lg rounded-lg flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(0,252,64,0.3)] transition-all active:scale-95 py-4"
              >
                <span className="material-symbols-outlined">search</span>
                Encontrar Viaje
              </button>
            </div>
          </div>
        </section>

        {/* Results header */}
        <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-4">
          <div>
            <h2 className="font-headline text-2xl font-bold">Viajes Disponibles</h2>
            <p className="text-on-surface-variant text-sm font-label uppercase tracking-widest mt-1">
              {isLoading ? 'Buscando...' : `${sorted.length} rutas encontradas`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSort('recent')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                sort === 'recent'
                  ? 'bg-surface-container-high text-primary border border-primary/20'
                  : 'bg-surface-container text-zinc-500 hover:text-white'
              }`}
            >
              MÁS RECIENTES
            </button>
            <button
              onClick={() => setSort('rating')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                sort === 'rating'
                  ? 'bg-surface-container-high text-primary border border-primary/20'
                  : 'bg-surface-container text-zinc-500 hover:text-white'
              }`}
            >
              MEJOR CALIFICADOS
            </button>
          </div>
        </div>

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface-container-low rounded-xl h-72 animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-on-surface-variant/20 text-[80px]">directions_car</span>
            <p className="text-on-surface-variant mt-4">No hay viajes disponibles con esos filtros.</p>
            <button
              onClick={() => { setDestination(''); setOrigin(''); setActiveFilters({ destination: '', origin: '' }) }}
              className="mt-4 text-primary text-sm hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}

        {/* Security section */}
        <section className="mt-20 p-8 bg-surface-container rounded-2xl flex flex-col md:flex-row items-center gap-8 border border-white/5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full border-4 border-tertiary flex items-center justify-center animate-pulse shadow-[0_0_32px_rgba(138,242,255,0.2)]">
              <span className="material-symbols-outlined text-tertiary text-4xl">shield</span>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-headline text-xl font-bold text-white mb-2 uppercase tracking-tight">
              Protocolo de Seguridad Académica
            </h3>
            <p className="text-on-surface-variant leading-relaxed">
              Todos los conductores en U-Ride son estudiantes o personal verificado con correo institucional @uta.edu.ec.
              Tu viaje está monitoreado por GPS en tiempo real para tu tranquilidad.
            </p>
          </div>
          <div className="px-8 py-3 bg-tertiary text-on-tertiary font-bold rounded-lg text-sm">
            Ver Reglas
          </div>
        </section>
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
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Reglas de Seguridad</span>
            <span className="font-label text-xs uppercase tracking-widest text-zinc-600">Privacidad</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
