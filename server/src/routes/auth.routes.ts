import { Router } from 'express';
import { z } from 'zod';
import { register, verifyEmail, resendCode, login, refresh, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';

const router = Router();

// ─── Schemas de validación ────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  career: z.string().max(100).optional(),
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
});

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// ─── Helper de validación ────────────────────────────────────────────────────

function validate<T>(schema: z.ZodSchema<T>) {
  return (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
    schema.parse(req.body);
    next();
  };
}

// ─── Rutas ────────────────────────────────────────────────────────────────────

router.post('/register', validate(registerSchema), register);
router.post('/verify-email', validate(verifySchema), verifyEmail);
router.post('/resend-code', validate(z.object({ email: z.string().email() })), resendCode);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export { router as authRouter };
