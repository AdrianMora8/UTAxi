import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from './errorHandler';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Token de acceso requerido');
  }

  const token = header.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, email: payload.email, role: payload.role as any };
    next();
  } catch {
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
