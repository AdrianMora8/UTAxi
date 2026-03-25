import { useState, useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon paths broken by Vite's asset hashing
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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
  onDestinationSelect?: (address: string) => void
}

async function getStreetAddress(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
    const data = await res.json()
    if (data && data.address) {
      const road = data.address.road || ''
      const secondary = data.address.neighbourhood || data.address.suburb || data.address.residential || data.address.hamlet || ''
      const city = data.address.city || data.address.town || data.address.village || ''
      
      let addr = ''
      if (road && secondary && road !== secondary) {
        addr = `${road} y ${secondary}`
      } else if (road) {
        addr = road
      } else if (secondary) {
        addr = secondary
      } else {
        addr = 'Ubicación seleccionada'
      }
      return city ? `${addr}, ${city}` : addr
    }
  } catch (err) {
    console.error("Geocoding failed", err)
  }
  return 'Ubicación seleccionada'
}

function DraggableMarker({
  position,
  icon,
  label,
  subLabel,
  interactive,
  onLocationChange,
}: {
  position: [number, number] | null
  icon: L.DivIcon
  label: string
  subLabel: string
  interactive: boolean
  onLocationChange?: (addr: string) => void
}) {
  const markerRef = useRef<L.Marker>(null)

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker != null) {
          const pos = marker.getLatLng()
          if (onLocationChange) {
            getStreetAddress(pos.lat, pos.lng).then(onLocationChange)
          }
        }
      },
    }),
    [onLocationChange],
  )

  if (!position) return null

  return (
    <Marker
      draggable={interactive}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={icon}
      autoPan={true}
    >
      <Popup className="leaflet-popup-dark" minWidth={100}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', display: 'block' }}>{label}</span>
        <span style={{ fontSize: '11px', color: '#a0a0a0' }}>{subLabel || 'Aún no seleccionado'}</span>
        {interactive && (
          <span style={{ fontSize: '9px', color: '#8af2ff', display: 'block', marginTop: '4px', fontStyle: 'italic' }}>
            (Arrastra el marcador para ajustarlo)
          </span>
        )}
      </Popup>
    </Marker>
  )
}

function MapController({ interactive, onLocated }: { interactive: boolean, onLocated: (pos: [number, number]) => void }) {
  const map = useMap()
  const [located, setLocated] = useState(false)
  useEffect(() => {
    if (!interactive || located) return
    map.locate({ enableHighAccuracy: true }).on("locationfound", function (e) {
      if (located) return
      setLocated(true)
      const pos: [number, number] = [e.latlng.lat, e.latlng.lng]
      onLocated(pos)
      map.flyTo(e.latlng, 15)
    })
  }, [map, interactive, located, onLocated])
  return null
}

export default function RouteMap({ originZone, destinationZone, interactive = false, onOriginSelect, onDestinationSelect }: RouteMapProps) {
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null)
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null)

  useEffect(() => {
    if (interactive) return

    let isMounted = true

    if (originZone) {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(originZone + ', Ambato, Ecuador')}&format=json&limit=1`)
        .then(r => r.json())
        .then(d => { if (isMounted && d && d[0]) setOriginCoords([parseFloat(d[0].lat), parseFloat(d[0].lon)]) })
    }
    if (destinationZone) {
      if (CAMPUS_COORDS[destinationZone]) {
        setDestCoords(CAMPUS_COORDS[destinationZone])
      } else {
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destinationZone + ', Ambato, Ecuador')}&format=json&limit=1`)
          .then(r => r.json())
          .then(d => { if (isMounted && d && d[0]) setDestCoords([parseFloat(d[0].lat), parseFloat(d[0].lon)]) })
      }
    }
    
    return () => { isMounted = false }
  }, [interactive, originZone, destinationZone])

  const handleLocated = (pos: [number, number]) => {
    setOriginCoords(pos)
    const dPos: [number, number] = [pos[0] + 0.003, pos[1] + 0.003]
    setDestCoords(dPos)
    if (onOriginSelect && !originZone) getStreetAddress(pos[0], pos[1]).then(onOriginSelect)
    if (onDestinationSelect && !destinationZone) getStreetAddress(dPos[0], dPos[1]).then(onDestinationSelect)
  }

  const displayOrigin = interactive ? (originCoords || UTA_CENTER) : originCoords
  const displayDest = interactive ? (destCoords || [UTA_CENTER[0] + 0.003, UTA_CENTER[1] + 0.003]) : destCoords
  const center = displayOrigin || displayDest || UTA_CENTER

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl={interactive}
      attributionControl={false}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles-dark"
      />
      <MapController interactive={interactive} onLocated={handleLocated} />

      <DraggableMarker
        position={displayOrigin}
        icon={originIcon}
        label="Punto de Partida"
        subLabel={originZone}
        interactive={interactive}
        onLocationChange={onOriginSelect}
      />

      <DraggableMarker
        position={displayDest}
        icon={destIcon}
        label="Punto de Llegada"
        subLabel={destinationZone}
        interactive={interactive}
        onLocationChange={onDestinationSelect}
      />
    </MapContainer>
  )
}
