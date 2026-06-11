import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAllUsers() {
  try {
    console.warn('🔄 Verificando todos los usuarios...');
    const result = await prisma.user.updateMany({
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });
    console.warn(`✅ Se verificaron ${result.count} usuarios`);
  } catch (error: unknown) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllUsers();
