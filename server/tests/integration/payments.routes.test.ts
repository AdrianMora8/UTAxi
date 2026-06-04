import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, cleanupTestDb, getPrisma } from '../helpers/testDb';
import { createVerifiedTestUser, createTestTrip, createTestRequest } from '../helpers/fixtures';

// Mock Stripe to avoid authentication errors in tests
vi.mock('stripe', () => {
  return {
    default: vi.fn(() => ({
      paymentIntents: {
        create: vi.fn(async (params) => ({
          id: 'pi_test_' + Math.random().toString(36).substr(2, 9),
          client_secret: 'pi_test_secret_' + Math.random().toString(36).substr(2, 9),
          amount: params.amount,
          currency: params.currency,
          metadata: params.metadata,
          status: 'requires_payment_method',
        })),
        retrieve: vi.fn(async (id) => ({
          id,
          client_secret: 'pi_test_secret_123',
          amount: 500,
          currency: 'usd',
          status: 'succeeded',
        })),
      },
      webhooks: {
        constructEvent: vi.fn((payload, signature, secret) => ({
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_test_123' } },
        })),
      },
    })),
  };
});

const app = createApp();

describe('Payments Routes - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
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
    
    const trip = await createTestTrip(driver.id, { pricePerSeat: 5 });
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
        tripRequestId: tripRequest.id
      });

    expect([200, 201]).toContain(res.status);
    
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: payment.id }
    });
    expect(updatedPayment?.status).toBe('CONFIRMED');
  });
});
