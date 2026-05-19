import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { createVerifiedTestUser, createTestTrip, createTestRequest } from '../helpers/fixtures';

const app = createApp();

describe('Ratings Routes - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.rating.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('should create a rating for a completed trip request', async () => {
    const driver = await createVerifiedTestUser('driver@uta.edu.ec');
    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', 'Password123!', 'Passenger User');
    
    const trip = await createTestTrip(driver.id, { status: 'COMPLETED' });
    const tripRequest = await createTestRequest(trip.id, passenger.id);
    
    const prisma = getPrisma();
    await prisma.tripRequest.update({
      where: { id: tripRequest.id },
      data: { status: 'ACCEPTED' }
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: passenger.email, password: 'Password123!' });
    
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tripRequestId: tripRequest.id,
        ratedId: driver.id,
        score: 5,
        comment: 'Great driver!',
        raterRole: 'PASSENGER'
      });

    expect(res.status).toBe(201);
    expect(res.body.rating.score).toBe(5);
  });

  it('should get user ratings', async () => {
    const user = await createVerifiedTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Password123!' });
    
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .get(`/api/ratings/user/${user.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.ratings)).toBe(true);
  });
});
