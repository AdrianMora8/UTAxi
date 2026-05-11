import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config';

const SOCKET_URL = API_BASE_URL.replace(/\/api$/, '');

export function useLocationTracking(tripId: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const tripIdRef = useRef(tripId);
  tripIdRef.current = tripId;

  useEffect(() => {
    if (!accessToken || !tripId) return;

    let active = true;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:trip', { tripId: tripIdRef.current });
    });

    async function startWatching() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !active) return;

      // Emit current position immediately so passenger doesn't wait
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (active && socket.connected) {
        socket.emit('location:update', {
          tripId: tripIdRef.current,
          lat: current.coords.latitude,
          lng: current.coords.longitude,
        });
      }

      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 3000,
          distanceInterval: 0,
        },
        (loc) => {
          if (!active) return;
          socket.emit('location:update', {
            tripId: tripIdRef.current,
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }
      );
    }

    startWatching();

    return () => {
      active = false;
      watcherRef.current?.remove();
      socket.emit('leave:trip', { tripId: tripIdRef.current });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, tripId]);
}
