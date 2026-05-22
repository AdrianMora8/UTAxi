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
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
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
    expect(response.body.user.id).toBe(user.id);
    expect(response.body.user.email).toBe(user.email);
    expect(response.body.user.fullName).toBe(user.fullName);
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
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
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
    expect(response.body.user.fullName).toBe('Updated Name');
    expect(response.body.user.phone).toBe('0987654321');
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
    expect(response.body.user.phone).toBe('1234567890');
    expect(response.body.user.fullName).toBe(user.fullName); // Sin cambios
  });
});

describe('POST /api/users/me/vehicle - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
    await prisma.vehicle.deleteMany({});
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
      .post('/api/users/me/vehicle')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(TEST_VEHICLES.valid);

    expect(response.status).toBe(201);
    expect(response.body.vehicle).toHaveProperty('id');
    expect(response.body.vehicle.brand).toBe(TEST_VEHICLES.valid.brand);
    expect(response.body.vehicle.model).toBe(TEST_VEHICLES.valid.model);
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
      .post('/api/users/me/vehicle')
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
      .post('/api/users/me/vehicle')
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
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
    await prisma.vehicle.deleteMany({});
  });

  it('should list user vehicles (get vehicle through /me)', async () => {
    const user = await createVerifiedTestUser();
    await createTestVehicle(user.id);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.vehicle).toBeDefined();
    expect(response.body.user.vehicle.brand).toBe(TEST_VEHICLES.valid.brand);
  });

  it('should return null if no vehicles', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.vehicle).toBeNull();
  });
});

describe('PATCH /api/users/me/vehicle - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
    await prisma.vehicle.deleteMany({});
  });

  it('should update vehicle with valid data', async () => {
    const user = await createVerifiedTestUser();
    await createTestVehicle(user.id);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const response = await request(app)
      .patch('/api/users/me/vehicle')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        color: 'Red',
        year: 2023,
      });

    expect(response.status).toBe(200);
    expect(response.body.vehicle.color).toBe('Red');
    expect(response.body.vehicle.year).toBe(2023);
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
      .patch('/api/users/me/vehicle')
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
    const prisma = getPrisma();
    await prisma.user.deleteMany({});
    await prisma.vehicle.deleteMany({});
  });

  it('should delete user vehicle', async () => {
    const user = await createVerifiedTestUser();
    await createTestVehicle(user.id);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: TEST_USERS.validUser.password,
      });

    const accessToken = loginRes.body.accessToken;

    const deleteRes = await request(app)
      .delete('/api/users/me/vehicle')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(200);

    const meRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.body.user.vehicle).toBeNull();
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
      .delete('/api/users/me/vehicle')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// GET /api/users/:id (perfil público)
// ─────────────────────────────────────────────
describe('GET /api/users/:id - perfil público', () => {
  let token: string;
  let targetId: string;

  beforeAll(async () => {
    await setupTestDb();

    const viewer = await createVerifiedTestUser('viewer@uta.edu.ec', TEST_USERS.validUser.password, 'Viewer');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: viewer.email, password: TEST_USERS.validUser.password });
    token = loginRes.body.accessToken;

    const target = await createVerifiedTestUser('target@uta.edu.ec', TEST_USERS.anotherUser.password, 'Target User');
    await createTestVehicle(target.id);
    targetId = target.id;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('devuelve perfil público con los campos permitidos', async () => {
    const res = await request(app)
      .get(`/api/users/${targetId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: targetId,
      fullName: 'Target User',
    });
    expect(res.body.user).toHaveProperty('reputationScore');
    expect(res.body.user).toHaveProperty('vehicle');
    expect(res.body.user).toHaveProperty('ratingsReceived');
  });

  it('no expone datos sensibles (passwordHash, walletBalance, email)', async () => {
    const res = await request(app)
      .get(`/api/users/${targetId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('walletBalance');
    expect(res.body.user).not.toHaveProperty('email');
    expect(res.body.user).not.toHaveProperty('passwordResetToken');
  });

  it('devuelve 404 para id inexistente', async () => {
    const res = await request(app)
      .get('/api/users/id-que-no-existe-000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('rechaza sin autenticación', async () => {
    const res = await request(app).get(`/api/users/${targetId}`);
    expect(res.status).toBe(401);
  });
});
