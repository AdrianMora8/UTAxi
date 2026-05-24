import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen es demasiado grande (máximo 8 MB)'
      : `Error al subir archivo: ${err.message}`;
    res.status(400).json({ error: msg });
    return;
  }

  // Error de Prisma: registro duplicado (unique constraint)
  if ((err as any).code === 'P2002') {
    res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    return;
  }

  // Error de Prisma: registro no encontrado
  if ((err as any).code === 'P2025') {
    res.status(404).json({ error: 'Recurso no encontrado' });
    return;
  }

  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
