import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Timeout para las pruebas de Selenium (10 minutos)
    testTimeout: 600000,
    hookTimeout: 600000,
    teardownTimeout: 600000,
    
    // Reporter para ver los resultados
    reporters: ['verbose'],
    
    // No usar jsdom para Selenium (es un test real del navegador)
    globals: true,
    
    // Incluir solo archivos de Selenium
    include: ['tests/selenium/**/*.test.ts'],
    
    // Configuración de logging
    setupFiles: [],
    
    // Pool de workers (1 para evitar conflictos de puerto)
    threads: false,
    
    // SingleThread para evitar problemas con WebDriver
    singleThread: true,
    
    // Configuración de coverage si es necesario
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/selenium/',
        'dist/',
        'build/',
      ],
    },
  },
});
