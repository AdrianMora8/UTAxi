import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import dotenv from 'dotenv';

const execAsync = promisify(exec);

/**
 * Espera a que la base de datos esté lista aceptando conexiones.
 * Reintenta cada 1s hasta maxRetries (default 15).
 */
async function waitForDatabase(env: NodeJS.ProcessEnv, maxRetries = 15): Promise<void> {
  const cwd = path.join(__dirname, '..');
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await execAsync('npx prisma db execute --stdin <<< "SELECT 1"', { cwd, env });
      return;
    } catch {
      if (i === maxRetries) {
        throw new Error(`Base de datos no disponible después de ${maxRetries} segundos`);
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
  console.log('🔧 Ejecutando migraciones de Prisma para BD de test...');

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

