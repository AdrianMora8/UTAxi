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
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "trips" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "trip_requests" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "vehicles" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "reports" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "payments" CASCADE');
}

export async function teardownTestDb() {
  await prisma.$disconnect();
}

export function getPrisma() {
  return prisma;
}
