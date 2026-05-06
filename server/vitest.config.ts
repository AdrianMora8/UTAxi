import { defineConfig } from 'vitest/config';
import path from 'path';

// Establecer NODE_ENV=test antes de cualquier otra cosa
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    globalSetup: [path.resolve(__dirname, 'tests/globalSetup.ts')],
    // Ejecutar archivos de test en serie para evitar conflictos de BD
    maxWorkers: 1,
    minWorkers: 1,
  },
});
