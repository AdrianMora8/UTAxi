const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const [email, password, fullName, career] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: node create-test-user.js <email> <password> [fullName] [career]');
    process.exit(2);
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        fullName: fullName || undefined,
        career: career || undefined,
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
      create: {
        email,
        passwordHash,
        fullName: fullName || null,
        career: career || null,
        emailVerified: true,
      }
    });

    console.log('OK');
    process.exit(0);
  } catch (error) {
    console.error('ERROR', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
