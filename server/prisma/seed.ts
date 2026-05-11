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

  console.log('✅ Usuarios de prueba creados:');
  console.table([
    { id: admin.id,   email: admin.email,   role: admin.role,   verified: admin.emailVerified },
    { id: student.id, email: student.email, role: student.role, verified: student.emailVerified },
  ]);
  console.log('\n🔑 Contraseña para ambos: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
