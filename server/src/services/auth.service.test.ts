import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock de env antes de cualquier otra cosa
vi.mock('../config/env', () => ({
  env: {
    ALLOWED_EMAIL_DOMAIN: 'uta.edu.ec',
    NODE_ENV: 'test',
  },
}))

import { AuthService } from './auth.service'
import { AppError } from '../middleware/errorHandler'

// Mock de funciones de utilidad
vi.mock('../utils/hash', () => ({
  hashPassword: vi.fn(async (pwd: string) => `hashed_${pwd}`),
  comparePassword: vi.fn(async (pwd: string, hash: string) => hash === `hashed_${pwd}`),
  generateOTP: vi.fn(() => '123456'),
}));

vi.mock('../utils/jwt', () => ({
  signAccessToken: vi.fn(() => 'access_token'),
  signRefreshToken: vi.fn(() => 'refresh_token'),
  verifyRefreshToken: vi.fn((token: string) => {
    if (token === 'valid_refresh_token' || token === 'refresh_token') {
      return { userId: 'user-1', email: 'test@uta.edu.ec', role: 'USER' };
    }
    throw new Error('Invalid token');
  }),
}));

vi.mock('../config/mailer', () => ({
  sendVerificationEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
}));

const makePrismaMock = () => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

describe('AuthService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: AuthService;
  const validEmail = 'test@uta.edu.ec';
  const validPassword = 'Password123!';
  const fullName = 'Test User';
  const career = 'Computer Science';

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new AuthService(prisma as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('registers a new user with valid data', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: validEmail,
        passwordHash: 'hashed_password',
      });

      const result = await service.register(validEmail, validPassword, fullName, career);

      expect(result).toEqual({
        message: `Código de verificación enviado a ${validEmail}`,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: validEmail } });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('throws error when user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: validEmail });

      await expect(
        service.register(validEmail, validPassword, fullName, career),
      ).rejects.toEqual(new AppError(409, 'Ya existe una cuenta con ese correo'));
    });

    it('throws error for non-institutional email', async () => {
      const invalidEmail = 'test@gmail.com';

      await expect(
        service.register(invalidEmail, validPassword, fullName, career),
      ).rejects.toThrow('Solo se permiten correos @uta.edu.ec');
    });
  });

  describe('verifyEmail', () => {
    it('verifies email with correct code', async () => {
      const user = {
        id: 'user-1',
        email: validEmail,
        emailVerified: false,
        emailVerifyToken: '123456',
        emailVerifyExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({ ...user, emailVerified: true });

      const result = await service.verifyEmail(validEmail, '123456');

      expect(result).toEqual({
        message: 'Correo verificado correctamente. Ya puedes iniciar sesión.',
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: validEmail },
        data: {
          emailVerified: true,
          emailVerifyToken: null,
          emailVerifyExpiry: null,
        },
      });
    });

    it('throws error when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail(validEmail, '123456')).rejects.toEqual(
        new AppError(404, 'Usuario no encontrado'),
      );
    });

    it('throws error when email already verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        emailVerified: true,
      });

      const result = await service.verifyEmail(validEmail, '123456');

      expect(result).toEqual({
        message: 'El correo ya fue verificado. Puedes iniciar sesión.',
      });
    });

    it('throws error when code is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        emailVerified: false,
        emailVerifyToken: '123456',
        emailVerifyExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });

      await expect(service.verifyEmail(validEmail, '999999')).rejects.toEqual(
        new AppError(400, 'Código incorrecto'),
      );
    });

    it('throws error when code has expired', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        emailVerified: false,
        emailVerifyToken: '123456',
        emailVerifyExpiry: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
      });

      await expect(service.verifyEmail(validEmail, '123456')).rejects.toEqual(
        new AppError(400, 'El código ha expirado. Vuelve a registrarte para obtener uno nuevo.'),
      );
    });
  });

  describe('login', () => {
    it('logs in user with correct credentials', async () => {
      const user = {
        id: 'user-1',
        email: validEmail,
        fullName: 'Test User',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        passwordHash: 'hashed_Password123!',
        reputationScore: 5,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      const result = await service.login(validEmail, validPassword);

      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        user: {
          id: 'user-1',
          email: validEmail,
          fullName: 'Test User',
          role: 'USER',
          reputationScore: 5,
        },
      });
    });

    it('throws error when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(validEmail, validPassword)).rejects.toEqual(
        new AppError(401, 'Credenciales inválidas'),
      );
    });

    it('throws error when email not verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: validEmail,
        emailVerified: false,
      });

      await expect(service.login(validEmail, validPassword)).rejects.toEqual(
        new AppError(401, 'Debes verificar tu correo antes de iniciar sesión'),
      );
    });

    it('throws error when account is suspended', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: validEmail,
        emailVerified: true,
        status: 'SUSPENDED',
      });

      await expect(service.login(validEmail, validPassword)).rejects.toEqual(
        new AppError(403, 'Tu cuenta está suspendida. Contacta al administrador.'),
      );
    });

    it('throws error with invalid password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: validEmail,
        emailVerified: true,
        status: 'ACTIVE',
        passwordHash: 'hashed_DifferentPassword',
      });

      await expect(service.login(validEmail, validPassword)).rejects.toEqual(
        new AppError(401, 'Credenciales inválidas'),
      );
    });
  });

  describe('refresh', () => {
    it('refreshes access token with valid refresh token', async () => {
      const user = {
        id: 'user-1',
        email: validEmail,
        role: 'USER',
        status: 'ACTIVE',
        refreshToken: 'hashed_valid_refresh_token',
      };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.refresh('valid_refresh_token');

      expect(result).toEqual({ accessToken: 'access_token' });
    });

    it('throws error with invalid refresh token', async () => {
      await expect(service.refresh('invalid_token')).rejects.toEqual(
        new AppError(401, 'Refresh token inválido o expirado'),
      );
    });

    it('throws error when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid_refresh_token')).rejects.toEqual(
        new AppError(401, 'Sesión no válida'),
      );
    });

    it('throws error when account is suspended', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: 'SUSPENDED',
        refreshToken: 'hashed_refresh_token',
      });

      await expect(service.refresh('valid_refresh_token')).rejects.toEqual(
        new AppError(403, 'Tu cuenta está suspendida'),
      );
    });

    it('throws error when stored token does not match', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: 'ACTIVE',
        refreshToken: 'hashed_different_token',
      });

      await expect(service.refresh('valid_refresh_token')).rejects.toEqual(
        new AppError(401, 'Refresh token inválido'),
      );
    });
  });

  describe('logout', () => {
    it('clears refresh token on logout', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        refreshToken: null,
      });

      const result = await service.logout('user-1');

      expect(result).toEqual({ message: 'Sesión cerrada correctamente' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: null },
      });
    });

    it('throws error when user not found', async () => {
      prisma.user.update.mockRejectedValue(new Error('User not found'));

      await expect(service.logout('user-1')).rejects.toThrow('User not found');
    });

    it('succeeds even with null refreshToken stored', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        refreshToken: null,
      });

      const result = await service.logout('user-1');

      expect(result).toEqual({ message: 'Sesión cerrada correctamente' });
    });
  });

  describe('forgotPassword', () => {
    it('sends reset code to user email', async () => {
      const user = {
        id: 'user-1',
        email: validEmail,
        passwordResetToken: null,
        passwordResetExpiry: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({
        ...user,
        passwordResetToken: '123456',
      });

      const result = await service.forgotPassword(validEmail);

      expect(result).toEqual({
        message: 'Si la cuenta existe, recibirás un correo para recuperar tu contraseña',
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: validEmail },
        data: {
          passwordResetToken: '123456',
          passwordResetExpiry: expect.any(Date),
        },
      });
    });

    it('does not reveal if email does not exist (security)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(validEmail);

      expect(result).toEqual({
        message: 'Si la cuenta existe, recibirás un correo para recuperar tu contraseña',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('sets correct token expiration time (30 minutes)', async () => {
      const user = {
        id: 'user-1',
        email: validEmail,
        passwordResetToken: null,
        passwordResetExpiry: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({
        ...user,
        passwordResetToken: '123456',
      });

      const beforeCall = Date.now();
      await service.forgotPassword(validEmail);
      const afterCall = Date.now();

      // Get the actual call arguments
      const callArgs = prisma.user.update.mock.calls[0][0];
      const expiryTime = callArgs.data.passwordResetExpiry.getTime();

      // Should be approximately 15 minutes from now (with 5 second tolerance for execution time)
      const expectedExpiry = beforeCall + 15 * 60 * 1000;
      const tolerance = 5 * 1000; // 5 seconds

      expect(expiryTime).toBeGreaterThanOrEqual(expectedExpiry - tolerance);
      expect(expiryTime).toBeLessThanOrEqual(afterCall + 15 * 60 * 1000 + tolerance);
    });
  });

  describe('resetPassword', () => {
    const code = '123456';
    const newPassword = 'NewPassword456!';

    it('resets password with valid code', async () => {
      const user = {
        id: 'user-1',
        email: validEmail,
        passwordHash: 'old_hash',
        passwordResetToken: code,
        passwordResetExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({
        ...user,
        passwordHash: `hashed_${newPassword}`,
        passwordResetToken: null,
        passwordResetExpiry: null,
      });

      const result = await service.resetPassword(validEmail, code, newPassword);

      expect(result).toEqual({
        message: 'Contraseña recuperada correctamente. Ya puedes iniciar sesión.',
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: validEmail },
        data: {
          passwordHash: `hashed_${newPassword}`,
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });
    });

    it('throws error when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(validEmail, code, newPassword)).rejects.toEqual(
        new AppError(404, 'Usuario no encontrado'),
      );
    });

    it('throws error when no reset request pending', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: validEmail,
        passwordResetToken: null,
        passwordResetExpiry: null,
      });

      await expect(service.resetPassword(validEmail, code, newPassword)).rejects.toThrow(
        'No hay solicitud de recuperación pendiente',
      );
    });

    it('throws error when code has expired', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: validEmail,
        passwordResetToken: code,
        passwordResetExpiry: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
      });

      await expect(service.resetPassword(validEmail, code, newPassword)).rejects.toThrow(
        /El código ha expirado/,
      );
    });

    it('throws error when code is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: validEmail,
        passwordResetToken: code,
        passwordResetExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });

      await expect(service.resetPassword(validEmail, '999999', newPassword)).rejects.toThrow(
        'Código incorrecto',
      );
    });
  });
});
