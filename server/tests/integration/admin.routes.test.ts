import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import {
  createVerifiedTestUser,
  createTestVehicle,
  createTestTrip,
  createTestRequest,
} from '../helpers/fixtures';

const app = createApp();
const prisma = getPrisma();

const PASSWORD = 'Password123!';

async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

async function createAdminUser(email = 'admin@uta.edu.ec') {
  const user = await createVerifiedTestUser(email, PASSWORD, 'Admin User');
  return prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
}

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  let adminToken: string;

  beforeAll(async () => {
    await setupTestDb();
    await createAdminUser();
    adminToken = await loginAs('admin@uta.edu.ec', PASSWORD);
  });

  afterAll(async () => { await teardownTestDb(); });

  it('devuelve estadísticas reales de la BD', async () => {
    const driver = await createVerifiedTestUser('driver.stats@uta.edu.ec', PASSWORD, 'Driver Stats');
    await createTestVehicle(driver.id);
    await createTestTrip(driver.id, { status: 'COMPLETED' });
    await createTestTrip(driver.id, { status: 'CANCELLED' });

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      users:   { total: expect.any(Number), active: expect.any(Number), suspended: expect.any(Number) },
      trips:   { total: expect.any(Number), completed: expect.any(Number), cancelled: expect.any(Number), active: expect.any(Number) },
      reports: { open: expect.any(Number), total: expect.any(Number) },
      revenue: expect.any(Number),
      avgReputation: expect.any(Number),
    });
    expect(res.body.trips.completed).toBeGreaterThanOrEqual(1);
    expect(res.body.trips.cancelled).toBeGreaterThanOrEqual(1);
  });

  it('requiere rol ADMIN', async () => {
    const student = await createVerifiedTestUser('student.stats@uta.edu.ec', PASSWORD, 'Student');
    const studentToken = await loginAs('student.stats@uta.edu.ec', PASSWORD);

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it('requiere autenticación', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/admin/events ────────────────────────────────────────────────────

describe('GET /api/admin/events', () => {
  let adminToken: string;
  let tripId: string;

  beforeAll(async () => {
    await setupTestDb();
    await createAdminUser();
    adminToken = await loginAs('admin@uta.edu.ec', PASSWORD);

    const driver = await createVerifiedTestUser('driver.events@uta.edu.ec', PASSWORD, 'Driver Events');
    await createTestVehicle(driver.id);
    const trip = await createTestTrip(driver.id);
    tripId = trip.id;

    await prisma.tripEvent.createMany({
      data: [
        { tripId, type: 'TRIP_PUBLISHED', actorId: driver.id },
        { tripId, type: 'TRIP_STARTED',   actorId: driver.id },
        { tripId, type: 'TRIP_COMPLETED', actorId: driver.id },
      ],
    });
  });

  afterAll(async () => { await teardownTestDb(); });

  it('devuelve lista paginada de eventos', async () => {
    const res = await request(app)
      .get('/api/admin/events')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.events).toBeInstanceOf(Array);
    expect(res.body.events.length).toBeGreaterThanOrEqual(3);
    expect(res.body).toMatchObject({ total: expect.any(Number), page: expect.any(Number) });
  });

  it('filtra por tipo de evento', async () => {
    const res = await request(app)
      .get('/api/admin/events?type=TRIP_PUBLISHED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.events.every((e: { type: string }) => e.type === 'TRIP_PUBLISHED')).toBe(true);
  });

  it('filtra por tripId', async () => {
    const res = await request(app)
      .get(`/api/admin/events?tripId=${tripId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.events.every((e: { tripId: string }) => e.tripId === tripId)).toBe(true);
  });

  it('incluye actor y datos del viaje en cada evento', async () => {
    const res = await request(app)
      .get('/api/admin/events?type=TRIP_PUBLISHED')
      .set('Authorization', `Bearer ${adminToken}`);

    const ev = res.body.events[0];
    expect(ev).toHaveProperty('actor');
    expect(ev).toHaveProperty('trip');
    expect(ev.trip).toHaveProperty('originZone');
  });
});

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────

describe('GET /api/admin/users/:id', () => {
  let adminToken: string;
  let targetId: string;

  beforeAll(async () => {
    await setupTestDb();
    await createAdminUser();
    adminToken = await loginAs('admin@uta.edu.ec', PASSWORD);

    const target = await createVerifiedTestUser('target.detail@uta.edu.ec', PASSWORD, 'Target User');
    targetId = target.id;
  });

  afterAll(async () => { await teardownTestDb(); });

  it('devuelve detalle completo del usuario', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: targetId,
      fullName: 'Target User',
      email: 'target.detail@uta.edu.ec',
      status: 'ACTIVE',
    });
    expect(res.body.user).toHaveProperty('_count');
    expect(res.body.user._count).toMatchObject({
      reportsFiled:    expect.any(Number),
      reportsReceived: expect.any(Number),
      tripsAsDriver:   expect.any(Number),
      tripRequests:    expect.any(Number),
    });
    expect(res.body.user).toHaveProperty('tripsAsDriver');
    expect(res.body.user).toHaveProperty('ratingsReceived');
    expect(res.body.user).toHaveProperty('reportsReceived');
  });

  it('devuelve 404 para ID inexistente', async () => {
    const res = await request(app)
      .get('/api/admin/users/id-que-no-existe')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── GET /api/admin/trips ─────────────────────────────────────────────────────

describe('GET /api/admin/trips', () => {
  let adminToken: string;
  let driverId: string;

  beforeAll(async () => {
    await setupTestDb();
    await createAdminUser();
    adminToken = await loginAs('admin@uta.edu.ec', PASSWORD);

    const driver = await createVerifiedTestUser('driver.trips@uta.edu.ec', PASSWORD, 'Driver Trips');
    driverId = driver.id;
    await createTestVehicle(driverId);

    await createTestTrip(driverId, { status: 'SCHEDULED' });
    await createTestTrip(driverId, { status: 'COMPLETED' });
    await createTestTrip(driverId, { status: 'CANCELLED' });
  });

  afterAll(async () => { await teardownTestDb(); });

  it('devuelve todos los viajes paginados', async () => {
    const res = await request(app)
      .get('/api/admin/trips')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trips).toBeInstanceOf(Array);
    expect(res.body.trips.length).toBeGreaterThanOrEqual(3);
    expect(res.body).toHaveProperty('total');
  });

  it('filtra por estado', async () => {
    const res = await request(app)
      .get('/api/admin/trips?status=COMPLETED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trips.every((t: { status: string }) => t.status === 'COMPLETED')).toBe(true);
  });

  it('incluye datos del conductor en cada viaje', async () => {
    const res = await request(app)
      .get('/api/admin/trips?status=SCHEDULED')
      .set('Authorization', `Bearer ${adminToken}`);

    const trip = res.body.trips[0];
    expect(trip).toHaveProperty('driver');
    expect(trip.driver).toHaveProperty('fullName');
    expect(trip.driver).toHaveProperty('email');
    expect(trip).toHaveProperty('_count');
  });
});

// ─── DELETE /api/admin/trips/:id ─────────────────────────────────────────────

describe('DELETE /api/admin/trips/:id', () => {
  let adminToken: string;
  let driverId: string;
  let passengerId: string;

  beforeAll(async () => {
    await setupTestDb();
    await createAdminUser();
    adminToken = await loginAs('admin@uta.edu.ec', PASSWORD);

    const driver = await createVerifiedTestUser('driver.cancel@uta.edu.ec', PASSWORD, 'Driver Cancel');
    driverId = driver.id;
    await createTestVehicle(driverId);

    const passenger = await createVerifiedTestUser('passenger.cancel@uta.edu.ec', PASSWORD, 'Passenger Cancel');
    passengerId = passenger.id;
  });

  afterAll(async () => { await teardownTestDb(); });

  beforeEach(async () => {
    await prisma.tripEvent.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.trip.deleteMany({});
  });

  it('cancela un viaje SCHEDULED y registra evento', async () => {
    const trip = await createTestTrip(driverId, { status: 'SCHEDULED' });

    const res = await request(app)
      .delete(`/api/admin/trips/${trip.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ cancelled: true, refundedPassengers: 0 });

    const updated = await prisma.trip.findUnique({ where: { id: trip.id } });
    expect(updated!.status).toBe('CANCELLED');

    const event = await prisma.tripEvent.findFirst({ where: { tripId: trip.id, type: 'TRIP_CANCELLED' } });
    expect(event).not.toBeNull();
  });

  it('cancela viaje con pasajero aceptado y reembolsa', async () => {
    const trip = await createTestTrip(driverId, { status: 'SCHEDULED', availableSeats: 2 });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');
    await prisma.payment.create({
      data: {
        tripRequestId: req.id,
        tripId: trip.id,
        payerId: passengerId,
        amount: 1.5,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    const res = await request(app)
      .delete(`/api/admin/trips/${trip.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.refundedPassengers).toBe(1);

    const wallet = await prisma.user.findUnique({ where: { id: passengerId } });
    expect(Number(wallet!.walletBalance)).toBeGreaterThan(0);
  });

  it('devuelve 404 para viaje inexistente', async () => {
    const res = await request(app)
      .delete('/api/admin/trips/id-inexistente')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('no puede cancelar viaje ya COMPLETED', async () => {
    const trip = await createTestTrip(driverId, { status: 'COMPLETED' });

    const res = await request(app)
      .delete(`/api/admin/trips/${trip.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/admin/reports/:id ────────────────────────────────────────────

describe('PATCH /api/admin/reports/:id', () => {
  let adminToken: string;
  let reporterId: string;
  let reportedId: string;

  beforeAll(async () => {
    await setupTestDb();
    await createAdminUser();
    adminToken = await loginAs('admin@uta.edu.ec', PASSWORD);

    const reporter = await createVerifiedTestUser('reporter.admin@uta.edu.ec', PASSWORD, 'Reporter Admin');
    reporterId = reporter.id;

    const reported = await createVerifiedTestUser('reported.admin@uta.edu.ec', PASSWORD, 'Reported Admin');
    reportedId = reported.id;
  });

  afterAll(async () => { await teardownTestDb(); });

  beforeEach(async () => {
    await prisma.report.deleteMany({});
    await prisma.user.updateMany({
      where: { id: reportedId },
      data: { status: 'ACTIVE', suspendedUntil: null },
    });
  });

  async function createOpenReport() {
    return prisma.report.create({
      data: {
        reporterId,
        reportedId,
        reason: 'HARASSMENT',
        description: 'Descripción del reporte de prueba para acción admin',
        status: 'OPEN',
      },
    });
  }

  it('acción WARNED cambia estado del reporte y del usuario', async () => {
    const report = await createOpenReport();

    const res = await request(app)
      .patch(`/api/admin/reports/${report.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'WARNED', notes: 'Primera advertencia formal' });

    expect(res.status).toBe(200);

    const updatedReport = await prisma.report.findUnique({ where: { id: report.id } });
    expect(updatedReport!.status).toBe('REVIEWED');

    const updatedUser = await prisma.user.findUnique({ where: { id: reportedId } });
    expect(updatedUser!.status).toBe('WARNED');
  });

  it('acción SUSPENDED suspende al usuario', async () => {
    const report = await createOpenReport();

    const res = await request(app)
      .patch(`/api/admin/reports/${report.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'SUSPENDED' });

    expect(res.status).toBe(200);

    const updatedUser = await prisma.user.findUnique({ where: { id: reportedId } });
    expect(updatedUser!.status).toBe('SUSPENDED');
  });

  it('acción SUSPENDED con fecha guarda suspendedUntil', async () => {
    const report = await createOpenReport();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .patch(`/api/admin/reports/${report.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'SUSPENDED', suspendedUntil: futureDate });

    expect(res.status).toBe(200);

    const updatedUser = await prisma.user.findUnique({ where: { id: reportedId } });
    expect(updatedUser!.status).toBe('SUSPENDED');
    expect(updatedUser!.suspendedUntil).not.toBeNull();
  });

  it('acción DISMISSED cierra el reporte sin cambiar al usuario', async () => {
    const report = await createOpenReport();

    const res = await request(app)
      .patch(`/api/admin/reports/${report.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'DISMISSED' });

    expect(res.status).toBe(200);

    const updatedReport = await prisma.report.findUnique({ where: { id: report.id } });
    expect(updatedReport!.status).toBe('RESOLVED');

    const updatedUser = await prisma.user.findUnique({ where: { id: reportedId } });
    expect(updatedUser!.status).toBe('ACTIVE');
  });

  it('devuelve 404 para reporte inexistente', async () => {
    const res = await request(app)
      .patch('/api/admin/reports/id-inexistente')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'WARNED' });

    expect(res.status).toBe(404);
  });

  it('rechaza acción inválida', async () => {
    const report = await createOpenReport();

    const res = await request(app)
      .patch(`/api/admin/reports/${report.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'INVALID_ACTION' });

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/admin/users/:id/status — suspensión temporal ─────────────────

describe('PATCH /api/admin/users/:id/status — suspensión temporal', () => {
  let adminToken: string;
  let targetId: string;
  let targetEmail: string;

  beforeAll(async () => {
    await setupTestDb();
    await createAdminUser();
    adminToken = await loginAs('admin@uta.edu.ec', PASSWORD);

    targetEmail = 'suspend.target@uta.edu.ec';
    const target = await createVerifiedTestUser(targetEmail, PASSWORD, 'Suspend Target');
    targetId = target.id;
  });

  afterAll(async () => { await teardownTestDb(); });

  beforeEach(async () => {
    await prisma.user.update({
      where: { id: targetId },
      data: { status: 'ACTIVE', suspendedUntil: null },
    });
  });

  it('suspende indefinidamente sin fecha', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${targetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });

    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    expect(user!.status).toBe('SUSPENDED');
    expect(user!.suspendedUntil).toBeNull();
  });

  it('suspende temporalmente y guarda suspendedUntil', async () => {
    const until = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .patch(`/api/admin/users/${targetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED', suspendedUntil: until });

    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    expect(user!.status).toBe('SUSPENDED');
    expect(user!.suspendedUntil).not.toBeNull();
  });

  it('middleware auto-reactiva usuario cuando suspendedUntil ya expiró', async () => {
    // Suspender con fecha en el pasado
    await prisma.user.update({
      where: { id: targetId },
      data: {
        status: 'SUSPENDED',
        suspendedUntil: new Date(Date.now() - 1000),
      },
    });

    // Cualquier request autenticado dispara la auto-reactivación
    const targetToken = await loginAs(targetEmail, PASSWORD);
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${targetToken}`);

    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    expect(user!.status).toBe('ACTIVE');
    expect(user!.suspendedUntil).toBeNull();
  });

  it('bloquea requests de usuario suspendido con suspensión vigente', async () => {
    await prisma.user.update({
      where: { id: targetId },
      data: {
        status: 'SUSPENDED',
        suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const targetToken = await loginAs(targetEmail, PASSWORD);
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${targetToken}`);

    expect(res.status).toBe(403);
  });

  it('GET /admin/reports filtra por estado OPEN', async () => {
    await prisma.report.createMany({
      data: [
        { reporterId: targetId, reportedId: targetId, reason: 'OTHER', description: 'reporte open de prueba uno', status: 'OPEN' },
        { reporterId: targetId, reportedId: targetId, reason: 'FRAUD', description: 'reporte resolved de prueba', status: 'RESOLVED' },
      ],
    });

    const res = await request(app)
      .get('/api/admin/reports?status=OPEN')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reports.every((r: { status: string }) => r.status === 'OPEN')).toBe(true);
  });
});
