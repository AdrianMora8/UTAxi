import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../config/database';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    role: string;
  };
}

export function registerTrackingHandlers(io: Server) {
  // ─── Autenticación al conectar ────────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Token requerido'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.email = payload.email;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket] Conectado: ${socket.data.userId} (${socket.id})`);

    // Cada usuario se une automáticamente a su sala personal para notificaciones
    void socket.join(`user:${socket.data.userId}`);

    // ─── Unirse a la sala de un viaje ──────────────────────────────────────
    socket.on('join:trip', async ({ tripId }: { tripId: string }) => {
      if (!tripId) return socket.emit('error', { message: 'tripId requerido' });

      // Solo el conductor o pasajeros aceptados pueden unirse a la sala
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) return socket.emit('error', { message: 'Viaje no encontrado' });

      const isDriver = trip.driverId === socket.data.userId;
      const isPassenger = await prisma.tripRequest.findFirst({
        where: { tripId, passengerId: socket.data.userId, status: 'ACCEPTED' },
      });

      if (!isDriver && !isPassenger) {
        return socket.emit('error', { message: 'No tienes acceso a este viaje' });
      }

      void socket.join(`trip:${tripId}`);
      socket.emit('joined:trip', { tripId });
      console.log(`[Socket] ${socket.data.userId} se unió a trip:${tripId}`);
    });

    // ─── Salir de la sala de un viaje ──────────────────────────────────────
    socket.on('leave:trip', ({ tripId }: { tripId: string }) => {
      void socket.leave(`trip:${tripId}`);
      console.log(`[Socket] ${socket.data.userId} salió de trip:${tripId}`);
    });

    // ─── Conductor emite su ubicación ──────────────────────────────────────
    socket.on('location:update', async ({ tripId, lat, lng }: { tripId: string; lat: number; lng: number }) => {
      if (!tripId || lat === undefined || lng === undefined) {
        return socket.emit('error', { message: 'tripId, lat y lng son requeridos' });
      }

      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) return socket.emit('error', { message: 'Viaje no encontrado' });
      if (trip.driverId !== socket.data.userId) {
        return socket.emit('error', { message: 'Solo el conductor puede emitir ubicación' });
      }
      if (trip.status !== 'IN_PROGRESS') {
        return socket.emit('error', { message: 'Solo se puede emitir ubicación en viajes IN_PROGRESS' });
      }

      // Emitir a todos en la sala (excepto el conductor)
      socket.to(`trip:${tripId}`).emit('location:update', {
        lat,
        lng,
        timestamp: new Date().toISOString(),
        driverId: socket.data.userId,
      });
    });

    // ─── Desconexión ───────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Desconectado: ${socket.data.userId} — ${reason}`);
    });
  });
}

// ─── Helper para emitir desde servicios HTTP ──────────────────────────────────
// Se usa en controllers para notificar cambios de estado en tiempo real
let _io: Server | null = null;

export function setIo(io: Server) {
  _io = io;
}

export function emitToTrip(tripId: string, event: string, data: object) {
  _io?.to(`trip:${tripId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: object) {
  _io?.to(`user:${userId}`).emit(event, data);
}
