const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({
  datasources: { db: { url: 'postgresql://utaxi:utaxi123@localhost:5437/utaxi_test' } }
});

p.$queryRaw`SELECT 1`
  .then(() => {
    console.log('✅ BD de test conectada en puerto 5437!');
    return p.$disconnect();
  })
  .catch(e => {
    console.log('❌ BD de test NO disponible:', e.message.split('\n')[0]);
    return p.$disconnect();
  });
