import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { DriverLocation } from '@/hooks/useTracking'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const driverIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:40px;height:40px;background:rgba(138,242,255,0.2);border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;width:28px;height:28px;background:rgba(138,242,255,0.15);border:2px solid #8af2ff;border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <div style="width:10px;height:10px;background:#8af2ff;border-radius:50%;box-shadow:0 0 8px #8af2ff;"></div>
      </div>
    </div>
    <style>@keyframes ping{75%,100%{transform:scale(2);opacity:0;}}</style>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

const destIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#ff4444;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.6);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const UTA_CENTER: [number, number] = [-1.2491, -78.6167]

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true })
  }, [lat, lng, map])
  return null
}

// Point-to-segment distance in degrees
function distToSegmentDeg(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function distFromRoute(lat: number, lng: number, coords: [number, number][]): number {
  if (coords.length < 2) return Infinity
  let min = Infinity
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distToSegmentDeg([lat, lng], coords[i], coords[i + 1]) * 111320
    if (d < min) min = d
  }
  return min
}

interface TripMapProps {
  driverLocation: DriverLocation | null
  originZone: string
  destinationZone: string
  destLat?: number | null
  destLng?: number | null
  onEtaUpdate?: (minutes: number) => void
}

export default function TripMap({
  driverLocation,
  originZone,
  destinationZone,
  destLat,
  destLng,
  onEtaUpdate,
}: TripMapProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const updateCountRef = useRef(0)
  const lastRouteTimeRef = useRef(0)

  const center: [number, number] = driverLocation
    ? [driverLocation.lat, driverLocation.lng]
    : UTA_CENTER

  async function fetchRoute(lat: number, lng: number) {
    if (!destLat || !destLng) return
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${destLng},${destLat}?overview=full&geometries=geojson`
      const res = await fetch(url)
      const data = await res.json()
      if (!data.routes?.[0]) return
      const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number],
      )
      setRouteCoords(coords)
      lastRouteTimeRef.current = Date.now()
      if (onEtaUpdate) {
        const minutes = Math.round(data.routes[0].duration / 60)
        onEtaUpdate(minutes)
      }
    } catch {
      // OSRM unavailable — keep last route
    }
  }

  useEffect(() => {
    if (!driverLocation) return
    const { lat, lng } = driverLocation
    updateCountRef.current += 1

    if (updateCountRef.current === 1) {
      // First position — fetch route immediately
      fetchRoute(lat, lng)
      return
    }

    // Every 5 updates (~15s): re-fetch if driver is >60m off route
    if (updateCountRef.current % 5 === 0 && destLat && destLng) {
      const off = distFromRoute(lat, lng, routeCoords)
      if (off > 60 && Date.now() - lastRouteTimeRef.current > 25_000) {
        fetchRoute(lat, lng)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverLocation])

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles-dark"
      />

      {routeCoords.length > 1 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{ color: '#ff4444', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
        />
      )}

      {destLat && destLng && (
        <Marker position={[destLat, destLng]} icon={destIcon}>
          <Popup>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{destinationZone}</span>
          </Popup>
        </Marker>
      )}

      {driverLocation ? (
        <>
          <RecenterMap lat={driverLocation.lat} lng={driverLocation.lng} />
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup className="leaflet-popup-dark">
              <span className="text-xs font-bold">Conductor en ruta</span>
              <br />
              <span className="text-xs text-gray-400">{originZone} → {destinationZone}</span>
            </Popup>
          </Marker>
        </>
      ) : (
        <Marker position={UTA_CENTER}>
          <Popup>
            <span className="text-xs">Esperando ubicación del conductor...</span>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
