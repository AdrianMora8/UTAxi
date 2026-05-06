const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Script para verificar manualmente a un usuario por email
 * Uso: node verify-user.js
 */

async function main() {
  try {
    const user = await prisma.user.update({
      where: { email: 'test@uta.edu.ec' },
      data: { emailVerified: true }
    });
    console.log('✅ Usuario verificado:', user.email);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
