import { PrismaClient } from '@prisma/client';

/**
 * Helper functions extracted from scripts for testability
 * These functions encapsulate the logic that can be tested independently
 */

const prisma = new PrismaClient();

/**
 * Get the password reset token for a user by email
 */
export async function getResetCode(email: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { passwordResetToken: true },
    });
    return user?.passwordResetToken ?? null;
  } catch (error) {
    throw new Error(`Error fetching reset code: ${(error as Error).message}`);
  }
}

/**
 * Mark a user as email verified
 */
export async function verifyUserByEmail(email: string): Promise<string> {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    });
    return user.email;
  } catch (error) {
    throw new Error(`Error verifying user: ${(error as Error).message}`);
  }
}

/**
 * Close the Prisma connection
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
