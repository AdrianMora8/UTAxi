const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para obtener el código de verificación de email de un usuario
 * Uso: node get-verify-code.js email@example.com
 */

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node get-verify-code.js <email>');
    process.exit(2);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerifyToken: true }
    });

    if (user?.emailVerifyToken) {
      console.log(user.emailVerifyToken);
      process.exit(0);
    } else {
      console.error('No token found');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(3);
  } finally {
    await prisma.$disconnect();
  }
}

main();
