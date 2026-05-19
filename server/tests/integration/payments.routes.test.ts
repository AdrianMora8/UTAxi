import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { createVerifiedTestUser, createTestTrip, createTestRequest } from '../helpers/fixtures';

const app = createApp();

describe('Payments Routes - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.payment.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('should create a payment intent', async () => {
    const driver = await createVerifiedTestUser('driver@uta.edu.ec');
    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', 'Password123!', 'Passenger User');
    
    const trip = await createTestTrip(driver.id, { pricePerSeat: 5.0 });
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
      .post('/api/payments/create-intent')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tripRequestId: tripRequest.id
      });

    // It might return 200 or 201 depending on controller
    // As long as it returns an intent with clientSecret or paymentId
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('clientSecret');
    expect(res.body).toHaveProperty('paymentId');
  });

  it('should simulate payment confirmation', async () => {
    const driver = await createVerifiedTestUser('driver@uta.edu.ec');
    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', 'Password123!', 'Passenger User');
    
    const trip = await createTestTrip(driver.id, { pricePerSeat: 5.0 });
    const tripRequest = await createTestRequest(trip.id, passenger.id);
    
    const prisma = getPrisma();
    await prisma.tripRequest.update({
      where: { id: tripRequest.id },
      data: { status: 'ACCEPTED' }
    });

    const payment = await prisma.payment.create({
      data: {
        tripRequestId: tripRequest.id,
        tripId: trip.id,
        payerId: passenger.id,
        amount: 5.0,
        status: 'PENDING',
        stripePaymentId: 'pi_test_123'
      }
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: passenger.email, password: 'Password123!' });
    
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .post('/api/payments/simulate-confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentId: payment.id
      });

    expect(res.status).toBe(200);
    
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: payment.id }
    });
    expect(updatedPayment?.status).toBe('CONFIRMED');
  });
});
