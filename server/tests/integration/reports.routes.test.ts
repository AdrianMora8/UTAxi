import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { createVerifiedTestUser } from '../helpers/fixtures';

const app = createApp();

describe('Reports Routes - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.report.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('should create a report', async () => {
    const reporter = await createVerifiedTestUser('reporter@uta.edu.ec');
    const reported = await createVerifiedTestUser('reported@uta.edu.ec', 'Password123!', 'Reported User');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: reporter.email, password: 'Password123!' });
    
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .field('reportedId', reported.id)
      .field('reason', 'INAPPROPRIATE_BEHAVIOR')
      .field('description', 'User was rude during the trip');

    expect(res.status).toBe(201);
    expect(res.body.report.reason).toBe('INAPPROPRIATE_BEHAVIOR');
  });

  it('should get my reports', async () => {
    const reporter = await createVerifiedTestUser('reporter@uta.edu.ec');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: reporter.email, password: 'Password123!' });
    
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .get('/api/reports/my')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reports)).toBe(true);
  });
});
