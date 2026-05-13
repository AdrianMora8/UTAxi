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

export interface TripCompletedPassengerPayload {
  tripId: string;
  requestId: string;
  driverName: string;
  originZone: string;
  destinationZone: string;
}

export interface TripCompletedDriverPayload {
  tripId: string;
  passengers: { requestId: string; name: string }[];
}

export interface NoShowPayload {
  tripId: string;
  requestId: string;
  driverName: string;
  originZone: string;
  destinationZone: string;
  refunded: boolean;
}

export interface ScheduleChangedPayload {
  tripId: string;
  requestId: string;
  originZone: string;
  destinationZone: string;
  oldTime: string;
  newTime: string;
  bigChange: boolean;
}

export interface TripCancelledByDriverPayload {
  tripId: string;
  originZone: string;
  destinationZone: string;
  refundAmount: number;
}

interface UseNotificationsOptions {
  onRequestUpdate?: (payload: RequestUpdatePayload) => void;
  onRequestNew?: (payload: RequestNewPayload) => void;
  onTripCompletedPassenger?: (payload: TripCompletedPassengerPayload) => void;
  onTripCompletedDriver?: (payload: TripCompletedDriverPayload) => void;
  onNoShow?: (payload: NoShowPayload) => void;
  onScheduleChanged?: (payload: ScheduleChangedPayload) => void;
  onTripCancelledByDriver?: (payload: TripCancelledByDriverPayload) => void;
}

export function useNotifications({
  onRequestUpdate,
  onRequestNew,
  onTripCompletedPassenger,
  onTripCompletedDriver,
  onNoShow,
  onScheduleChanged,
  onTripCancelledByDriver,
}: UseNotificationsOptions = {}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  const onUpdateRef = useRef(onRequestUpdate);
  const onNewRef = useRef(onRequestNew);
  const onTripCompletedPassengerRef = useRef(onTripCompletedPassenger);
  const onTripCompletedDriverRef = useRef(onTripCompletedDriver);
  const onNoShowRef = useRef(onNoShow);
  const onScheduleChangedRef = useRef(onScheduleChanged);
  const onTripCancelledByDriverRef = useRef(onTripCancelledByDriver);
  onUpdateRef.current = onRequestUpdate;
  onNewRef.current = onRequestNew;
  onTripCompletedPassengerRef.current = onTripCompletedPassenger;
  onTripCompletedDriverRef.current = onTripCompletedDriver;
  onNoShowRef.current = onNoShow;
  onScheduleChangedRef.current = onScheduleChanged;
  onTripCancelledByDriverRef.current = onTripCancelledByDriver;

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

    socket.on('trip:completed', (payload: TripCompletedPassengerPayload | TripCompletedDriverPayload) => {
      if ('passengers' in payload) {
        onTripCompletedDriverRef.current?.(payload as TripCompletedDriverPayload);
      } else {
        onTripCompletedPassengerRef.current?.(payload as TripCompletedPassengerPayload);
      }
    });

    socket.on('request:cancelled-no-show', (payload: NoShowPayload) => {
      onNoShowRef.current?.(payload);
    });

    socket.on('trip:schedule-changed', (payload: ScheduleChangedPayload) => {
      onScheduleChangedRef.current?.(payload);
    });

    socket.on('trip:cancelled-by-driver', (payload: TripCancelledByDriverPayload) => {
      onTripCancelledByDriverRef.current?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  return socketRef;
}
