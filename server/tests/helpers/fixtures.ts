import { getPrisma } from './testDb';
import bcryptjs from 'bcryptjs';

/**
 * Datos de prueba reutilizables para tests de integración.
 */

export const TEST_USERS = {
  validUser: {
    email: 'student1@uta.edu.ec',
    password: 'Password123!',
    fullName: 'Test Student',
    career: 'Computer Science',
  },
  anotherUser: {
    email: 'student2@uta.edu.ec',
    password: 'Password456!',
    fullName: 'Another Student',
    career: 'Engineering',
  },
  invalidUser: {
    email: 'notuta@gmail.com',
    password: 'Password123!',
    fullName: 'Invalid User',
  },
};

export const TEST_VEHICLES = {
  valid: {
    brand: 'Toyota',
    model: 'Corolla',
    year: 2022,
    plateNumber: 'ABC1234',
    color: 'Blue',
  },
  invalid: {
    brand: 'A',
    model: '',
    year: 1980,
    plateNumber: 'X',
    color: 'Red',
  },
};

export const TEST_TRIPS = {
  valid: {
    originZone: 'Polanco',
    destinationZone: 'Campus Santa Fe',
    departureTime: new Date(Date.now() + 3600000).toISOString(),
    totalSeats: 4,
    availableSeats: 4,
    pricePerSeat: 5.0,
    notes: 'Comfortable and safe ride',
  },
};

/**
 * Crear un usuario de prueba verificado en la BD.
 */
export async function createVerifiedTestUser(
  email = TEST_USERS.validUser.email,
  password = TEST_USERS.validUser.password,
  fullName = TEST_USERS.validUser.fullName
) {
  const prisma = getPrisma();
  const hashedPassword = await bcryptjs.hash(password, 10);

  return await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      fullName,
      emailVerified: true,
      role: 'STUDENT',
      reputationScore: 5.0,
    },
  });
}

/**
 * Crear un usuario de prueba sin verificar.
 */
export async function createUnverifiedTestUser(
  email = 'unverified@uta.edu.ec',
  password = TEST_USERS.validUser.password,
  fullName = 'Unverified User'
) {
  const prisma = getPrisma();
  const hashedPassword = await bcryptjs.hash(password, 10);

  return await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      fullName,
      emailVerified: false,
      emailVerifyToken: '123456',
      emailVerifyExpiry: new Date(Date.now() + 3600000),
      role: 'STUDENT',
    },
  });
}

/**
 * Crear un vehículo de prueba.
 */
export async function createTestVehicle(userId: string) {
  const prisma = getPrisma();

  return await prisma.vehicle.create({
    data: {
      userId,
      ...TEST_VEHICLES.valid,
    },
  });
}

/**
 * Crear un viaje de prueba.
 */
export async function createTestTrip(driverId: string, customData = {}) {
  const prisma = getPrisma();

  return await prisma.trip.create({
    data: {
      driverId,
      originZone: TEST_TRIPS.valid.originZone,
      destinationZone: TEST_TRIPS.valid.destinationZone,
      departureTime: new Date(TEST_TRIPS.valid.departureTime),
      totalSeats: TEST_TRIPS.valid.totalSeats,
      availableSeats: TEST_TRIPS.valid.availableSeats,
      pricePerSeat: TEST_TRIPS.valid.pricePerSeat,
      notes: TEST_TRIPS.valid.notes,
      status: 'SCHEDULED',
      ...customData,
    },
  });
}

/**
 * Crear una reserva de prueba.
 */
export async function createTestRequest(tripId: string, passengerId: string) {
  const prisma = getPrisma();

  return await prisma.tripRequest.create({
    data: {
      tripId,
      passengerId,
      message: 'Me gustaría unirme al viaje',
      status: 'PENDING',
    },
  });
}
