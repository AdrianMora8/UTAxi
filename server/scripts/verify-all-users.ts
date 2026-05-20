import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAllUsers() {
  try {
    console.log('🔄 Verificando todos los usuarios...');
    const result = await prisma.user.updateMany({
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });
    console.log(`✅ Se verificaron ${result.count} usuarios`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllUsers();
