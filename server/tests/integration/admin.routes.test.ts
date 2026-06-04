import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { createVerifiedTestUser } from '../helpers/fixtures';
import { UserStatus } from '@prisma/client';

const app = createApp();

describe('Admin Routes - Integration Tests', () => {
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

  it('should deny access to non-admin users', async () => {
    const user = await createVerifiedTestUser();
    
    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'Password123!',
      });
      
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(403);
  });

  it('should allow access to admin users and get users list', async () => {
    const prisma = getPrisma();
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash: '$2a$10$xyz', // No importa el hash real si hacemos un login manual o creamos token falso
        fullName: 'Admin User',
        role: 'ADMIN',
        emailVerified: true
      }
    });

    // We can just use the login route if we use a known password hash. But createVerifiedTestUser creates a known password.
    const validUser = await createVerifiedTestUser('admin2@uta.edu.ec', 'Password123!', 'Admin User');
    await prisma.user.update({
      where: { id: validUser.id },
      data: { role: 'ADMIN' }
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: validUser.email,
        password: 'Password123!',
      });
      
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });
});
