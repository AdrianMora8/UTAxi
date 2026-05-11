import { useState, useRef, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const AMBATO: [number, number] = [-1.2543, -78.6229]

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center;width:28px">
    <div style="width:28px;height:28px;background:#9cff93;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);border:3px solid #1a1a1a;
      box-shadow:0 2px 12px rgba(156,255,147,0.5)"></div>
    <div style="width:3px;height:10px;background:#9cff93;border-radius:2px;margin-top:1px"></div>
  </div>`,
  iconSize: [28, 42],
  iconAnchor: [14, 42],
})

export interface DestinationValue {
  address: string
  lat: number
  lng: number
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface Props {
  value: DestinationValue | null
  onChange: (val: DestinationValue) => void
  error?: string
}

// Flies the map to a position imperatively
function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 0.8 })
  }, [position, map])
  return null
}

// Handles map click events
function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
  )
  const d = await res.json()
  return (d.display_name as string) || 'Ubicación seleccionada'
}

export default function DestinationPickerField({ value, onChange, error }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [pinPos, setPinPos] = useState<[number, number] | null>(
    value ? [value.lat, value.lng] : null,
  )
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Debounced Nominatim search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 3) { setSuggestions([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ec&accept-language=es`,
        )
        setSuggestions(await res.json())
      } catch {
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 400)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const selectSuggestion = useCallback((item: NominatimResult) => {
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)
    const pos: [number, number] = [lat, lng]
    setPinPos(pos)
    setFlyTo(pos)
    setSuggestions([])
    setQuery('')
    onChange({ address: item.display_name, lat, lng })
  }, [onChange])

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    const pos: [number, number] = [lat, lng]
    setPinPos(pos)
    setSuggestions([])
    try {
      const address = await reverseGeocode(lat, lng)
      onChange({ address, lat, lng })
    } catch {
      onChange({ address: 'Ubicación seleccionada', lat, lng })
    }
  }, [onChange])

  const handleDragEnd = useCallback(async () => {
    if (!markerRef.current) return
    const { lat, lng } = markerRef.current.getLatLng()
    const pos: [number, number] = [lat, lng]
    setPinPos(pos)
    try {
      const address = await reverseGeocode(lat, lng)
      onChange({ address, lat, lng })
    } catch {
      onChange({ address: 'Ubicación seleccionada', lat, lng })
    }
  }, [onChange])

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-tertiary text-lg pointer-events-none">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar calle, barrio, sector..."
          className="w-full pl-12 pr-4 py-4 bg-surface-container-highest rounded-xl border-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder:text-zinc-600 outline-none"
        />
        {loadingSuggestions && (
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-lg animate-spin">
            progress_activity
          </span>
        )}

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-surface-container rounded-xl border border-white/5 overflow-hidden shadow-2xl">
            {suggestions.map((s) => (
              <li
                key={s.place_id}
                onClick={() => selectSuggestion(s)}
                className="px-4 py-3 text-sm text-on-surface-variant hover:bg-surface-container-high cursor-pointer border-b border-white/5 last:border-0 leading-snug"
              >
                <span className="material-symbols-outlined text-sm text-tertiary align-middle mr-2">
                  location_on
                </span>
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-white/5" style={{ height: 240 }}>
        <MapContainer
          center={pinPos ?? AMBATO}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl
          attributionControl={false}
          scrollWheelZoom
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onMapClick={handleMapClick} />
          <FlyTo position={flyTo} />
          {pinPos && (
            <Marker
              position={pinPos}
              icon={pinIcon}
              draggable
              ref={markerRef}
              eventHandlers={{ dragend: handleDragEnd }}
            />
          )}
        </MapContainer>
        {!pinPos && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-[400]">
            <div className="bg-surface-container-highest/90 rounded-lg px-4 py-2 text-sm text-on-surface-variant">
              Busca o toca el mapa para elegir destino
            </div>
          </div>
        )}
      </div>

      {/* Selected address label */}
      {value && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-primary text-sm flex-shrink-0 mt-0.5">check_circle</span>
          <p className="text-xs text-primary leading-snug">{value.address}</p>
        </div>
      )}

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
