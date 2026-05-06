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
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
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
    expect(response.body.message).toContain('verification');

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
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
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
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
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

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('verify');
  });

  it('should reject login for non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'notfound@uta.edu.ec',
        password: 'Password123!',
      });

    expect(response.status).toBe(404);
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
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
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
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
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
