import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { TEST_USERS, TEST_TRIPS, createVerifiedTestUser, createTestVehicle } from '../helpers/fixtures';

/**
 * Pruebas del sistema para el flujo completo de viaje y reserva.
 * Cubre desde la creación del viaje hasta la aceptación del pasajero.
 */

const app = createApp();

describe('Trip Flow System Test', () => {
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

  it('should complete a full trip flow: create -> request -> accept', async () => {
    // 1. Setup Driver
    const driver = await createVerifiedTestUser('driver@uta.edu.ec');
    await createTestVehicle(driver.id);
    
    const driverLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: driver.email, password: TEST_USERS.validUser.password });
    const driverToken = driverLogin.body.accessToken;

    // 2. Driver creates a trip
    const createTripRes = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send(TEST_TRIPS.valid);
    
    expect(createTripRes.status).toBe(201);
    const tripId = createTripRes.body.trip.id;

    // 3. Setup Passenger
    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec');
    const passengerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: passenger.email, password: TEST_USERS.validUser.password });
    const passengerToken = passengerLogin.body.accessToken;

    // 4. Passenger searches for the trip
    const searchRes = await request(app)
      .get('/api/trips')
      .query({ destinationZone: TEST_TRIPS.valid.destinationZone });
    
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.trips).toContainEqual(expect.objectContaining({ id: tripId }));

    // 5. Passenger requests to join
    const requestRes = await request(app)
      .post(`/api/requests/trip/${tripId}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ message: 'Can I join?' });
    
    expect(requestRes.status).toBe(201);
    const requestId = requestRes.body.request.id;

    // 6. Driver views requests for the trip
    const tripRequestsRes = await request(app)
      .get(`/api/requests/trip/${tripId}`)
      .set('Authorization', `Bearer ${driverToken}`);
    
    expect(tripRequestsRes.status).toBe(200);
    expect(tripRequestsRes.body.requests).toContainEqual(expect.objectContaining({ id: requestId }));

    // 7. Driver accepts the request
    const respondRes = await request(app)
      .patch(`/api/requests/${requestId}/respond`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ action: 'ACCEPT' });
    
    expect(respondRes.status).toBe(200);
    expect(respondRes.body.request.status).toBe('ACCEPTED');

    // 8. Verify trip available seats decreased
    const updatedTripRes = await request(app).get(`/api/trips/${tripId}`);
    expect(updatedTripRes.body.trip.availableSeats).toBe(TEST_TRIPS.valid.availableSeats - 1);
  });
});
