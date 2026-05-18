# Pruebas de Selenium

Este directorio contiene las pruebas de Selenium WebDriver para los flujos de autenticación (registro e inicio de sesión).

## Estructura

- `config.ts` - Configuración del WebDriver y utilidades
- `auth.selenium.test.ts` - Pruebas de registro e inicio de sesión

## Instalación de dependencias

```bash
npm install
```

## Ejecutar pruebas

```bash
# Todas las pruebas de Selenium
npm run selenium

# En modo watch
npm run selenium:watch

# En modo headed (ver el navegador)
npm run selenium:headed

# Una prueba específica
npm run selenium -- --grep "Login"
```

## Requisitos

- Node.js 16+
- ChromeDriver (se descarga automáticamente)
- El servidor debe estar ejecutándose en http://localhost:5173
