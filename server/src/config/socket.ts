import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from './env';
import { registerTrackingHandlers, setIo } from '../socket/tracking.gateway';

export function initSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'production' ? env.FRONTEND_URL : '*',
      credentials: env.NODE_ENV === 'production',
    },
  });

  setIo(io);
  registerTrackingHandlers(io);

  console.warn('[Socket.io] Servidor inicializado');
  return io;
}
