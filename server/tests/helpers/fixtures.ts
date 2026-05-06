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
    from: 'Polanco',
    to: 'Campus Santa Fe',
    departureTime: new Date(Date.now() + 3600000).toISOString(),
    availableSeats: 3,
    costPerPerson: 5.0,
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
      password: hashedPassword,
      fullName,
      emailVerified: true,
      role: 'USER',
      reputation: 5.0,
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
      password: hashedPassword,
      fullName,
      emailVerified: false,
      emailVerifyToken: '123456',
      emailVerifyExpiry: new Date(Date.now() + 3600000),
      role: 'USER',
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
export async function createTestTrip(driverId: string) {
  const prisma = getPrisma();

  return await prisma.trip.create({
    data: {
      driverId,
      ...TEST_TRIPS.valid,
      status: 'PENDING',
    },
  });
}
