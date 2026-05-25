import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { createVerifiedTestUser, createTestVehicle, createTestTrip } from '../helpers/fixtures';

const app = createApp();
const prisma = getPrisma();

async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

const PASSWORD = 'Password123!';

describe('Reports API', () => {
  let reporterId: string;
  let reporterToken: string;
  let reportedId: string;

  beforeAll(async () => {
    await setupTestDb();

    const reporter = await createVerifiedTestUser('reporter@uta.edu.ec', PASSWORD, 'Reporter');
    reporterId = reporter.id;
    reporterToken = await loginAs('reporter@uta.edu.ec', PASSWORD);

    const reported = await createVerifiedTestUser('reported@uta.edu.ec', PASSWORD, 'Reported');
    reportedId = reported.id;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.report.deleteMany({});
  });

  // ─── POST /api/reports ─────────────────────────────────────────────────────

  describe('POST /api/reports', () => {
    it('crea un reporte correctamente', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .field('reportedId', reportedId)
        .field('reason', 'INAPPROPRIATE_BEHAVIOR')
        .field('description', 'El usuario fue muy grosero durante el viaje');

      expect(res.status).toBe(201);
      expect(res.body.report).toMatchObject({
        reporterId,
        reportedId,
        reason: 'INAPPROPRIATE_BEHAVIOR',
        status: 'OPEN',
      });
    });

    it('guarda el reporte en la base de datos', async () => {
      await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .field('reportedId', reportedId)
        .field('reason', 'NO_SHOW')
        .field('description', 'No se presentó al punto de encuentro acordado');

      const saved = await prisma.report.findFirst({
        where: { reporterId, reportedId },
      });
      expect(saved).not.toBeNull();
      expect(saved!.reason).toBe('NO_SHOW');
      expect(saved!.status).toBe('OPEN');
    });

    it('rechaza reporte sin autenticación', async () => {
      const res = await request(app)
        .post('/api/reports')
        .field('reportedId', reportedId)
        .field('reason', 'FRAUD')
        .field('description', 'Descripción suficientemente larga para pasar validación');

      expect(res.status).toBe(401);
    });

    it('no permite autorreportarse', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .field('reportedId', reporterId)
        .field('reason', 'OTHER')
        .field('description', 'Descripción de prueba de autorreporte');

      expect(res.status).toBe(400);
    });

    it('rechaza descripción menor a 10 caracteres', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .field('reportedId', reportedId)
        .field('reason', 'HARASSMENT')
        .field('description', 'corta');

      expect(res.status).toBe(400);
    });

    it('rechaza motivo inválido', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .field('reportedId', reportedId)
        .field('reason', 'INVALID_REASON')
        .field('description', 'Descripción suficientemente larga para pasar la validación de largo');

      expect(res.status).toBe(400);
    });

    it('rechaza reportedId inexistente', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .field('reportedId', 'id-que-no-existe')
        .field('reason', 'FRAUD')
        .field('description', 'Descripción suficientemente larga para pasar validación de largo');

      expect(res.status).toBe(404);
    });
  });

  // ─── GET /api/reports/my ──────────────────────────────────────────────────

  describe('GET /api/reports/my', () => {
    it('devuelve solo los reportes del usuario autenticado', async () => {
      // reporter crea 2 reportes
      await prisma.report.createMany({
        data: [
          {
            reporterId,
            reportedId,
            reason: 'FRAUD',
            description: 'Primer reporte de prueba para verificar listado',
            status: 'OPEN',
          },
          {
            reporterId,
            reportedId,
            reason: 'HARASSMENT',
            description: 'Segundo reporte de prueba para verificar listado',
            status: 'REVIEWED',
          },
        ],
      });

      // reported también creó un reporte (no debe aparecer)
      await prisma.report.create({
        data: {
          reporterId: reportedId,
          reportedId: reporterId,
          reason: 'OTHER',
          description: 'Reporte del otro usuario que no debe aparecer',
          status: 'OPEN',
        },
      });

      const res = await request(app)
        .get('/api/reports/my')
        .set('Authorization', `Bearer ${reporterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.reports).toHaveLength(2);
      expect(res.body.reports.every((r: { reporterId: string }) => r.reporterId === reporterId)).toBe(true);
    });

    it('devuelve array vacío si no tiene reportes', async () => {
      const res = await request(app)
        .get('/api/reports/my')
        .set('Authorization', `Bearer ${reporterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.reports).toHaveLength(0);
    });

    it('requiere autenticación', async () => {
      const res = await request(app).get('/api/reports/my');
      expect(res.status).toBe(401);
    });
  });
});
