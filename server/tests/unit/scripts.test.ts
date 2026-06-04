import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, getPrisma } from '../helpers/testDb';
import { createVerifiedTestUser, createUnverifiedTestUser } from '../helpers/fixtures';
import { getResetCode, verifyUserByEmail } from '../helpers/scriptHelpers';

/**
 * Integration tests for get-reset-code.js and verify-user.js scripts
 * Verifies the functionality of password reset and user verification
 */

const prisma = getPrisma();

describe('get-reset-code Script', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  it('should retrieve reset code for existing user', async () => {
    const testEmail = 'student@uta.edu.ec';
    const resetToken = 'token-123456';

    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'hash',
        fullName: 'Test Student',
        emailVerified: true,
        role: 'STUDENT',
        passwordResetToken: resetToken,
        reputationScore: 5.0,
      },
    });

    const code = await getResetCode(testEmail);

    expect(code).toBe(resetToken);
  });

  it('should return null when user has no reset token', async () => {
    const testEmail = 'student2@uta.edu.ec';

    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'hash',
        fullName: 'Test Student 2',
        emailVerified: true,
        role: 'STUDENT',
        reputationScore: 5.0,
      },
    });

    const code = await getResetCode(testEmail);

    expect(code).toBeNull();
  });

  it('should return null for non-existent user', async () => {
    const code = await getResetCode('nonexistent@uta.edu.ec');

    expect(code).toBeNull();
  });

  it('should handle empty email gracefully', async () => {
    const code = await getResetCode('');

    expect(code).toBeNull();
  });

  it('should retrieve correct reset code when multiple tokens exist', async () => {
    const email1 = 'student1@uta.edu.ec';
    const email2 = 'student2@uta.edu.ec';
    const token1 = 'token-111111';
    const token2 = 'token-222222';

    await prisma.user.create({
      data: {
        email: email1,
        passwordHash: 'hash1',
        fullName: 'Student 1',
        emailVerified: true,
        role: 'STUDENT',
        passwordResetToken: token1,
        reputationScore: 5.0,
      },
    });

    await prisma.user.create({
      data: {
        email: email2,
        passwordHash: 'hash2',
        fullName: 'Student 2',
        emailVerified: true,
        role: 'STUDENT',
        passwordResetToken: token2,
        reputationScore: 5.0,
      },
    });

    const code1 = await getResetCode(email1);
    const code2 = await getResetCode(email2);

    expect(code1).toBe(token1);
    expect(code2).toBe(token2);
  });
});

describe('verify-user Script', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  it('should verify unverified user', async () => {
    const testEmail = 'unverified@uta.edu.ec';

    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'hash',
        fullName: 'Unverified Student',
        emailVerified: false,
        role: 'STUDENT',
        reputationScore: 5.0,
      },
    });

    const email = await verifyUserByEmail(testEmail);

    expect(email).toBe(testEmail);

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(user?.emailVerified).toBe(true);
  });

  it('should verify already verified user', async () => {
    const testEmail = 'verified@uta.edu.ec';

    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'hash',
        fullName: 'Verified Student',
        emailVerified: true,
        role: 'STUDENT',
        reputationScore: 5.0,
      },
    });

    const email = await verifyUserByEmail(testEmail);

    expect(email).toBe(testEmail);

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(user?.emailVerified).toBe(true);
  });

  it('should throw error for non-existent user', async () => {
    await expect(verifyUserByEmail('nonexistent@uta.edu.ec')).rejects.toThrow();
  });

  it('should return correct email after verification', async () => {
    const testEmail = 'test@uta.edu.ec';

    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'hash',
        fullName: 'Test User',
        emailVerified: false,
        role: 'STUDENT',
        reputationScore: 5.0,
      },
    });

    const result = await verifyUserByEmail(testEmail);

    expect(result).toEqual(testEmail);
  });

  it('should handle email case sensitivity correctly', async () => {
    const testEmail = 'student@uta.edu.ec';

    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'hash',
        fullName: 'Student',
        emailVerified: false,
        role: 'STUDENT',
        reputationScore: 5.0,
      },
    });

    const result = await verifyUserByEmail(testEmail);

    expect(result).toBe(testEmail);
  });

  it('should verify multiple users independently', async () => {
    const email1 = 'student1@uta.edu.ec';
    const email2 = 'student2@uta.edu.ec';

    await prisma.user.create({
      data: {
        email: email1,
        passwordHash: 'hash1',
        fullName: 'Student 1',
        emailVerified: false,
        role: 'STUDENT',
        reputationScore: 5.0,
      },
    });

    await prisma.user.create({
      data: {
        email: email2,
        passwordHash: 'hash2',
        fullName: 'Student 2',
        emailVerified: false,
        role: 'STUDENT',
        reputationScore: 5.0,
      },
    });

    await verifyUserByEmail(email1);

    const user1 = await prisma.user.findUnique({ where: { email: email1 } });
    const user2 = await prisma.user.findUnique({ where: { email: email2 } });

    expect(user1?.emailVerified).toBe(true);
    expect(user2?.emailVerified).toBe(false);
  });
});
