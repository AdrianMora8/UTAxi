import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { TEST_USERS, TEST_VEHICLES, createVerifiedTestUser, createTestVehicle } from '../helpers/fixtures';

/**
 * Pruebas de integración para rutas de usuarios.
 * Verifican perfiles, vehículos y datos de usuario.
 */

const app = createApp();
const prisma = getPrisma();

describe('GET /api/users/me - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
  });

  it('should get current user profile with valid token', async () => {
    const user = await createVerifiedTestUser();

    // Login para obtener token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.accessToken;

    // Obtener perfil
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(user.id);
    expect(response.body.email).toBe(user.email);
    expect(response.body.fullName).toBe(user.fullName);
  });

  it('should reject request without token', async () => {
    const response = await request(app)
      .get('/api/users/me');

    expect(response.status).toBeGreaterThanOrEqual(401);
  });

  it('should reject request with invalid token', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBeGreaterThanOrEqual(401);
  });
});

describe('PATCH /api/users/me - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
  });

  it('should update user profile with valid data', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Updated Name',
        phone: '0987654321',
        neighborhood: 'Nueva zona',
      });

    expect(response.status).toBe(200);
    expect(response.body.fullName).toBe('Updated Name');
    expect(response.body.phone).toBe('0987654321');
  });

  it('should reject invalid profile update', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'A', // Demasiado corto
      });

    expect(response.status).toBe(400);
  });

  it('should allow partial updates', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        phone: '1234567890',
      });

    expect(response.status).toBe(200);
    expect(response.body.phone).toBe('1234567890');
    expect(response.body.fullName).toBe(user.fullName); // Sin cambios
  });
});

describe('POST /api/users/vehicles - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "vehicles" CASCADE');
  });

  it('should create vehicle with valid data', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .post('/api/users/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(TEST_VEHICLES.valid);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.brand).toBe(TEST_VEHICLES.valid.brand);
    expect(response.body.model).toBe(TEST_VEHICLES.valid.model);
  });

  it('should reject invalid vehicle data', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .post('/api/users/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        brand: 'X', // Demasiado corto
        model: '', // Vacío
        year: 1980, // Muy antiguo
      });

    expect(response.status).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/users/vehicles')
      .send(TEST_VEHICLES.valid);

    expect(response.status).toBeGreaterThanOrEqual(401);
  });
});

describe('GET /api/users/vehicles - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "vehicles" CASCADE');
  });

  it('should list user vehicles', async () => {
    const user = await createVerifiedTestUser();
    await createTestVehicle(user.id);
    await createTestVehicle(user.id);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .get('/api/users/vehicles')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
  });

  it('should return empty array if no vehicles', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .get('/api/users/vehicles')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe('PATCH /api/users/vehicles/:vehicleId - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "vehicles" CASCADE');
  });

  it('should update vehicle with valid data', async () => {
    const user = await createVerifiedTestUser();
    const vehicle = await createTestVehicle(user.id);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .patch(`/api/users/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        color: 'Red',
        year: 2023,
      });

    expect(response.status).toBe(200);
    expect(response.body.color).toBe('Red');
    expect(response.body.year).toBe(2023);
  });

  it('should reject update of non-existent vehicle', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .patch('/api/users/vehicles/nonexistent-id')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ color: 'Red' });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/users/vehicles/:vehicleId - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "vehicles" CASCADE');
  });

  it('should delete user vehicle', async () => {
    const user = await createVerifiedTestUser();
    const vehicle = await createTestVehicle(user.id);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .delete(`/api/users/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    // Verificar que se eliminó
    const getRes = await request(app)
      .get('/api/users/vehicles')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getRes.body).toEqual([]);
  });

  it('should reject deletion of non-existent vehicle', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .delete('/api/users/vehicles/nonexistent-id')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
