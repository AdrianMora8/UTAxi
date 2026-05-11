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

interface UseNotificationsOptions {
  onRequestUpdate?: (payload: RequestUpdatePayload) => void
  onRequestNew?: (payload: RequestNewPayload) => void
}

export function useNotifications({ onRequestUpdate, onRequestNew }: UseNotificationsOptions = {}) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const socket = io('/', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    if (onRequestUpdate) {
      socket.on('request:update', onRequestUpdate)
    }
    if (onRequestNew) {
      socket.on('request:new', onRequestNew)
    }

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken])

  return socketRef
}
