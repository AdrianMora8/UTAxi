import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config';

const SOCKET_URL = API_BASE_URL.replace(/\/api$/, '');

interface LocationPayload {
  lat: number;
  lng: number;
  timestamp: string;
  driverId: string;
}

interface UseTripTrackingOptions {
  onLocationUpdate: (lat: number, lng: number) => void;
}

export function useTripTracking(tripId: string, { onLocationUpdate }: UseTripTrackingOptions) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const onLocationRef = useRef(onLocationUpdate);
  onLocationRef.current = onLocationUpdate;
  const tripIdRef = useRef(tripId);
  tripIdRef.current = tripId;

  useEffect(() => {
    if (!accessToken || !tripId) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:trip', { tripId: tripIdRef.current });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('location:update', (payload: LocationPayload) => {
      onLocationRef.current(payload.lat, payload.lng);
    });

    return () => {
      socket.emit('leave:trip', { tripId: tripIdRef.current });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [accessToken, tripId]);

  return { connected };
}
