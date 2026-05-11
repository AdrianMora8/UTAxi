import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config';

// Derive socket URL by stripping /api suffix
const SOCKET_URL = API_BASE_URL.replace(/\/api$/, '');

export interface RequestUpdatePayload {
  requestId: string;
  tripId: string;
  status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'PENDING';
  rejectionCount: number;
}

export interface RequestNewPayload {
  requestId: string;
  tripId: string;
  passengerName: string;
}

interface UseNotificationsOptions {
  onRequestUpdate?: (payload: RequestUpdatePayload) => void;
  onRequestNew?: (payload: RequestNewPayload) => void;
}

export function useNotifications({ onRequestUpdate, onRequestNew }: UseNotificationsOptions = {}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  // Use stable refs to avoid reconnecting when callbacks change
  const onUpdateRef = useRef(onRequestUpdate);
  const onNewRef = useRef(onRequestNew);
  onUpdateRef.current = onRequestUpdate;
  onNewRef.current = onRequestNew;

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('request:update', (payload: RequestUpdatePayload) => {
      onUpdateRef.current?.(payload);
    });

    socket.on('request:new', (payload: RequestNewPayload) => {
      onNewRef.current?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  return socketRef;
}
