import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import dotenv from 'dotenv';

const execAsync = promisify(exec);

/**
 * Intenta iniciar el contenedor de PostgreSQL de test.
 * Prueba varias estrategias: docker directo, wsl Ubuntu, wsl Ubuntu-22.04.
 */
async function tryStartDockerContainer(): Promise<void> {
  const composeFile = path.resolve(__dirname, '..', '..', 'docker-compose.test.yml');
  const strategies = [
    // Estrategia 1: docker compose directo
    `docker compose -f "${composeFile}" up -d postgres_test`,
    // Estrategia 2: WSL Ubuntu
    `wsl -d Ubuntu -- docker compose -f /mnt/c/Users/HOME/Desktop/UTAxi/docker-compose.test.yml up -d postgres_test`,
    // Estrategia 3: WSL Ubuntu-22.04
    `wsl -d Ubuntu-22.04 -- docker compose -f /mnt/c/Users/HOME/Desktop/UTAxi/docker-compose.test.yml up -d postgres_test`,
  ];

  for (const cmd of strategies) {
    try {
      console.log(`🐳 Intentando levantar DB: ${cmd.substring(0, 70)}...`);
      await Promise.race([
        execAsync(cmd),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 15000),
        ),
      ]);
      console.log('✅ Contenedor Docker iniciado');
      return;
    } catch (e: any) {
      const msg = e?.message?.split('\n')[0] ?? String(e);
      console.log(`  ⚠️  Falló: ${msg}`);
    }
  }
  console.log('⚠️  No se pudo iniciar Docker automáticamente');
}

/**
 * Espera a que la base de datos esté lista aceptando conexiones.
 * Reintenta cada 1s hasta maxRetries.
 * Si no está disponible inicialmente, intenta levantar el contenedor.
 */
async function waitForDatabase(env: NodeJS.ProcessEnv, maxRetries = 30): Promise<void> {
  // Verificación rápida inicial (3 intentos)
  for (let i = 1; i <= 3; i++) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
      await prisma.$connect();
      await prisma.$disconnect();
      console.log('✅ Base de datos ya disponible!');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Si no está disponible, intentar levantar Docker
  console.log('⚠️  BD de test no disponible. Intentando levantar contenedor Docker...');
  console.log(`   URL: ${env.DATABASE_URL}`);
  await tryStartDockerContainer();

  // Esperar hasta maxRetries segundos más
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
      await prisma.$connect();
      await prisma.$disconnect();
      console.log(`✅ Base de datos disponible!`);
      return;
    } catch {
      if (i === maxRetries) {
        console.error(`\n❌ ERROR: La base de datos de test no está disponible.`);
        console.error(`   URL esperada: ${env.DATABASE_URL}`);
        console.error(`\n📋 Para levantar la BD manualmente, ejecuta en una terminal:`);
        console.error(`   docker compose -f docker-compose.test.yml up -d postgres_test`);
        console.error(`   (desde la carpeta raíz del proyecto: C:\\Users\\HOME\\Desktop\\UTAxi)\n`);
        throw new Error(`Base de datos no disponible después de ${maxRetries + 3} segundos`);
      }
      console.log(`⏳ Esperando base de datos... (${i}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

/**
 * Global setup para Vitest
 * Espera a que Postgres esté listo y luego ejecuta las migraciones de Prisma
 */
export default async function globalSetup() {
  console.log('🔧 Configurando BD de test...');

  // Cargar variables de .env.test
  const envPath = path.join(__dirname, '..', '.env.test');
  dotenv.config({ path: envPath });

  const env = { ...process.env, NODE_ENV: 'test' };
  const cwd = path.join(__dirname, '..');

  // Esperar a que PostgreSQL esté listo antes de migrar
  await waitForDatabase(env);

  try {
    await execAsync('npx prisma migrate deploy', { cwd, env });
    console.log('✅ Migraciones completadas exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    throw error;
  }
}
