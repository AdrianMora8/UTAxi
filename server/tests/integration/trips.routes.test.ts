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

// Helper: login y obtener accessToken
async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

// Datos base para crear viaje vía API
function tripPayload(overrides: Record<string, unknown> = {}) {
  return {
    originZone: 'Terminal Norte',
    destinationZone: 'Campus UTA',
    departureTime: new Date(Date.now() + 3_600_000).toISOString(),
    totalSeats: 3,
    pricePerSeat: 1.5,
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// POST /api/trips
// ─────────────────────────────────────────────
describe('POST /api/trips', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver User');
    driverId = driver.id;
    await createTestVehicle(driverId);
    driverToken = await loginAs('driver@uta.edu.ec', PASSWORD);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.tripRequest.deleteMany({});
    await prisma.safetyAcknowledgment.deleteMany({});
    await prisma.tripEvent.deleteMany({});
    await prisma.trip.deleteMany({});
  });

  it('crea un viaje correctamente con conductor que tiene vehículo', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send(tripPayload());

    expect(res.status).toBe(201);
    expect(res.body.trip).toMatchObject({
      originZone: 'Terminal Norte',
      destinationZone: 'Campus UTA',
      totalSeats: 3,
      availableSeats: 3,
      status: 'SCHEDULED',
      driverId,
    });
  });

  it('rechaza si no está autenticado', async () => {
    const res = await request(app).post('/api/trips').send(tripPayload());
    expect(res.status).toBe(401);
  });

  it('rechaza si hay conflicto de horario como conductor (±2h)', async () => {
    const departureTime = new Date(Date.now() + 3_600_000);
    await createTestTrip(driverId, { departureTime });

    // Segundo viaje en el mismo horario
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send(tripPayload({ departureTime: departureTime.toISOString() }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/conductor/i);
  });

  it('rechaza si hay conflicto de horario como pasajero (±2h)', async () => {
    const driver2 = await createVerifiedTestUser('driver2@uta.edu.ec', PASSWORD, 'Driver 2');
    await createTestVehicle(driver2.id);
    const trip = await createTestTrip(driver2.id, {
      departureTime: new Date(Date.now() + 3_600_000),
    });
    // El driverId tiene una solicitud ACCEPTED en ese horario
    await createTestRequest(driverId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send(tripPayload());

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pasajero/i);
  });
});

// ─────────────────────────────────────────────
// GET /api/trips
// ─────────────────────────────────────────────
describe('GET /api/trips', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver User');
    driverId = driver.id;
    await createTestVehicle(driverId);
    driverToken = await loginAs('driver@uta.edu.ec', PASSWORD);
    await createTestTrip(driverId);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('lista viajes disponibles', async () => {
    const res = await request(app)
      .get('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trips).toBeInstanceOf(Array);
    expect(res.body).toHaveProperty('total');
  });

  it('filtra por destinationZone', async () => {
    const res = await request(app)
      .get('/api/trips?destinationZone=Campus')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trips.every((t: any) =>
      t.destinationZone.toLowerCase().includes('campus'),
    )).toBe(true);
  });

  it('filtra por minSeats', async () => {
    const res = await request(app)
      .get('/api/trips?minSeats=2')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trips.every((t: any) => t.availableSeats >= 2)).toBe(true);
  });

  it('filtra por driverId', async () => {
    const res = await request(app)
      .get(`/api/trips?driverId=${driverId}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trips.every((t: any) => t.driverId === driverId)).toBe(true);
  });

  it('filtra por departureDate', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/trips?departureDate=${today}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trips).toBeInstanceOf(Array);
  });

  it('filtra por status', async () => {
    const res = await request(app)
      .get('/api/trips?driverId=' + driverId + '&status=SCHEDULED')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trips.every((t: any) => t.status === 'SCHEDULED')).toBe(true);
  });
});

// ─────────────────────────────────────────────
// GET /api/trips/:id
// ─────────────────────────────────────────────
describe('GET /api/trips/:id', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let tripId: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver User');
    await createTestVehicle(driver.id);
    driverToken = await loginAs('driver@uta.edu.ec', PASSWORD);
    const trip = await createTestTrip(driver.id);
    tripId = trip.id;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('devuelve el detalle de un viaje existente', async () => {
    const res = await request(app)
      .get(`/api/trips/${tripId}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trip.id).toBe(tripId);
  });

  it('devuelve 404 para un id inexistente', async () => {
    const res = await request(app)
      .get('/api/trips/nonexistent-id-000')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/trips/:id
// ─────────────────────────────────────────────
describe('PATCH /api/trips/:id', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;
  let passengerToken: string;
  let passengerId: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver User');
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
    await prisma.payment.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.safetyAcknowledgment.deleteMany({});
    await prisma.tripEvent.deleteMany({});
    await prisma.trip.deleteMany({});
  });

  it('actualiza viaje SCHEDULED sin pagos', async () => {
    const trip = await createTestTrip(driverId);

    const res = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ notes: 'Ruta actualizada' });

    expect(res.status).toBe(200);
    expect(res.body.trip.notes).toBe('Ruta actualizada');
  });

  it('rechaza cambio de precio si hay pagos confirmados', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    const res = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ pricePerSeat: 3.0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/precio/i);
  });

  it('asigna scheduleChangeDeadline si cambio >60 min con pagos', async () => {
    const trip = await createTestTrip(driverId, {
      departureTime: new Date(Date.now() + 4 * 3_600_000),
    });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    const newTime = new Date(Date.now() + 7 * 3_600_000);

    const res = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ departureTime: newTime.toISOString() });

    expect(res.status).toBe(200);

    const updatedReq = await prisma.tripRequest.findUnique({ where: { id: req.id } });
    expect(updatedReq?.scheduleChangeDeadline).not.toBeNull();
  });

  it('rechaza si el viaje no está en SCHEDULED', async () => {
    const trip = await createTestTrip(driverId, { status: 'IN_PROGRESS' });

    const res = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ notes: 'cambio' });

    expect(res.status).toBe(400);
  });

  it('rechaza adelantar la hora de salida si hay pagos confirmados', async () => {
    const originalTime = new Date(Date.now() + 4 * 3_600_000);
    const trip = await createTestTrip(driverId, { departureTime: originalTime });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    // Intentar adelantar la hora (antes de la original)
    const earlierTime = new Date(originalTime.getTime() - 3_600_000);

    const res = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ departureTime: earlierTime.toISOString() });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/adelantar/i);
  });

  it('rechaza si no es el conductor del viaje', async () => {
    const trip = await createTestTrip(driverId);

    const res = await request(app)
      .patch(`/api/trips/${trip.id}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ notes: 'intento' });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/trips/:id (cancelar)
// ─────────────────────────────────────────────
describe('DELETE /api/trips/:id', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;
  let passengerId: string;
  let otherToken: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver User');
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

  it('cancela viaje sin pagos y marca solicitudes como CANCELLED', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .delete(`/api/trips/${trip.id}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trip.status).toBe('CANCELLED');

    const updatedReq = await prisma.tripRequest.findUnique({ where: { id: req.id } });
    expect(updatedReq?.status).toBe('CANCELLED');
  });

  it('cancela viaje con pagos y reembolsa wallets de pasajeros', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    const passengerBefore = await prisma.user.findUnique({ where: { id: passengerId } });
    const balanceBefore = Number(passengerBefore?.walletBalance ?? 0);

    const res = await request(app)
      .delete(`/api/trips/${trip.id}`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);

    const passengerAfter = await prisma.user.findUnique({ where: { id: passengerId } });
    expect(Number(passengerAfter?.walletBalance)).toBeCloseTo(balanceBefore + 1.5, 2);

    const payment = await prisma.payment.findFirst({ where: { tripRequestId: req.id } });
    expect(payment?.status).toBe('REFUNDED');
  });

  it('rechaza si no es el conductor del viaje', async () => {
    const trip = await createTestTrip(driverId);

    const res = await request(app)
      .delete(`/api/trips/${trip.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// POST /api/trips/:id/start
// ─────────────────────────────────────────────
describe('POST /api/trips/:id/start', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;
  let passengerId: string;
  let noPayPassengerId: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver User');
    driverId = driver.id;
    await createTestVehicle(driverId);
    driverToken = await loginAs('driver@uta.edu.ec', PASSWORD);

    const p1 = await createVerifiedTestUser('p1@uta.edu.ec', PASSWORD, 'Passenger 1');
    passengerId = p1.id;

    const p2 = await createVerifiedTestUser('p2@uta.edu.ec', PASSWORD, 'Passenger 2');
    noPayPassengerId = p2.id;
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

  it('inicia el viaje con lista de asistencia correcta', async () => {
    const trip = await createTestTrip(driverId, { departureTime: new Date(Date.now() - 5 * 60_000) });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .post(`/api/trips/${trip.id}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ boardedRequestIds: [req.id] });

    expect(res.status).toBe(200);
    expect(res.body.trip.status).toBe('IN_PROGRESS');
  });

  it('no-show sin pago: solicitud se cancela y cupo no se devuelve', async () => {
    const trip = await createTestTrip(driverId, { departureTime: new Date(Date.now() - 5 * 60_000) });
    const accepted = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    const noShow = await createTestRequest(noPayPassengerId, trip.id, 'ACCEPTED');

    // Solo el primer pasajero abordó
    await request(app)
      .post(`/api/trips/${trip.id}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ boardedRequestIds: [accepted.id] });

    const noShowReq = await prisma.tripRequest.findUnique({ where: { id: noShow.id } });
    expect(noShowReq?.status).toBe('CANCELLED');
  });

  it('no-show con pago: conductor se queda con el dinero', async () => {
    const trip = await createTestTrip(driverId, { departureTime: new Date(Date.now() - 5 * 60_000) });
    const noShowReq = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(noShowReq.id, trip.id, passengerId, driverId, 1.5);

    const otherPassenger = await createVerifiedTestUser('p3@uta.edu.ec', PASSWORD, 'P3');
    const boardedReq = await createTestRequest(otherPassenger.id, trip.id, 'ACCEPTED');

    const driverBefore = await prisma.user.findUnique({ where: { id: driverId } });

    await request(app)
      .post(`/api/trips/${trip.id}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ boardedRequestIds: [boardedReq.id] });

    const driverAfter = await prisma.user.findUnique({ where: { id: driverId } });
    // No-show con pago: pendingBalance baja y walletBalance sube (conductor cobra el fee)
    expect(Number(driverAfter?.walletBalance)).toBeCloseTo(
      Number(driverBefore?.walletBalance) + 1.5,
      2,
    );
  });

  it('rechaza si el viaje no está en SCHEDULED', async () => {
    const trip = await createTestTrip(driverId, { status: 'IN_PROGRESS', departureTime: new Date(Date.now() - 5 * 60_000) });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .post(`/api/trips/${trip.id}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ boardedRequestIds: [req.id] });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/trips/:id/status → COMPLETED
// ─────────────────────────────────────────────
describe('PATCH /api/trips/:id/status (completar)', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;
  let passengerId: string;

  beforeAll(async () => {
    await setupTestDb();
    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver');
    driverId = driver.id;
    await createTestVehicle(driverId);
    driverToken = await loginAs('driver@uta.edu.ec', PASSWORD);

    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', PASSWORD, 'Passenger');
    passengerId = passenger.id;
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

  it('completa el viaje y hace flush de escrow al walletBalance del conductor', async () => {
    const trip = await createTestTrip(driverId, { status: 'IN_PROGRESS' });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    const driverBefore = await prisma.user.findUnique({ where: { id: driverId } });

    const res = await request(app)
      .patch(`/api/trips/${trip.id}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(res.body.trip.status).toBe('COMPLETED');

    const driverAfter = await prisma.user.findUnique({ where: { id: driverId } });
    expect(Number(driverAfter?.walletBalance)).toBeCloseTo(
      Number(driverBefore?.walletBalance) + 1.5,
      2,
    );
    expect(Number(driverAfter?.pendingBalance)).toBeCloseTo(
      Number(driverBefore?.pendingBalance) - 1.5,
      2,
    );
  });

  it('crea transacciones TRIP_EARNING al completar', async () => {
    const trip = await createTestTrip(driverId, { status: 'IN_PROGRESS' });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await createTestPayment(req.id, trip.id, passengerId, driverId, 1.5);

    await request(app)
      .patch(`/api/trips/${trip.id}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'COMPLETED' });

    const earning = await prisma.walletTransaction.findFirst({
      where: { userId: driverId, concept: 'TRIP_EARNING' },
    });
    expect(earning).not.toBeNull();
    expect(Number(earning?.amount)).toBeCloseTo(1.5, 2);
  });
});

// ─────────────────────────────────────────────
// POST /api/trips/:id/confirm-schedule
// ─────────────────────────────────────────────
describe('POST /api/trips/:id/confirm-schedule', () => {
  const PASSWORD = 'Password123!';
  let driverToken: string;
  let driverId: string;
  let passengerToken: string;
  let passengerId: string;

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
    await prisma.payment.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.safetyAcknowledgment.deleteMany({});
    await prisma.tripEvent.deleteMany({});
    await prisma.trip.deleteMany({});
  });

  it('pasajero confirma cambio de horario antes del deadline', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    // Asignar deadline vigente (30 min en el futuro)
    await prisma.tripRequest.update({
      where: { id: req.id },
      data: { scheduleChangeDeadline: new Date(Date.now() + 30 * 60_000) },
    });

    const res = await request(app)
      .post(`/api/trips/${trip.id}/confirm-schedule`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
  });

  it('rechaza confirmación si el deadline ya expiró', async () => {
    const trip = await createTestTrip(driverId);
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    // Deadline expirado
    await prisma.tripRequest.update({
      where: { id: req.id },
      data: { scheduleChangeDeadline: new Date(Date.now() - 60_000) },
    });

    const res = await request(app)
      .post(`/api/trips/${trip.id}/confirm-schedule`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(400);
  });
});
