import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/authStore'

export interface DriverLocation {
  lat: number
  lng: number
  timestamp: number
  driverId: string
}

interface UseTrackingOptions {
  tripId: string
  isDriver: boolean
}

export function useTracking({ tripId, isDriver }: UseTrackingOptions) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const socketRef = useRef<Socket | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')

  const emitLocation = useCallback(
    (lat: number, lng: number) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('location:update', { tripId, lat, lng })
      }
    },
    [tripId],
  )

  useEffect(() => {
    if (!accessToken || !tripId) return

    const SOCKET_URL = import.meta.env.DEV ? '/' : (import.meta.env.VITE_API_URL?.replace('/api', '') ?? '/')
    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join:trip', { tripId })
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('connect_error', (err) => {
      setError(`Error de conexión: ${err.message}`)
    })

    // Passenger: receive location updates from driver
    if (!isDriver) {
      socket.on('location:update', (data: DriverLocation) => {
        setDriverLocation(data)
      })
    }

    return () => {
      socket.emit('leave:trip', { tripId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, tripId, isDriver])

  // Driver: start watching geolocation
  useEffect(() => {
    if (!isDriver || !connected) return

    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en este dispositivo.')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        emitLocation(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        setError(`GPS: ${err.message}`)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isDriver, connected, emitLocation])

  return { driverLocation, connected, error }
}
