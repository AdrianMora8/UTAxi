import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import {
  createVerifiedTestUser,
  createTestVehicle,
  createTestTrip,
  createTestRequest,
  createTestPayment,
} from '../helpers/fixtures';

const app = createApp();
const prisma = getPrisma();

async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

// ─────────────────────────────────────────────
// GET /api/payments/wallet
// ─────────────────────────────────────────────
describe('GET /api/payments/wallet', () => {
  const PASSWORD = 'Password123!';
  let token: string;

  beforeAll(async () => {
    await setupTestDb();
    await createVerifiedTestUser('user@uta.edu.ec', PASSWORD, 'User');
    token = await loginAs('user@uta.edu.ec', PASSWORD);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('devuelve saldo y transacciones del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/payments/wallet')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('walletBalance');
    expect(res.body).toHaveProperty('pendingBalance');
    expect(res.body).toHaveProperty('transactions');
    expect(res.body.transactions).toBeInstanceOf(Array);
  });

  it('rechaza sin autenticación', async () => {
    const res = await request(app).get('/api/payments/wallet');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// POST /api/payments/wallet/topup
// ─────────────────────────────────────────────
describe('POST /api/payments/wallet/topup', () => {
  const PASSWORD = 'Password123!';
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDb();
    const user = await createVerifiedTestUser('user@uta.edu.ec', PASSWORD, 'User');
    userId = user.id;
    token = await loginAs('user@uta.edu.ec', PASSWORD);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.walletTransaction.deleteMany({});
    await prisma.user.update({ where: { id: userId }, data: { walletBalance: 0 } });
  });

  it('recarga wallet y crea transacción TOPUP', async () => {
    const res = await request(app)
      .post('/api/payments/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 10 });

    expect(res.status).toBe(200);
    expect(res.body.walletBalance).toBeCloseTo(10, 2);

    const tx = await prisma.walletTransaction.findFirst({
      where: { userId, concept: 'TOPUP' },
    });
    expect(tx).not.toBeNull();
    expect(Number(tx?.amount)).toBeCloseTo(10, 2);
  });

  it('rechaza monto mayor a $500', async () => {
    const res = await request(app)
      .post('/api/payments/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 501 });

    expect(res.status).toBe(400);
  });

  it('rechaza monto de $0', async () => {
    const res = await request(app)
      .post('/api/payments/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 0 });

    expect(res.status).toBe(400);
  });

  it('rechaza sin autenticación', async () => {
    const res = await request(app)
      .post('/api/payments/wallet/topup')
      .send({ amount: 10 });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// POST /api/payments/pay/wallet
// ─────────────────────────────────────────────
describe('POST /api/payments/pay/wallet', () => {
  const PASSWORD = 'Password123!';
  let driverId: string;
  let passengerId: string;
  let passengerToken: string;
  let driverToken: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver');
    driverId = driver.id;
    await createTestVehicle(driverId);
    driverToken = await loginAs('driver@uta.edu.ec', PASSWORD);

    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', PASSWORD, 'Passenger');
    passengerId = passenger.id;
    passengerToken = await loginAs('passenger@uta.edu.ec', PASSWORD);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.walletTransaction.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.trip.deleteMany({});
    // Resetear balances
    await prisma.user.update({ where: { id: passengerId }, data: { walletBalance: 10 } });
    await prisma.user.update({ where: { id: driverId }, data: { pendingBalance: 0, walletBalance: 0 } });
  });

  it('paga solicitud ACCEPTED con saldo suficiente', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .post('/api/payments/pay/wallet')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBeCloseTo(1.5, 2);
  });

  it('mueve dinero a pendingBalance del conductor (escrow)', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    await request(app)
      .post('/api/payments/pay/wallet')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id });

    const driver = await prisma.user.findUnique({ where: { id: driverId } });
    expect(Number(driver?.pendingBalance)).toBeCloseTo(1.5, 2);

    const passenger = await prisma.user.findUnique({ where: { id: passengerId } });
    expect(Number(passenger?.walletBalance)).toBeCloseTo(10 - 1.5, 2);
  });

  it('rechaza si saldo insuficiente', async () => {
    await prisma.user.update({ where: { id: passengerId }, data: { walletBalance: 0 } });
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .post('/api/payments/pay/wallet')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/saldo/i);
  });

  it('rechaza si solicitud ya está pagada (409)', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    const res = await request(app)
      .post('/api/payments/pay/wallet')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id });

    expect(res.status).toBe(409);
  });

  it('rechaza si solicitud no está ACCEPTED', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'PENDING');

    const res = await request(app)
      .post('/api/payments/pay/wallet')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id });

    expect(res.status).toBe(400);
  });

  it('rechaza si no es el pasajero de la solicitud', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .post('/api/payments/pay/wallet')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ tripRequestId: req.id });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// POST /api/payments/simulate-confirm
// ─────────────────────────────────────────────
describe('POST /api/payments/simulate-confirm', () => {
  const PASSWORD = 'Password123!';
  let driverId: string;
  let passengerId: string;
  let passengerToken: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver');
    driverId = driver.id;
    await createTestVehicle(driverId);

    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', PASSWORD, 'Passenger');
    passengerId = passenger.id;
    passengerToken = await loginAs('passenger@uta.edu.ec', PASSWORD);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.walletTransaction.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.trip.deleteMany({});
  });

  it('confirma un pago pendiente y lo marca como CONFIRMED', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .post('/api/payments/simulate-confirm')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id });

    expect(res.status).toBe(201);
    expect(res.body.payment.status).toBe('CONFIRMED');
    expect(res.body.payment.confirmedAt).not.toBeNull();
  });

  it('rechaza si ya está pagado (409)', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    const res = await request(app)
      .post('/api/payments/simulate-confirm')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id });

    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────
// GET /api/payments/:tripRequestId
// ─────────────────────────────────────────────
describe('GET /api/payments/:tripRequestId', () => {
  const PASSWORD = 'Password123!';
  let driverId: string;
  let passengerId: string;
  let passengerToken: string;
  let otherToken: string;
  let reqId: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver');
    driverId = driver.id;
    await createTestVehicle(driverId);

    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', PASSWORD, 'Passenger');
    passengerId = passenger.id;
    passengerToken = await loginAs('passenger@uta.edu.ec', PASSWORD);

    const other = await createVerifiedTestUser('other@uta.edu.ec', PASSWORD, 'Other');
    otherToken = await loginAs('other@uta.edu.ec', PASSWORD);

    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    reqId = req.id;
    await createTestPayment(reqId, trip.id, passengerId, driverId, 1.5);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('pasajero puede ver los detalles de su pago', async () => {
    const res = await request(app)
      .get(`/api/payments/${reqId}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.payment).toMatchObject({
      tripRequestId: reqId,
      status: 'CONFIRMED',
    });
  });

  it('otro usuario no puede ver el pago', async () => {
    const res = await request(app)
      .get(`/api/payments/${reqId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});
