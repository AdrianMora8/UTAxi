const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Script para obtener el código de reset de contraseña de un usuario
 * Uso: node get-reset-code.js
 */

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test@uta.edu.ec' },
      select: { passwordResetToken: true }
    });
    
    if (user?.passwordResetToken) {
      console.log('✅ Reset Code:', user.passwordResetToken);
    } else {
      console.log('⚠️ No reset code found for this user');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
