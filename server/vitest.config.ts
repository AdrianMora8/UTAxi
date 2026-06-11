import { defineConfig } from 'vitest/config';
import path from 'path';

process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    globalSetup: [path.resolve(__dirname, 'tests/globalSetup.ts')],
    maxWorkers: 1,
    minWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'dist/**',
        // Infraestructura: entry point y WebSockets — no tienen lógica de negocio testeable
        'src/server.ts',
        'src/config/socket.ts',
        'src/socket/tracking.gateway.ts',
        // Integración con Stripe — requiere mock dedicado
        'src/services/payments.service.ts',
      ],
    },
  },
});
