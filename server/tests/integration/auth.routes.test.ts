import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { TEST_USERS, createVerifiedTestUser, createUnverifiedTestUser } from '../helpers/fixtures';
import bcryptjs from 'bcryptjs';

/**
 * Pruebas de integración para rutas de autenticación.
 * Verifican flujos completos: registro, verificación, login, refresh, logout.
 */

const app = createApp();
const prisma = getPrisma();

describe('POST /api/auth/register - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    // Limpiar tabla de usuarios antes de cada test
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
  });

  it('should register a new user with valid UTA email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@uta.edu.ec',
        password: 'SecurePassword123!',
        fullName: 'New User',
        career: 'Systems Engineering',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Código');

    // Verificar que el usuario se creó en BD sin verificar
    const user = await prisma.user.findUnique({
      where: { email: 'newuser@uta.edu.ec' },
    });
    expect(user).toBeDefined();
    expect(user?.emailVerified).toBe(false);
  });

  it('should reject registration with non-UTA email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'hacker@gmail.com',
        password: 'SecurePassword123!',
        fullName: 'Hacker',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject registration with short password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user@uta.edu.ec',
        password: 'short',
        fullName: 'User',
      });

    expect(response.status).toBe(400);
  });

  it('should reject registration with missing fields', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user@uta.edu.ec',
        // sin password ni fullName
      });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/verify-email - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
  });

  it('should verify email with correct code', async () => {
    // Crear usuario sin verificar
    const user = await createUnverifiedTestUser();
    const code = user.emailVerifyToken!;

    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: user.email,
        code,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');

    // Verificar que el usuario ahora está verificado
    const verifiedUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    expect(verifiedUser?.emailVerified).toBe(true);
  });

  it('should reject verification with wrong code', async () => {
    const user = await createUnverifiedTestUser();

    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: user.email,
        code: '999999',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject verification for non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: 'nonexistent@uta.edu.ec',
        code: '123456',
      });

    expect(response.status).toBe(404);
  });
});

describe('POST /api/auth/login - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
  });

  it('should login successfully with verified user', async () => {
    const password = 'MyPassword123!';
    const user = await createVerifiedTestUser('logintest@uta.edu.ec', password);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.id).toBe(user.id);

    // Verificar que se envió refreshToken en cookie
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const user = await createVerifiedTestUser();

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'WrongPassword123!',
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject login with unverified user', async () => {
    const password = 'Password123!';
    const user = await createUnverifiedTestUser('unverified@uta.edu.ec', password);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password,
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('verificar');
  });

  it('should reject login for non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'notfound@uta.edu.ec',
        password: 'Password123!',
      });

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/refresh - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
  });

  it('should refresh access token with valid refresh token', async () => {
    const user = await createVerifiedTestUser();

    // Primero hacer login para obtener tokens
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];

    // Usar el refreshToken de la cookie para renovar el accessToken
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('accessToken');
  });

  it('should reject refresh without refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh');

    expect(response.status).toBeGreaterThanOrEqual(401);
  });
});

describe('POST /api/auth/logout - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
  });

  it('should logout successfully', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const cookies = loginRes.headers['set-cookie'];

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies);

    expect(logoutRes.status).toBe(200);
    // Verificar que el cookie de refresh token se limpió
    expect(logoutRes.headers['set-cookie']).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/resend-code
// ─────────────────────────────────────────────
describe('POST /api/auth/resend-code', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  it('reenvía código a usuario sin verificar y actualiza el token en BD', async () => {
    const user = await createUnverifiedTestUser();
    const tokenAntes = user.emailVerifyToken;

    const res = await request(app)
      .post('/api/auth/resend-code')
      .send({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reenviado/i);

    const actualizado = await prisma.user.findUnique({ where: { email: user.email } });
    expect(actualizado?.emailVerifyToken).not.toBe(tokenAntes);
  });

  it('rechaza si el usuario ya está verificado', async () => {
    const user = await createVerifiedTestUser();

    const res = await request(app)
      .post('/api/auth/resend-code')
      .send({ email: user.email });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/verificad/i);
  });

  it('devuelve 404 para email inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/resend-code')
      .send({ email: 'fantasma@uta.edu.ec' });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────
describe('POST /api/auth/forgot-password', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  it('responde siempre con 200 aunque el email no exista (sin revelar existencia)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'noexiste@uta.edu.ec' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/si la cuenta existe/i);
  });

  it('genera passwordResetToken en BD para usuario existente', async () => {
    const user = await createVerifiedTestUser();

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });

    const actualizado = await prisma.user.findUnique({ where: { id: user.id } });
    expect(actualizado?.passwordResetToken).not.toBeNull();
    expect(actualizado?.passwordResetExpiry).not.toBeNull();
  });

  it('rechaza si falta el campo email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────
describe('POST /api/auth/reset-password', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  it('cambia la contraseña con código válido y permite login con la nueva', async () => {
    const user = await createVerifiedTestUser();

    const RESET_CODE = '987654';
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: RESET_CODE,
        passwordResetExpiry: new Date(Date.now() + 15 * 60_000),
      },
    });

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: user.email, code: RESET_CODE, newPassword: 'NuevaPass456!' });

    expect(resetRes.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'NuevaPass456!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('accessToken');
  });

  it('rechaza con código incorrecto', async () => {
    const user = await createVerifiedTestUser();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: '111111',
        passwordResetExpiry: new Date(Date.now() + 15 * 60_000),
      },
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: user.email, code: '999999', newPassword: 'NuevaPass456!' });

    expect(res.status).toBe(400);
  });

  it('rechaza con código expirado y limpia el token en BD', async () => {
    const user = await createVerifiedTestUser();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: '123456',
        passwordResetExpiry: new Date(Date.now() - 1_000),
      },
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: user.email, code: '123456', newPassword: 'NuevaPass456!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expirad/i);

    const actualizado = await prisma.user.findUnique({ where: { id: user.id } });
    expect(actualizado?.passwordResetToken).toBeNull();
  });

  it('rechaza si no hay solicitud de reset pendiente', async () => {
    const user = await createVerifiedTestUser();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: user.email, code: '123456', newPassword: 'NuevaPass456!' });

    expect(res.status).toBe(400);
  });

  it('rechaza si el usuario no existe', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'noexiste@uta.edu.ec', code: '123456', newPassword: 'NuevaPass456!' });

    expect(res.status).toBe(404);
  });
});
