import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  // ── Usuario ADMIN ──────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@uta.edu.ec' },
    update: {},
    create: {
      email: 'admin@uta.edu.ec',
      passwordHash,
      fullName: 'Administrador UTAxi',
      career: 'Administración',
      role: Role.ADMIN,
      emailVerified: true,
      status: 'ACTIVE',
    },
  });

  // ── Usuario STUDENT (normal) ───────────────────────────────────
  const student = await prisma.user.upsert({
    where: { email: 'estudiante@uta.edu.ec' },
    update: {},
    create: {
      email: 'estudiante@uta.edu.ec',
      passwordHash,
      fullName: 'Estudiante Prueba',
      career: 'Ingeniería en Sistemas',
      role: Role.STUDENT,
      emailVerified: true,
      status: 'ACTIVE',
    },
  });

  // ── Usuario de carga (Artillery) ──────────────────────────────
  const loadPasswordHash = await bcrypt.hash('LoadTest123!', 10);
  const loadUser = await prisma.user.upsert({
    where: { email: 'load-test@uta.edu.ec' },
    update: {},
    create: {
      email: 'load-test@uta.edu.ec',
      passwordHash: loadPasswordHash,
      fullName: 'Load Test User',
      career: 'Ingeniería en Sistemas',
      role: Role.STUDENT,
      emailVerified: true,
      status: 'ACTIVE',
    },
  });

  // ── Usuarios E2E (Maestro) ─────────────────────────────────────
  const e2ePasswordHash = await bcrypt.hash('E2ETest123!', 10);

  const e2ePassenger = await prisma.user.upsert({
    where: { email: 'e2e.passenger@uta.edu.ec' },
    update: {},
    create: {
      email: 'e2e.passenger@uta.edu.ec',
      passwordHash: e2ePasswordHash,
      fullName: 'Pasajero E2E',
      career: 'Ingeniería en Sistemas',
      role: Role.STUDENT,
      emailVerified: true,
      status: 'ACTIVE',
    },
  });

  const e2eDriver = await prisma.user.upsert({
    where: { email: 'e2e.driver@uta.edu.ec' },
    update: {},
    create: {
      email: 'e2e.driver@uta.edu.ec',
      passwordHash: e2ePasswordHash,
      fullName: 'Conductor E2E',
      career: 'Ingeniería en Sistemas',
      role: Role.STUDENT,
      emailVerified: true,
      status: 'ACTIVE',
      vehicle: {
        create: {
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
          plateNumber: 'ABC-1234',
          color: 'Blanco',
        },
      },
    },
  });

  console.log('✅ Usuarios de prueba creados:');
  console.table([
    { id: admin.id,          email: admin.email,          role: admin.role,          verified: admin.emailVerified },
    { id: student.id,        email: student.email,        role: student.role,        verified: student.emailVerified },
    { id: loadUser.id,       email: loadUser.email,       role: loadUser.role,       verified: loadUser.emailVerified },
    { id: e2ePassenger.id,   email: e2ePassenger.email,   role: e2ePassenger.role,   verified: e2ePassenger.emailVerified },
    { id: e2eDriver.id,      email: e2eDriver.email,      role: e2eDriver.role,      verified: e2eDriver.emailVerified },
  ]);
  console.log('\n🔑 Contraseña admin/student: 123456');
  console.log('🔑 Contraseña load-test:     LoadTest123!');
  console.log('🔑 Contraseña e2e users:     E2ETest123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
