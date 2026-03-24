import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { hashPassword, comparePassword, generateOTP } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendVerificationEmail } from '../config/mailer';
import { env } from '../config/env';

const OTP_EXPIRY_MINUTES = 15;

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(email: string, password: string, fullName: string, career?: string) {
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
}
