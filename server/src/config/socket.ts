import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from './env';
import { registerTrackingHandlers, setIo } from '../socket/tracking.gateway';

export function initSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  setIo(io);
  registerTrackingHandlers(io);

  console.log('[Socket.io] Servidor inicializado');
  return io;
}
