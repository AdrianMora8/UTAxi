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

async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

// Crea el escenario mínimo para poder calificar:
// viaje COMPLETED + solicitud COMPLETED
async function createCompletedScenario(driverId: string, passengerId: string) {
  const trip = await createTestTrip(driverId, { status: 'COMPLETED' });
  const req = await createTestRequest(passengerId, trip.id, 'COMPLETED');
  return { trip, req };
}

// ─────────────────────────────────────────────
// POST /api/ratings
// ─────────────────────────────────────────────
describe('POST /api/ratings', () => {
  const PASSWORD = 'Password123!';
  let driverId: string;
  let driverToken: string;
  let passengerId: string;
  let passengerToken: string;
  let outsiderId: string;
  let outsiderToken: string;

  beforeAll(async () => {
    await setupTestDb();

    const driver = await createVerifiedTestUser('driver@uta.edu.ec', PASSWORD, 'Driver');
    driverId = driver.id;
    await createTestVehicle(driverId);
    driverToken = await loginAs('driver@uta.edu.ec', PASSWORD);

    const passenger = await createVerifiedTestUser('passenger@uta.edu.ec', PASSWORD, 'Passenger');
    passengerId = passenger.id;
    passengerToken = await loginAs('passenger@uta.edu.ec', PASSWORD);

    const outsider = await createVerifiedTestUser('outsider@uta.edu.ec', PASSWORD, 'Outsider');
    outsiderId = outsider.id;
    outsiderToken = await loginAs('outsider@uta.edu.ec', PASSWORD);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.rating.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.safetyAcknowledgment.deleteMany({});
    await prisma.tripEvent.deleteMany({});
    await prisma.trip.deleteMany({});
    // Resetear reputación
    await prisma.user.updateMany({ data: { reputationScore: 5.0 } });
  });

  it('conductor califica al pasajero tras viaje COMPLETED', async () => {
    const { req } = await createCompletedScenario(driverId, passengerId);

    const res = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ tripRequestId: req.id, score: 4, comment: 'Buen pasajero' });

    expect(res.status).toBe(201);
    expect(res.body.rating).toMatchObject({
      tripRequestId: req.id,
      raterId: driverId,
      ratedId: passengerId,
      score: 4,
      raterRole: 'DRIVER',
    });
  });

  it('pasajero califica al conductor tras viaje COMPLETED', async () => {
    const { req } = await createCompletedScenario(driverId, passengerId);

    const res = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id, score: 5 });

    expect(res.status).toBe(201);
    expect(res.body.rating).toMatchObject({
      tripRequestId: req.id,
      raterId: passengerId,
      ratedId: driverId,
      score: 5,
      raterRole: 'PASSENGER',
    });
  });

  it('recalcula reputationScore del usuario calificado', async () => {
    const { req } = await createCompletedScenario(driverId, passengerId);

    await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id, score: 3 });

    const updatedDriver = await prisma.user.findUnique({ where: { id: driverId } });
    expect(Number(updatedDriver?.reputationScore)).toBeCloseTo(3, 1);
  });

  it('rechaza si el viaje no está COMPLETED', async () => {
    const trip = await createTestTrip(driverId, { status: 'SCHEDULED' });
    const req = await createTestRequest(passengerId, trip.id, 'ACCEPTED');

    const res = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id, score: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/COMPLETED/i);
  });

  it('rechaza si el usuario no participó en el viaje', async () => {
    const { req } = await createCompletedScenario(driverId, passengerId);

    const res = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ tripRequestId: req.id, score: 5 });

    expect(res.status).toBe(403);
  });

  it('rechaza doble calificación de la misma solicitud (409)', async () => {
    const { req } = await createCompletedScenario(driverId, passengerId);

    await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id, score: 5 });

    const res = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id, score: 3 });

    expect(res.status).toBe(409);
  });

  it('rechaza score fuera de rango (0 y 6)', async () => {
    const { req } = await createCompletedScenario(driverId, passengerId);

    const res0 = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id, score: 0 });

    const res6 = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: req.id, score: 6 });

    expect(res0.status).toBe(400);
    expect(res6.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// GET /api/ratings/user/:id
// ─────────────────────────────────────────────
describe('GET /api/ratings/user/:id', () => {
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

    // Crear dos calificaciones al conductor
    const { req: req1 } = await createCompletedScenario(driverId, passengerId);
    const p2 = await createVerifiedTestUser('p2@uta.edu.ec', PASSWORD, 'P2');
    const { req: req2 } = await createCompletedScenario(driverId, p2.id);

    await prisma.rating.createMany({
      data: [
        { tripRequestId: req1.id, raterId: passengerId, ratedId: driverId, score: 5, raterRole: 'PASSENGER' },
        { tripRequestId: req2.id, raterId: p2.id, ratedId: driverId, score: 3, raterRole: 'PASSENGER' },
      ],
    });
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('lista calificaciones de un usuario con paginación', async () => {
    const res = await request(app)
      .get(`/api/ratings/user/${driverId}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ratings).toBeInstanceOf(Array);
    expect(res.body.total).toBe(2);
    expect(res.body).toHaveProperty('reputationScore');
  });

  it('respeta el parámetro limit', async () => {
    const res = await request(app)
      .get(`/api/ratings/user/${driverId}?limit=1&page=1`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ratings.length).toBe(1);
    expect(res.body.total).toBe(2);
  });
});
