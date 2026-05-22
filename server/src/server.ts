import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { initSocket } from './config/socket';

const app = createApp();
const httpServer = createServer(app);
const PORT = Number.parseInt(env.PORT, 10);

initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Entorno: ${env.NODE_ENV}`);
  console.log(`📧 Dominio permitido: @${env.ALLOWED_EMAIL_DOMAIN}`);
  console.log(`🔌 Socket.io listo`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido — cerrando servidor...');
  await prisma.$disconnect();
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT recibido — cerrando servidor...');
  await prisma.$disconnect();
  httpServer.close(() => process.exit(0));
});
