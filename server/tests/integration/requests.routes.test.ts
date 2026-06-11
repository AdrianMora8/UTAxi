import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import {
  TEST_USERS,
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
// POST /api/requests/trip/:tripId
// ─────────────────────────────────────────────
describe('POST /api/requests/trip/:tripId', () => {
  const PASSWORD = 'Password123!';
  let driverId: string;
  let driverToken: string;
  let passengerId: string;
  let passengerToken: string;

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
    await prisma.safetyAcknowledgment.deleteMany({});
    await prisma.tripEvent.deleteMany({});
    await prisma.trip.deleteMany({});
  });

  it('pasajero crea solicitud correctamente', async () => {
    const trip = await createTestTrip(driverId);

    const res = await request(app)
      .post(`/api/requests/trip/${trip.id}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.request).toMatchObject({
      tripId: trip.id,
      passengerId,
      status: 'PENDING',
    });
  });

  it('conductor no puede solicitar su propio viaje', async () => {
    const trip = await createTestTrip(driverId);

    const res = await request(app)
      .post(`/api/requests/trip/${trip.id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(res.status).toBe(403);
  });

  it('rechaza si no hay cupos disponibles', async () => {
    const trip = await createTestTrip(driverId, { totalSeats: 1, availableSeats: 0 });

    const res = await request(app)
      .post(`/api/requests/trip/${trip.id}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cupos/i);
  });

  it('rechaza si ya tiene solicitud PENDING en ese viaje', async () => {
    const trip = await createTestTrip(driverId);
    await createTestRequest(passengerId, trip.id, 'PENDING');

    const res = await request(app)
      .post(`/api/requests/trip/${trip.id}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('permite re-solicitar si fue REJECTED y tiene menos de 3 rechazos', async () => {
    const trip = await createTestTrip(driverId);
    await prisma.tripRequest.create({
      data: { tripId: trip.id, passengerId, status: 'REJECTED', rejectionCount: 1 },
    });

    const res = await request(app)
      .post(`/api/requests/trip/${trip.id}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('PENDING');
  });

  it('rechaza si ya fue rechazado 3 veces', async () => {
    const trip = await createTestTrip(driverId);
    await prisma.tripRequest.create({
      data: { tripId: trip.id, passengerId, status: 'REJECTED', rejectionCount: 3 },
    });

    const res = await request(app)
      .post(`/api/requests/trip/${trip.id}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/límite/i);
  });

  it('rechaza si hay conflicto de horario como conductor (±2h)', async () => {
    const departureTime = new Date(Date.now() + 3_600_000);
    // Pasajero ya tiene un viaje como conductor en ese horario
    await createTestTrip(passengerId, { departureTime });
    const trip = await createTestTrip(driverId, { departureTime });

    const res = await request(app)
      .post(`/api/requests/trip/${trip.id}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/conductor/i);
  });
});

// ─────────────────────────────────────────────
// GET /api/requests/trip/:tripId
// ─────────────────────────────────────────────
describe('GET /api/requests/trip/:tripId', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;
  let passengerToken: string;
  let passengerId: string;
  let tripId: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver');
    driverId = driver.id;
    await createTestVehicle(driverId);
    driverToken = await loginAs('driver@uta.edu.ec', PASSWORD);

    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', PASSWORD, 'Passenger');
    passengerId = passenger.id;
    passengerToken = await loginAs('passenger@uta.edu.ec', PASSWORD);

    const trip = await createTestTrip(driverId);
    tripId = trip.id;
    await createTestRequest(passengerId, tripId, 'PENDING');
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('conductor ve las solicitudes de su viaje', async () => {
    const res = await request(app)
      .get(`/api/requests/trip/${tripId}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.requests).toBeInstanceOf(Array);
    expect(res.body.requests.length).toBeGreaterThan(0);
  });

  it('pasajero no puede ver solicitudes de un viaje ajeno', async () => {
    const res = await request(app)
      .get(`/api/requests/trip/${tripId}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// GET /api/requests/my
// ─────────────────────────────────────────────
describe('GET /api/requests/my', () => {
  const PASSWORD = 'Password123!';
  let passengerToken: string;
  let passengerId: string;
  let driverId: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver');
    driverId = driver.id;

    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', PASSWORD, 'Passenger');
    passengerId = passenger.id;
    passengerToken = await loginAs('passenger@uta.edu.ec', PASSWORD);

    const trip = await createTestTrip(driverId);
    await createTestRequest(passengerId, trip.id, 'PENDING');
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('pasajero ve solo sus propias solicitudes', async () => {
    const res = await request(app)
      .get('/api/requests/my')
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.requests).toBeInstanceOf(Array);
    expect(res.body.requests.every((r: any) => r.passengerId === passengerId)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/requests/:id/respond
// ─────────────────────────────────────────────
describe('PATCH /api/requests/:id/respond', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;
  let passengerId: string;
  let otherToken: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver');
    driverId = driver.id;
    await createTestVehicle(driverId);
    driverToken = await loginAs('driver@uta.edu.ec', PASSWORD);

    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', PASSWORD, 'Passenger');
    passengerId = passenger.id;

    const other = await createVerifiedTestUser('other@uta.edu.ec', PASSWORD, 'Other');
    await createTestVehicle(other.id);
    otherToken = await loginAs('other@uta.edu.ec', PASSWORD);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.walletTransaction.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.safetyAcknowledgment.deleteMany({});
    await prisma.tripEvent.deleteMany({});
    await prisma.trip.deleteMany({});
  });

  it('conductor acepta solicitud y decrementa availableSeats', async () => {
    const trip = await createTestTrip(driverId, { availableSeats: 3 });
    const req = await createTestRequest(passengerId, trip.id, 'PENDING');

    const res = await request(app)
      .patch(`/api/requests/${req.id}/respond`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ action: 'ACCEPT' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('ACCEPTED');

    const updatedTrip = await prisma.trip.findUnique({ where: { id: trip.id } });
    expect(updatedTrip?.availableSeats).toBe(2);
  });

  it('conductor rechaza solicitud e incrementa rejectionCount', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'PENDING');

    const res = await request(app)
      .patch(`/api/requests/${req.id}/respond`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ action: 'REJECT' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('REJECTED');
    expect(res.body.request.rejectionCount).toBe(1);
  });

  it('solo el conductor del viaje puede responder', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'PENDING');

    const res = await request(app)
      .patch(`/api/requests/${req.id}/respond`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ action: 'ACCEPT' });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/requests/:id (cancelar)
// ─────────────────────────────────────────────
describe('DELETE /api/requests/:id', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;
  let passengerId: string;
  let passengerToken: string;

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
    await prisma.safetyAcknowledgment.deleteMany({});
    await prisma.tripEvent.deleteMany({});
    await prisma.trip.deleteMany({});
  });

  it('cancela solicitud PENDING sin efectos secundarios', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'PENDING');

    const res = await request(app)
      .delete(`/api/requests/${req.id}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refunded).toBe(false);

    const updatedReq = await prisma.tripRequest.findUnique({ where: { id: req.id } });
    expect(updatedReq?.status).toBe('CANCELLED');
  });

  it('cancela solicitud ACCEPTED sin pago y devuelve cupo al viaje', async () => {
    const trip = await createTestTrip(driverId, { availableSeats: 2 });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await prisma.trip.update({ where: { id: trip.id }, data: { availableSeats: { decrement: 1 } } });

    const res = await request(app)
      .delete(`/api/requests/${req.id}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refunded).toBe(false);

    const updatedTrip = await prisma.trip.findUnique({ where: { id: trip.id } });
    expect(updatedTrip?.availableSeats).toBe(2);
  });

  it('cancela con pago ≥10 min antes → reembolso total al wallet', async () => {
    // Viaje en 2 horas (≥10 min)
    const trip = await createTestTrip(driverId, {
      departureTime: new Date(Date.now() + 2 * 3_600_000),
      availableSeats: 2,
    });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    const passengerBefore = await prisma.user.findUnique({ where: { id: passengerId } });
    const balanceBefore = Number(passengerBefore?.walletBalance ?? 0);

    const res = await request(app)
      .delete(`/api/requests/${req.id}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refunded).toBe(true);

    const passengerAfter = await prisma.user.findUnique({ where: { id: passengerId } });
    expect(Number(passengerAfter?.walletBalance)).toBeCloseTo(balanceBefore + 1.5, 2);
  });

  it('cancela con pago <10 min antes → sin reembolso, conductor cobra', async () => {
    // Viaje en 5 minutos (<10 min)
    const trip = await createTestTrip(driverId, {
      departureTime: new Date(Date.now() + 5 * 60_000),
      availableSeats: 2,
    });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    const driverBefore = await prisma.user.findUnique({ where: { id: driverId } });

    const res = await request(app)
      .delete(`/api/requests/${req.id}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refunded).toBe(false);

    const driverAfter = await prisma.user.findUnique({ where: { id: driverId } });
    expect(Number(driverAfter?.walletBalance)).toBeCloseTo(
      Number(driverBefore?.walletBalance) + 1.5,
      2,
    );
  });

  it('cancelación dentro de 30 min de cambio de horario → reembolso total', async () => {
    const trip = await createTestTrip(driverId, {
      departureTime: new Date(Date.now() + 5 * 60_000), // <10 min
      availableSeats: 2,
      departureTimeChangedAt: new Date(), // cambio reciente
    });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    const passengerBefore = await prisma.user.findUnique({ where: { id: passengerId } });
    const balanceBefore = Number(passengerBefore?.walletBalance ?? 0);

    const res = await request(app)
      .delete(`/api/requests/${req.id}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refunded).toBe(true);

    const passengerAfter = await prisma.user.findUnique({ where: { id: passengerId } });
    expect(Number(passengerAfter?.walletBalance)).toBeCloseTo(balanceBefore + 1.5, 2);
  });

  it('rechaza cancelación si el viaje está IN_PROGRESS', async () => {
    const trip = await createTestTrip(driverId, { status: 'IN_PROGRESS' });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .delete(`/api/requests/${req.id}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/requests/:id/arrival
// ─────────────────────────────────────────────
describe('PATCH /api/requests/:id/arrival', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;
  let passengerId: string;
  let otherToken: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver');
    driverId = driver.id;
    await createTestVehicle(driverId);
    driverToken = await loginAs('driver@uta.edu.ec', PASSWORD);

    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', PASSWORD, 'Passenger');
    passengerId = passenger.id;

    const other = await createVerifiedTestUser('other@uta.edu.ec', PASSWORD, 'Other');
    await createTestVehicle(other.id);
    otherToken = await loginAs('other@uta.edu.ec', PASSWORD);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.walletTransaction.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.safetyAcknowledgment.deleteMany({});
    await prisma.tripEvent.deleteMany({});
    await prisma.trip.deleteMany({});
  });

  it('conductor marca llegada del pasajero', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .patch(`/api/requests/${req.id}/arrival`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ arrived: true });

    expect(res.status).toBe(200);
    expect(res.body.request.arrivedAt).not.toBeNull();
  });

  it('solo el conductor del viaje puede marcar llegada', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .patch(`/api/requests/${req.id}/arrival`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ arrived: true });

    expect(res.status).toBe(403);
  });
});
