import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';

const app = createApp();
const prisma = getPrisma();

// Registra un usuario completo por API y devuelve su accessToken
async function registerAndVerify(email: string, password: string, fullName: string) {
  await request(app)
    .post('/api/auth/register')
    .send({ email, password, fullName });

  const { emailVerifyToken } = await prisma.user.findUnique({
    where: { email },
    select: { emailVerifyToken: true },
  }) as { emailVerifyToken: string };

  await request(app)
    .post('/api/auth/verify-email')
    .send({ email, code: emailVerifyToken });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  return {
    token: loginRes.body.accessToken as string,
    user: loginRes.body.user,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Flujo 1: Happy path conductor
// register → verify → login → vehículo → viaje → aceptar pasajero
// → iniciar → completar → conductor cobra escrow
// ─────────────────────────────────────────────────────────────────────────────
describe('E2E — Happy path conductor', () => {
  const DRIVER_EMAIL = 'driver.e2e@uta.edu.ec';
  const PASSENGER_EMAIL = 'passenger.e2e@uta.edu.ec';
  const PASSWORD = 'E2ePassword1!';

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('ciclo completo: registro → viaje → completar → cobro de escrow', async () => {
    // 1. Conductor se registra y verifica
    const { token: driverToken, user: driverUser } =
      await registerAndVerify(DRIVER_EMAIL, PASSWORD, 'Driver E2E');

    // 2. Conductor registra su vehículo
    const vehicleRes = await request(app)
      .post('/api/users/me/vehicle')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ brand: 'Toyota', model: 'Corolla', year: 2022, plateNumber: 'E2E1234', color: 'Blue' });

    expect(vehicleRes.status).toBe(201);

    // 3. Conductor crea un viaje
    const tripRes = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        originZone: 'Terminal Norte',
        destinationZone: 'Campus UTA',
        departureTime: new Date(Date.now() + 3_600_000).toISOString(),
        totalSeats: 2,
        pricePerSeat: 1.5,
      });

    expect(tripRes.status).toBe(201);
    expect(tripRes.body.trip.status).toBe('SCHEDULED');
    const tripId = tripRes.body.trip.id;

    // 4. Pasajero se registra y solicita cupo
    const { token: passengerToken, user: passengerUser } =
      await registerAndVerify(PASSENGER_EMAIL, PASSWORD, 'Passenger E2E');

    const requestRes = await request(app)
      .post(`/api/requests/trip/${tripId}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({});

    expect(requestRes.status).toBe(201);
    expect(requestRes.body.request.status).toBe('PENDING');
    const requestId = requestRes.body.request.id;

    // 5. Conductor acepta la solicitud
    const acceptRes = await request(app)
      .patch(`/api/requests/${requestId}/respond`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ action: 'ACCEPT' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.request.status).toBe('ACCEPTED');

    // 6. Pasajero recarga su wallet y paga
    await request(app)
      .post('/api/payments/wallet/topup')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ amount: 10 });

    const payRes = await request(app)
      .post('/api/payments/pay/wallet')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: requestId });

    expect(payRes.status).toBe(201);
    expect(payRes.body.amount).toBeCloseTo(1.5, 2);

    // 7. El pago queda en escrow (pendingBalance del conductor)
    const driverMid = await prisma.user.findUnique({ where: { id: driverUser.id } });
    expect(Number(driverMid?.pendingBalance)).toBeCloseTo(1.5, 2);

    // 8. Conductor inicia el viaje
    const startRes = await request(app)
      .post(`/api/trips/${tripId}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ boardedRequestIds: [requestId] });

    expect(startRes.status).toBe(200);
    expect(startRes.body.trip.status).toBe('IN_PROGRESS');

    // 9. Conductor completa el viaje
    const driverBefore = await prisma.user.findUnique({ where: { id: driverUser.id } });

    const completeRes = await request(app)
      .patch(`/api/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'COMPLETED' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.trip.status).toBe('COMPLETED');

    // 10. El escrow se transfiere al walletBalance del conductor
    const driverAfter = await prisma.user.findUnique({ where: { id: driverUser.id } });
    expect(Number(driverAfter?.walletBalance)).toBeCloseTo(
      Number(driverBefore?.walletBalance) + 1.5,
      2,
    );
    expect(Number(driverAfter?.pendingBalance)).toBeCloseTo(
      Number(driverBefore?.pendingBalance) - 1.5,
      2,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flujo 2: Happy path pasajero con calificación
// register → solicitar → pagar → viaje completado → calificar → reputación actualizada
// ─────────────────────────────────────────────────────────────────────────────
describe('E2E — Happy path pasajero con calificación', () => {
  const DRIVER_EMAIL = 'driver2.e2e@uta.edu.ec';
  const PASSENGER_EMAIL = 'passenger2.e2e@uta.edu.ec';
  const PASSWORD = 'E2ePassword1!';

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('pasajero califica al conductor y reputationScore se actualiza', async () => {
    // 1. Registrar conductor y pasajero
    const { token: driverToken, user: driverUser } =
      await registerAndVerify(DRIVER_EMAIL, PASSWORD, 'Driver E2E 2');

    await request(app)
      .post('/api/users/me/vehicle')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ brand: 'Honda', model: 'Civic', year: 2021, plateNumber: 'E2E5678', color: 'Red' });

    const { token: passengerToken, user: passengerUser } =
      await registerAndVerify(PASSENGER_EMAIL, PASSWORD, 'Passenger E2E 2');

    // 2. Crear viaje y solicitud
    const tripRes = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        originZone: 'Parque Industrial',
        destinationZone: 'Campus UTA',
        departureTime: new Date(Date.now() + 3_600_000).toISOString(),
        totalSeats: 2,
        pricePerSeat: 1.5,
      });
    const tripId = tripRes.body.trip.id;

    const reqRes = await request(app)
      .post(`/api/requests/trip/${tripId}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({});
    const requestId = reqRes.body.request.id;

    // 3. Aceptar, pagar, iniciar y completar
    await request(app)
      .patch(`/api/requests/${requestId}/respond`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ action: 'ACCEPT' });

    await request(app)
      .post('/api/payments/wallet/topup')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ amount: 10 });

    await request(app)
      .post('/api/payments/pay/wallet')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: requestId });

    await request(app)
      .post(`/api/trips/${tripId}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ boardedRequestIds: [requestId] });

    await request(app)
      .patch(`/api/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'COMPLETED' });

    // 4. Pasajero califica al conductor con 4 estrellas
    const ratingRes = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: requestId, score: 4, comment: 'Buen conductor' });

    expect(ratingRes.status).toBe(201);
    expect(ratingRes.body.rating).toMatchObject({
      raterId: passengerUser.id,
      ratedId: driverUser.id,
      score: 4,
      raterRole: 'PASSENGER',
    });

    // 5. El reputationScore del conductor refleja la calificación
    const profileRes = await request(app)
      .get(`/api/users/${driverUser.id}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(profileRes.status).toBe(200);
    expect(Number(profileRes.body.user.reputationScore)).toBeCloseTo(4, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flujo 3: Cancelación con reembolso
// solicitar → aceptar → pagar → cancelar ≥10 min antes → wallet restaurado
// ─────────────────────────────────────────────────────────────────────────────
describe('E2E — Cancelación con reembolso completo', () => {
  const DRIVER_EMAIL = 'driver3.e2e@uta.edu.ec';
  const PASSENGER_EMAIL = 'passenger3.e2e@uta.edu.ec';
  const PASSWORD = 'E2ePassword1!';

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('cancelar con pago ≥10 min antes devuelve el dinero al pasajero', async () => {
    // 1. Registrar usuarios
    const { token: driverToken } =
      await registerAndVerify(DRIVER_EMAIL, PASSWORD, 'Driver E2E 3');

    await request(app)
      .post('/api/users/me/vehicle')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ brand: 'Nissan', model: 'Sentra', year: 2020, plateNumber: 'E2E9012', color: 'White' });

    const { token: passengerToken } =
      await registerAndVerify(PASSENGER_EMAIL, PASSWORD, 'Passenger E2E 3');

    // 2. Viaje con salida en 2 horas (≥10 min)
    const tripRes = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        originZone: 'Mercado Central',
        destinationZone: 'Campus UTA',
        departureTime: new Date(Date.now() + 2 * 3_600_000).toISOString(),
        totalSeats: 2,
        pricePerSeat: 1.5,
      });
    const tripId = tripRes.body.trip.id;

    // 3. Solicitar y aceptar
    const reqRes = await request(app)
      .post(`/api/requests/trip/${tripId}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({});
    const requestId = reqRes.body.request.id;

    await request(app)
      .patch(`/api/requests/${requestId}/respond`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ action: 'ACCEPT' });

    // 4. Recargar y pagar
    await request(app)
      .post('/api/payments/wallet/topup')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ amount: 10 });

    await request(app)
      .post('/api/payments/pay/wallet')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ tripRequestId: requestId });

    // 5. Capturar saldo antes de cancelar
    const passengerData = await prisma.user.findFirst({
      where: { email: PASSENGER_EMAIL },
    });
    const balanceAntes = Number(passengerData?.walletBalance);

    // 6. Pasajero cancela
    const cancelRes = await request(app)
      .delete(`/api/requests/${requestId}`)
      .set('Authorization', `Bearer ${passengerToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.refunded).toBe(true);

    // 7. Wallet restaurado
    const passengerDespues = await prisma.user.findFirst({
      where: { email: PASSENGER_EMAIL },
    });
    expect(Number(passengerDespues?.walletBalance)).toBeCloseTo(balanceAntes + 1.5, 2);
  });
});
