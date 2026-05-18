import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { TEST_USERS, createVerifiedTestUser, createTestTrip, createTestVehicle, createTestRequest } from '../helpers/fixtures';

/**
 * Pruebas de integración para rutas de reservas (requests).
 */

const app = createApp();

describe('Requests Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.tripRequest.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('POST /api/requests/trip/:tripId', () => {
    it('should create a request for a trip', async () => {
      const driver = await createVerifiedTestUser('driver@uta.edu.ec');
      await createTestVehicle(driver.id);
      const trip = await createTestTrip(driver.id);

      const passenger = await createVerifiedTestUser('passenger@uta.edu.ec');
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: passenger.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .post(`/api/requests/trip/${trip.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'I want to join' });

      expect(response.status).toBe(201);
      expect(response.body.request).toHaveProperty('id');
      expect(response.body.request.status).toBe('PENDING');
    });

    it('should fail if user is the driver', async () => {
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
        .post(`/api/requests/trip/${trip.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'I want to join my own trip' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/requests/trip/:tripId', () => {
    it('should list requests for a trip to the driver', async () => {
      const driver = await createVerifiedTestUser('driver@uta.edu.ec');
      await createTestVehicle(driver.id);
      const trip = await createTestTrip(driver.id);
      const passenger = await createVerifiedTestUser('passenger@uta.edu.ec');
      await createTestRequest(trip.id, passenger.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: driver.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .get(`/api/requests/trip/${trip.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.requests).toHaveLength(1);
    });
  });

  describe('PATCH /api/requests/:id/respond', () => {
    it('should allow driver to accept a request', async () => {
      const driver = await createVerifiedTestUser('driver@uta.edu.ec');
      await createTestVehicle(driver.id);
      const trip = await createTestTrip(driver.id);
      const passenger = await createVerifiedTestUser('passenger@uta.edu.ec');
      const tripRequest = await createTestRequest(trip.id, passenger.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: driver.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .patch(`/api/requests/${tripRequest.id}/respond`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ action: 'ACCEPT' });

      expect(response.status).toBe(200);
      expect(response.body.request.status).toBe('ACCEPTED');
    });
  });

  describe('DELETE /api/requests/:id', () => {
    it('should allow passenger to cancel their request', async () => {
      const driver = await createVerifiedTestUser('driver@uta.edu.ec');
      await createTestVehicle(driver.id);
      const trip = await createTestTrip(driver.id);
      const passenger = await createVerifiedTestUser('passenger@uta.edu.ec');
      const tripRequest = await createTestRequest(trip.id, passenger.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: passenger.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .delete(`/api/requests/${tripRequest.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.request.status).toBe('CANCELLED');
    });
  });

  describe('PATCH /api/requests/:id/respond (REJECT)', () => {
    it('should allow driver to reject a request', async () => {
      const driver = await createVerifiedTestUser('driver@uta.edu.ec');
      await createTestVehicle(driver.id);
      const trip = await createTestTrip(driver.id);
      const passenger = await createVerifiedTestUser('passenger@uta.edu.ec');
      const tripRequest = await createTestRequest(trip.id, passenger.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: driver.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .patch(`/api/requests/${tripRequest.id}/respond`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ action: 'REJECT' });

      expect(response.status).toBe(200);
      expect(response.body.request.status).toBe('REJECTED');
    });
  });

  describe('GET /api/requests/my', () => {
    it('should list passenger requests', async () => {
      const driver = await createVerifiedTestUser('driver@uta.edu.ec');
      await createTestVehicle(driver.id);
      const trip = await createTestTrip(driver.id);
      const passenger = await createVerifiedTestUser('passenger@uta.edu.ec');
      await createTestRequest(trip.id, passenger.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: passenger.email,
          password: TEST_USERS.validUser.password,
        });

      const accessToken = loginRes.body.accessToken;

      const response = await request(app)
        .get('/api/requests/my')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.requests).toBeInstanceOf(Array);
      expect(response.body.requests).toHaveLength(1);
    });
  });
});
