import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { prisma } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth.routes';
import { usersRouter } from './routes/users.routes';
import { tripsRouter } from './routes/trips.routes';
import { requestsRouter } from './routes/requests.routes';
import { paymentsRouter } from './routes/payments.routes';
import { ratingsRouter } from './routes/ratings.routes';
import { reportsRouter } from './routes/reports.routes';
import { adminRouter } from './routes/admin.routes';

export function createApp() {
  const app = express();

  // ─── Seguridad y parsers ──────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'connected', env: env.NODE_ENV });
    } catch {
      res.status(503).json({ status: 'error', db: 'disconnected' });
    }
  });

  // ─── Rutas API ────────────────────────────────────────────────────────────
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/trips', tripsRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/ratings', ratingsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/admin', adminRouter);

  // ─── Archivos estáticos (evidencias de reportes) ──────────────────────────
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ─── 404 ──────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // ─── Error handler (debe ser el último middleware) ────────────────────────
  app.use(errorHandler);

  return app;
}
