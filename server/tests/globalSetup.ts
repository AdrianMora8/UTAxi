import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import dotenv from 'dotenv';

const execAsync = promisify(exec);

/**
 * Global setup para Vitest
 * Ejecuta las migraciones de Prisma en la BD de test
 */
export default async function globalSetup() {
  console.log('🔧 Ejecutando migraciones de Prisma para BD de test...');
  
  try {
    // Cargar variables de .env.test
    const envPath = path.join(__dirname, '..', '.env.test');
    dotenv.config({ path: envPath });
    
    // Ejecutar migraciones usando npx
    await execAsync(`npx prisma migrate deploy`, {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });
    
    console.log('✅ Migraciones completadas exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    throw error;
  }
}

