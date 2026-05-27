import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/authStore'

export interface RequestUpdatePayload {
  requestId: string
  tripId: string
  status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'PENDING'
  rejectionCount: number
}

export interface RequestNewPayload {
  requestId: string
  tripId: string
  passengerName: string
}

export interface TripStartedPayload {
  tripId: string
  originZone: string
  destinationZone: string
  driverName: string
}

export interface TripCompletedPassengerPayload {
  tripId: string
  requestId: string
  driverName: string
  originZone: string
  destinationZone: string
}

export interface TripCompletedDriverPayload {
  tripId: string
  passengers: { requestId: string; name: string }[]
}

export interface NoShowPayload {
  tripId: string
  requestId: string
  driverName: string
  originZone: string
  destinationZone: string
  refunded: boolean
}

export interface ScheduleChangedPayload {
  tripId: string
  requestId: string
  originZone: string
  destinationZone: string
  oldTime: string
  newTime: string
  bigChange: boolean
}

export interface TripCancelledByDriverPayload {
  tripId: string
  originZone: string
  destinationZone: string
  refundAmount: number
}

interface UseNotificationsOptions {
  onRequestUpdate?: (payload: RequestUpdatePayload) => void
  onRequestNew?: (payload: RequestNewPayload) => void
  onTripStarted?: (payload: TripStartedPayload) => void
  onTripCompletedPassenger?: (payload: TripCompletedPassengerPayload) => void
  onTripCompletedDriver?: (payload: TripCompletedDriverPayload) => void
  onNoShow?: (payload: NoShowPayload) => void
  onScheduleChanged?: (payload: ScheduleChangedPayload) => void
  onTripCancelledByDriver?: (payload: TripCancelledByDriverPayload) => void
}

export function useNotifications({
  onRequestUpdate,
  onRequestNew,
  onTripStarted,
  onTripCompletedPassenger,
  onTripCompletedDriver,
  onNoShow,
  onScheduleChanged,
  onTripCancelledByDriver,
}: UseNotificationsOptions = {}) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const socketRef = useRef<Socket | null>(null)

  // Keep refs up-to-date so we never need to reconnect when handlers change
  const onRequestUpdateRef = useRef(onRequestUpdate)
  const onRequestNewRef = useRef(onRequestNew)
  const onTripStartedRef = useRef(onTripStarted)
  const onTripCompletedPassengerRef = useRef(onTripCompletedPassenger)
  const onTripCompletedDriverRef = useRef(onTripCompletedDriver)
  const onNoShowRef = useRef(onNoShow)
  const onScheduleChangedRef = useRef(onScheduleChanged)
  const onTripCancelledByDriverRef = useRef(onTripCancelledByDriver)

  onRequestUpdateRef.current = onRequestUpdate
  onRequestNewRef.current = onRequestNew
  onTripStartedRef.current = onTripStarted
  onTripCompletedPassengerRef.current = onTripCompletedPassenger
  onTripCompletedDriverRef.current = onTripCompletedDriver
  onNoShowRef.current = onNoShow
  onScheduleChangedRef.current = onScheduleChanged
  onTripCancelledByDriverRef.current = onTripCancelledByDriver

  useEffect(() => {
    if (!accessToken) return

    const SOCKET_URL = import.meta.env.DEV ? '/' : (import.meta.env.VITE_API_URL?.replace('/api', '') ?? '/')
    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('request:update', (p: RequestUpdatePayload) => onRequestUpdateRef.current?.(p))
    socket.on('request:new', (p: RequestNewPayload) => onRequestNewRef.current?.(p))
    socket.on('trip:started', (p: TripStartedPayload) => onTripStartedRef.current?.(p))
    socket.on('trip:completed', (p: TripCompletedPassengerPayload | TripCompletedDriverPayload) => {
      if ('passengers' in p) {
        onTripCompletedDriverRef.current?.(p as TripCompletedDriverPayload)
      } else {
        onTripCompletedPassengerRef.current?.(p as TripCompletedPassengerPayload)
      }
    })
    socket.on('request:cancelled-no-show', (p: NoShowPayload) => onNoShowRef.current?.(p))
    socket.on('trip:schedule-changed', (p: ScheduleChangedPayload) => onScheduleChangedRef.current?.(p))
    socket.on('trip:cancelled-by-driver', (p: TripCancelledByDriverPayload) => onTripCancelledByDriverRef.current?.(p))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken])

  return socketRef
}
