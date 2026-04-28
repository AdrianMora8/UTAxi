import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { hashPassword, comparePassword, generateOTP } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../config/mailer';
import { env } from '../config/env';

const OTP_EXPIRY_MINUTES = 15;

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(email: string, password: string, fullName: string, career?: string) {
    try {
      // Validar dominio institucional
      const domain = email.split('@')[1];
      if (domain !== env.ALLOWED_EMAIL_DOMAIN) {
        throw new AppError(400, `Solo se permiten correos @${env.ALLOWED_EMAIL_DOMAIN}`);
      }

      // Verificar que no exista
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError(409, 'Ya existe una cuenta con ese correo');
      }

      const passwordHash = await hashPassword(password);
      const code = generateOTP();
      const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          career,
          emailVerifyToken: code,
          emailVerifyExpiry: expiry,
        },
      });

      await sendVerificationEmail(email, code);

      return { message: `Código de verificación enviado a ${email}` };
    } catch (error: any) {
      // Si es un AppError, relanzar
      if (error.status) throw error;
      
      // Log de error detallado
      console.error('🔴 Error en register:', {
        message: error.message,
        code: error.code,
        email
      });

      // Errores de conexión a BD
      if (error.message.includes('Authentication failed')) {
        throw new AppError(503, 'No se puede conectar a la base de datos. Verifica que PostgreSQL esté corriendo en el puerto correcto.');
      }
      
      // Errores de constraint
      if (error.code === 'P2002') {
        throw new AppError(409, 'Ya existe una cuenta con ese correo');
      }
      
      throw new AppError(500, `Error al registrar: ${error.message}`);
    }
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    if (user.emailVerified) {
      return { message: 'El correo ya fue verificado. Puedes iniciar sesión.' };
    }
    if (!user.emailVerifyToken || !user.emailVerifyExpiry) {
      throw new AppError(400, 'No hay código de verificación pendiente');
    }
    if (new Date() > user.emailVerifyExpiry) {
      throw new AppError(400, 'El código ha expirado. Vuelve a registrarte para obtener uno nuevo.');
    }
    if (user.emailVerifyToken !== code) {
      throw new AppError(400, 'Código incorrecto');
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });

    return { message: 'Correo verificado correctamente. Ya puedes iniciar sesión.' };
  }

  async login(email: string, password: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        throw new AppError(401, 'Credenciales inválidas');
      }
      if (!user.emailVerified) {
        throw new AppError(401, 'Debes verificar tu correo antes de iniciar sesión');
      }
      if (user.status === 'SUSPENDED') {
        throw new AppError(403, 'Tu cuenta está suspendida. Contacta al administrador.');
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        throw new AppError(401, 'Credenciales inválidas');
      }

      const payload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      // Guardar refresh token hasheado en BD
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: await hashPassword(refreshToken) },
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          reputationScore: user.reputationScore,
        },
      };
    } catch (error: any) {
      // Si es un AppError, relanzar
      if (error.status) throw error;
      
      console.error('🔴 Error en login:', {
        message: error.message,
        code: error.code,
        email
      });

      if (error.message.includes('Authentication failed')) {
        throw new AppError(503, 'No se puede conectar a la base de datos. Verifica que PostgreSQL esté corriendo.');
      }
      
      throw new AppError(500, `Error al iniciar sesión: ${error.message}`);
    }
  }

  async refresh(token: string) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError(401, 'Refresh token inválido o expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.refreshToken) {
      throw new AppError(401, 'Sesión no válida');
    }
    if (user.status === 'SUSPENDED') {
      throw new AppError(403, 'Tu cuenta está suspendida');
    }

    // Verificar que el token coincide con el almacenado
    const valid = await comparePassword(token, user.refreshToken);
    if (!valid) {
      throw new AppError(401, 'Refresh token inválido');
    }

    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(newPayload);

    return { accessToken };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Sesión cerrada correctamente' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // No revelar si el usuario existe o no (por seguridad)
      return { message: 'Si la cuenta existe, recibirás un correo para recuperar tu contraseña' };
    }

    const code = generateOTP();
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    await this.prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: code,
        passwordResetExpiry: expiry,
      },
    });

    await sendPasswordResetEmail(email, code);

    return { message: 'Si la cuenta existe, recibirás un correo para recuperar tu contraseña' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    if (!user.passwordResetToken || !user.passwordResetExpiry) {
      throw new AppError(400, 'No hay solicitud de recuperación de contraseña pendiente');
    }
    if (new Date() > user.passwordResetExpiry) {
      throw new AppError(400, 'El código ha expirado. Solicita un nuevo código.');
    }
    if (user.passwordResetToken !== code) {
      throw new AppError(400, 'Código incorrecto');
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return { message: 'Contraseña recuperada correctamente. Ya puedes iniciar sesión.' };
  }
}
