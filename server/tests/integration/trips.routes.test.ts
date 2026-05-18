import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { TEST_USERS, TEST_TRIPS, createVerifiedTestUser, createTestTrip, createTestVehicle } from '../helpers/fixtures';

/**
 * Pruebas de integración para rutas de viajes (trips).
 */

const app = createApp();

describe('Trips Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.trip.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('POST /api/trips', () => {
    it('should create a trip with valid data and vehicle', async () => {
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
        .post('/api/trips')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(TEST_TRIPS.valid);

      expect(response.status).toBe(201);
      expect(response.body.trip).toHaveProperty('id');
      expect(response.body.trip.originZone).toBe(TEST_TRIPS.valid.originZone);
    });

    it('should fail if user has no vehicle', async () => {
      const user = await createVerifiedTestUser();

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(TEST_TRIPS.valid);

      // El servicio debería lanzar un error si no hay vehículo
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/trips', () => {
    it('should list trips with filters', async () => {
      const driver = await createVerifiedTestUser('driver@uta.edu.ec');
      await createTestVehicle(driver.id);
      await createTestTrip(driver.id, { destinationZone: 'Centro' });
      await createTestTrip(driver.id, { destinationZone: 'Sur' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: driver.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ destinationZone: 'Centro' });

      expect(response.status).toBe(200);
      expect(response.body.trips).toHaveLength(1);
      expect(response.body.trips[0].destinationZone).toBe('Centro');
    });

    it('should get a single trip by id', async () => {
      const driver = await createVerifiedTestUser('driver@uta.edu.ec');
      await createTestVehicle(driver.id);
      const trip = await createTestTrip(driver.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: driver.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .get(`/api/trips/${trip.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.trip.id).toBe(trip.id);
    });
  });

  describe('PATCH /api/trips/:id', () => {
    it('should update trip data', async () => {
      const user = await createVerifiedTestUser();
      await createTestVehicle(user.id);
      const trip = await createTestTrip(user.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .patch(`/api/trips/${trip.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ originZone: 'New Origin' });

      expect(response.status).toBe(200);
      expect(response.body.trip.originZone).toBe('New Origin');
    });
  });

  describe('DELETE /api/trips/:id', () => {
    it('should cancel a trip', async () => {
      const user = await createVerifiedTestUser();
      await createTestVehicle(user.id);
      const trip = await createTestTrip(user.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .delete(`/api/trips/${trip.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.trip.status).toBe('CANCELLED');
    });
  });

  describe('PATCH /api/trips/:id/status', () => {
    it('should update trip status to IN_PROGRESS', async () => {
      const user = await createVerifiedTestUser();
      await createTestVehicle(user.id);
      const trip = await createTestTrip(user.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .patch(`/api/trips/${trip.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(response.status).toBe(200);
      expect(response.body.trip.status).toBe('IN_PROGRESS');
    });
  });

  describe('POST /api/trips/:id/safety-ack', () => {
    it('should acknowledge safety protocol', async () => {
      const user = await createVerifiedTestUser();
      await createTestVehicle(user.id);
      const trip = await createTestTrip(user.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .post(`/api/trips/${trip.id}/safety-ack`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(201);
      expect(response.body.acknowledged).toBe(true);
    });
  });
});
