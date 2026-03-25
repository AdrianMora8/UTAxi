import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
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
}

export default function RouteMap({ originZone, destinationZone, interactive = false }: RouteMapProps) {
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
      <Marker position={destCoords} icon={destIcon}>
        <Popup className="leaflet-popup-dark">
          <span style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
            Destino
          </span>
          <span style={{ fontSize: '11px', color: '#a0a0a0' }}>{destinationZone}</span>
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
