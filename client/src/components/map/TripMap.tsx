import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { DriverLocation } from '@/hooks/useTracking'

// Fix Leaflet default icon paths broken by Vite's asset hashing
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Cyan pulsing driver marker
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

// UTA campus center — default map center when no driver location yet
const UTA_CENTER: [number, number] = [-1.2491, -78.6167]

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true })
  }, [lat, lng, map])
  return null
}

interface TripMapProps {
  driverLocation: DriverLocation | null
  originZone: string
  destinationZone: string
}

export default function TripMap({ driverLocation, originZone, destinationZone }: TripMapProps) {
  const center: [number, number] = driverLocation
    ? [driverLocation.lat, driverLocation.lng]
    : UTA_CENTER

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

      {driverLocation ? (
        <>
          <RecenterMap lat={driverLocation.lat} lng={driverLocation.lng} />
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup className="leaflet-popup-dark">
              <span className="text-xs font-bold">Conductor en ruta</span>
              <br />
              <span className="text-xs text-gray-400">
                {originZone} → {destinationZone}
              </span>
            </Popup>
          </Marker>
        </>
      ) : (
        // Default marker at UTA when waiting for GPS
        <Marker position={UTA_CENTER}>
          <Popup>
            <span className="text-xs">Esperando ubicación del conductor...</span>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
