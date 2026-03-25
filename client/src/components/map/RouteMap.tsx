import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon paths broken by Vite's asset hashing
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Green destination marker
const destIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:32px;height:32px;background:rgba(0,252,64,0.15);border-radius:50%;"></div>
      <div style="width:14px;height:14px;background:#00fc40;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(0,252,64,0.6);"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// Known UTA campus coordinates (Ambato, Ecuador)
const CAMPUS_COORDS: Record<string, [number, number]> = {
  'Campus Central UTA — Huachi': [-1.2491, -78.6167],
  'Facultad de Ingeniería Civil (FICE)': [-1.2505, -78.6182],
  'Facultad de Ingeniería en Sistemas (FISI)': [-1.2478, -78.6153],
  'Facultad de Ciencias Administrativas (FCA)': [-1.2466, -78.6171],
  'Facultad de Ciencias Humanas y de la Educación (FCHE)': [-1.2512, -78.6148],
  'Facultad de Diseño, Arquitectura y Artes (FDAA)': [-1.2498, -78.6138],
  'Facultad de Ciencias de la Salud (FCS)': [-1.2483, -78.6194],
  'Facultad de Jurisprudencia (FJ)': [-1.2471, -78.6208],
}

const UTA_CENTER: [number, number] = [-1.2491, -78.6167]

interface RouteMapProps {
  originZone: string
  destinationZone: string
  interactive?: boolean
  onOriginSelect?: (address: string) => void
}

function UserLocation({ interactive }: { interactive: boolean }) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const map = useMap()

  useEffect(() => {
    if (!interactive) return

    map.locate({ enableHighAccuracy: true }).on("locationfound", function (e) {
      setUserPos([e.latlng.lat, e.latlng.lng])
      map.flyTo(e.latlng, map.getZoom())
    })
  }, [map, interactive])

  const userIcon = L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:24px;height:24px;background:rgba(255,64,129,0.2);border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:12px;height:12px;background:#ff4081;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(255,64,129,0.6);"></div>
      </div>
      <style>@keyframes ping{75%,100%{transform:scale(2);opacity:0;}}</style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  return userPos === null ? null : (
    <Marker position={userPos} icon={userIcon}>
      <Popup className="leaflet-popup-dark">
        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Mi Ubicación Real</span>
      </Popup>
    </Marker>
  )
}

function LocationSelector({ interactive, onSelect }: { interactive: boolean, onSelect?: (address: string) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  
  useMapEvents({
    click(e) {
      if (!interactive) return
      setPosition([e.latlng.lat, e.latlng.lng])
      
      // Reverse geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const address = data.address.road || data.address.neighbourhood || data.address.suburb || 'Ubicación seleccionada'
            const city = data.address.city || data.address.town || data.address.village || ''
            const shortAddress = city && address !== city ? `${address}, ${city}` : address
            if (onSelect) onSelect(shortAddress)
          } else if (onSelect) {
            onSelect('Ubicación seleccionada')
          }
        })
        .catch(err => console.error("Geocoding failed", err))
    }
  })

  // Blue origin icon
  const originIcon = L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:32px;height:32px;background:rgba(0,122,255,0.15);border-radius:50%;"></div>
        <div style="width:14px;height:14px;background:#007aff;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(0,122,255,0.6);"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })

  return position === null ? null : (
    <Marker position={position} icon={originIcon}>
      <Popup className="leaflet-popup-dark">
        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Punto de Salida</span>
      </Popup>
    </Marker>
  )
}

export default function RouteMap({ originZone, destinationZone, interactive = false, onOriginSelect }: RouteMapProps) {
  const destCoords = CAMPUS_COORDS[destinationZone] ?? UTA_CENTER

  return (
    <MapContainer
      center={destCoords}
      zoom={15}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles-dark"
      />
      
      <UserLocation interactive={interactive} />
      <LocationSelector interactive={interactive} onSelect={onOriginSelect} />

      <Marker position={destCoords} icon={destIcon}>
        <Popup className="leaflet-popup-dark">
          <span style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
            Destino
          </span>
          <span style={{ fontSize: '11px', color: '#a0a0a0' }}>{destinationZone || 'Aún no seleccionado'}</span>
          {originZone && (
            <>
              <hr style={{ margin: '6px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: '10px', color: '#666' }}>Desde: {originZone}</span>
            </>
          )}
        </Popup>
      </Marker>
    </MapContainer>
  )
}
