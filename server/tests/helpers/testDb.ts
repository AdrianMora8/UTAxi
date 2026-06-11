import { PrismaClient } from '@prisma/client';

/**
 * Setup y teardown para pruebas de integración.
 * Limpia datos entre tests de forma segura.
 */

// Usar la misma instancia de Prisma que la aplicación
// para que los cambios sean visibles entre la app y los tests
let prisma: PrismaClient;

function getPrismaInstance(): PrismaClient {
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const newPrisma = new PrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = newPrisma;
  }
  return newPrisma;
}

export async function setupTestDb() {
  prisma = getPrismaInstance();

  // Verificar que estamos en ambiente de test
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('setupTestDb debe usarse solo en NODE_ENV=test');
  }

  try {
    // Limpiar datos en orden para respetar las foreign keys
    // Usar deleteMany de Prisma es más seguro que SQL crudo
    await prisma.reportReview.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.rating.deleteMany({});
    await prisma.walletTransaction.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.tripRequest.deleteMany({});
    await prisma.safetyAcknowledgment.deleteMany({});
    await prisma.tripEvent.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.userWarning.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.user.deleteMany({});
  } catch (error) {
    console.error('Error limpiando BD de test:', error);
    throw error;
  }
}

export async function teardownTestDb() {
  // Solo limpiar datos, no desconectar Prisma
  // Se desconectará después de TODOS los tests
  try {
    if (prisma) {
      await prisma.reportReview.deleteMany({});
      await prisma.report.deleteMany({});
      await prisma.rating.deleteMany({});
      await prisma.walletTransaction.deleteMany({});
      await prisma.payment.deleteMany({});
      await prisma.tripRequest.deleteMany({});
      await prisma.safetyAcknowledgment.deleteMany({});
      await prisma.tripEvent.deleteMany({});
      await prisma.trip.deleteMany({});
      await prisma.userWarning.deleteMany({});
      await prisma.vehicle.deleteMany({});
      await prisma.user.deleteMany({});
    }
  } catch (error) {
    console.error('Error en teardown:', error);
  }
}

export function getPrisma() {
  if (!prisma) {
    prisma = getPrismaInstance();
  }
  return prisma;
}
