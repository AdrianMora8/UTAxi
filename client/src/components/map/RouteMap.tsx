import { useState, useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { CAMPUSES } from '@/constants/campuses'

// Fix Leaflet default icon paths broken by Vite's asset hashing
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const destIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;width:32px;height:32px;background:rgba(0,252,64,0.15);border-radius:50%;"></div>
    <div style="width:14px;height:14px;background:#00fc40;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(0,252,64,0.6);"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const originIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;width:32px;height:32px;background:rgba(0,122,255,0.15);border-radius:50%;"></div>
    <div style="width:14px;height:14px;background:#007aff;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(0,122,255,0.6);"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// Build campus coords map from our authoritative constants
const CAMPUS_COORDS: Record<string, [number, number]> = Object.fromEntries(
  CAMPUSES.map((c) => [c.label, [c.lat, c.lng] as [number, number]]),
)

const AMBATO_CENTER: [number, number] = [-1.2543, -78.6229]

interface RouteMapProps {
  originZone: string
  destinationZone: string
  // Direct coordinates (skip geocoding when available)
  originLat?: number | null
  originLng?: number | null
  destLat?: number | null
  destLng?: number | null
  onDestinationSelect?: (address: string) => void
}

function DraggableMarker({
  position,
  icon,
  label,
  subLabel,
  draggable,
  onLocationChange,
}: {
  position: [number, number] | null
  icon: L.DivIcon
  label: string
  subLabel: string
  draggable: boolean
  onLocationChange?: (addr: string) => void
}) {
  const markerRef = useRef<L.Marker>(null)

  const eventHandlers = useMemo(
    () => ({
      async dragend() {
        const marker = markerRef.current
        if (!marker) return
        const pos = marker.getLatLng()
        if (onLocationChange) {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json`,
            )
            const d = await res.json()
            onLocationChange(d.display_name || 'Ubicación seleccionada')
          } catch {
            onLocationChange('Ubicación seleccionada')
          }
        }
      },
    }),
    [onLocationChange],
  )

  if (!position) return null

  return (
    <Marker
      draggable={draggable}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={icon}
      autoPan
    >
      <Popup minWidth={100}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', display: 'block' }}>{label}</span>
        <span style={{ fontSize: '11px', color: '#a0a0a0' }}>{subLabel || '—'}</span>
      </Popup>
    </Marker>
  )
}

export default function RouteMap({
  originZone,
  destinationZone,
  originLat,
  originLng,
  destLat,
  destLng,
  onDestinationSelect,
}: RouteMapProps) {
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(
    originLat && originLng ? [originLat, originLng] : null,
  )
  const [destCoords, setDestCoords] = useState<[number, number] | null>(
    destLat && destLng ? [destLat, destLng] : null,
  )

  // Resolve origin: direct coords > campus lookup > geocode
  useEffect(() => {
    if (originLat && originLng) {
      setOriginCoords([originLat, originLng])
      return
    }
    if (!originZone) return
    const campus = CAMPUS_COORDS[originZone]
    if (campus) { setOriginCoords(campus); return }

    let alive = true
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(originZone + ', Ambato, Ecuador')}&format=json&limit=1`,
    )
      .then((r) => r.json())
      .then((d) => { if (alive && d[0]) setOriginCoords([parseFloat(d[0].lat), parseFloat(d[0].lon)]) })
      .catch(() => {})
    return () => { alive = false }
  }, [originZone, originLat, originLng])

  // Resolve dest: direct coords > geocode
  useEffect(() => {
    if (destLat && destLng) {
      setDestCoords([destLat, destLng])
      return
    }
    if (!destinationZone) return

    let alive = true
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destinationZone + ', Ecuador')}&format=json&limit=1`,
    )
      .then((r) => r.json())
      .then((d) => { if (alive && d[0]) setDestCoords([parseFloat(d[0].lat), parseFloat(d[0].lon)]) })
      .catch(() => {})
    return () => { alive = false }
  }, [destinationZone, destLat, destLng])

  const center = originCoords ?? destCoords ?? AMBATO_CENTER

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles-dark" />

      <DraggableMarker
        position={originCoords}
        icon={originIcon}
        label="Campus de Origen"
        subLabel={originZone}
        draggable={false}
      />

      <DraggableMarker
        position={destCoords}
        icon={destIcon}
        label="Destino"
        subLabel={destinationZone}
        draggable={!!onDestinationSelect}
        onLocationChange={onDestinationSelect}
      />
    </MapContainer>
  )
}
