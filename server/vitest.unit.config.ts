import { defineConfig } from 'vitest/config';

process.env.NODE_ENV = 'test';

/**
 * Configuración de Vitest para pruebas UNITARIAS únicamente.
 * No requiere base de datos ni Docker.
 * Corre los tests de *.service.test.ts que usan mocks.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Sin globalSetup — no necesitamos BD para los unit tests
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      reportsDirectory: './coverage/unit',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'dist/**',
        'src/server.ts',
        'src/config/socket.ts',
        'src/socket/tracking.gateway.ts',
        'src/services/payments.service.ts',
      ],
    },
  },
});
