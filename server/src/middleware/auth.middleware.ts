import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from './errorHandler';
import { prisma } from '../config/database';
import { UserRole } from '@prisma/client';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Token de acceso requerido');
  }

  const token = header.split(' ')[1];
  try {
    const payload = verifyAccessToken(token) as { userId: string; email: string; role: string };
    req.user = { id: payload.userId, email: payload.email, role: payload.role as UserRole };

    // Auto-reactivate if temporary suspension has expired
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { status: true, suspendedUntil: true },
    });

    if (user?.status === 'SUSPENDED' && user.suspendedUntil && user.suspendedUntil <= new Date()) {
      await prisma.user.update({
        where: { id: payload.userId },
        data: { status: 'ACTIVE', suspendedUntil: null },
      });
    } else if (user?.status === 'SUSPENDED') {
      const until = user.suspendedUntil
        ? ` hasta ${new Date(user.suspendedUntil).toLocaleDateString('es-EC')}`
        : '';
      throw new AppError(403, `Tu cuenta está suspendida${until}.`);
    }

    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'Token inválido o expirado');
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError(401, 'No autenticado');
  }
  if (req.user.role !== 'ADMIN') {
    throw new AppError(403, 'Acceso restringido a administradores');
  }
  next();
}
