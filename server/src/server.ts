import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const app = createApp();
const PORT = parseInt(env.PORT, 10);

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Entorno: ${env.NODE_ENV}`);
  console.log(`📧 Dominio permitido: @${env.ALLOWED_EMAIL_DOMAIN}`);
});

// Cierre limpio
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido — cerrando servidor...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT recibido — cerrando servidor...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
