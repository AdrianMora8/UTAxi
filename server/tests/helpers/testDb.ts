import { PrismaClient } from '@prisma/client';

/**
 * Setup y teardown para pruebas de integración.
 * Ejecuta migraciones y limpia datos entre tests.
 */

const prisma = new PrismaClient();

export async function setupTestDb() {
  // Verificar que estamos en ambiente de test
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('setupTestDb debe usarse solo en NODE_ENV=test');
  }

  // Ejecutar migraciones en BD de test
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Trip" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "TripRequest" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Rating" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Report" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Vehicle" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Payment" CASCADE');
}

export async function teardownTestDb() {
  await prisma.$disconnect();
}

export function getPrisma() {
  return prisma;
}
