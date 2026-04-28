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
  try {
    const { email, password, fullName, career } = req.body;
    
    // Validaciones básicas
    if (!email || !password || !fullName) {
      res.status(400).json({ 
        error: 'Email, password y fullName son requeridos' 
      });
      return;
    }

    const result = await authService.register(email, password, fullName, career);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('❌ Error en registro:', error.message);
    
    // Errores conocidos (AppError)
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    
    // Error de conexión a BD
    if (error.message.includes('Authentication failed')) {
      res.status(503).json({ 
        error: 'No se puede conectar a la base de datos. Verifica que PostgreSQL esté corriendo.',
        details: error.message 
      });
      return;
    }
    
    // Otros errores
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      res.status(400).json({ 
        error: 'Email y código de verificación son requeridos' 
      });
      return;
    }

    const result = await authService.verifyEmail(email, code);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error en verificación de email:', error.message);
    
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    
    if (error.message.includes('Authentication failed')) {
      res.status(503).json({ 
        error: 'No se puede conectar a la base de datos.',
        details: error.message 
      });
      return;
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
      return;
    }

    const result = await authService.login(email, password);

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error: any) {
    console.error('❌ Error en login:', error.message);
    
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    
    if (error.message.includes('Authentication failed')) {
      res.status(503).json({ 
        error: 'No se puede conectar a la base de datos. Verifica que PostgreSQL esté corriendo.',
        details: error.message 
      });
      return;
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ error: 'Refresh token no encontrado en las cookies' });
      return;
    }
    
    const result = await authService.refresh(token);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error en refresh:', error.message);
    
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ 
      error: 'Error al renovar el token',
      details: error.message 
    });
  }
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
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email es requerido' });
      return;
    }
    
    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error en forgotPassword:', error.message);
    
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ 
      error: 'Error al procesar recuperación de contraseña',
      details: error.message 
    });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      res.status(400).json({ 
        error: 'Email, código y nueva contraseña son requeridos' 
      });
      return;
    }
    
    const result = await authService.resetPassword(email, code, newPassword);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error en resetPassword:', error.message);
    
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ 
      error: 'Error al resetear contraseña',
      details: error.message 
    });
  }
}
