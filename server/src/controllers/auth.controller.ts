import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { prisma } from '../config/database';
import { env } from '../config/env';

const authService = new AuthService(prisma);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
};

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, fullName, career } = req.body;
  const result = await authService.register(email, password, fullName, career);
  res.status(201).json(result);
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { email, code } = req.body;
  const result = await authService.verifyEmail(email, code);
  res.json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

  res.json({
    accessToken: result.accessToken,
    user: result.user,
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ error: 'Refresh token no encontrado' });
    return;
  }
  const result = await authService.refresh(token);
  res.json(result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      // Si hay usuario autenticado, limpiar el token en BD
      if (req.user) {
        await authService.logout(req.user.id);
      }
    } catch {
      // Ignorar errores al limpiar — igual borramos la cookie
    }
  }

  res.clearCookie('refreshToken');
  res.json({ message: 'Sesión cerrada correctamente' });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.json(result);
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { email, code, newPassword } = req.body;
  const result = await authService.resetPassword(email, code, newPassword);
  res.json(result);
}
