# 🚀 Inicio Rápido - Pruebas de Selenium

## 30 segundos para comenzar

### 1. Instala dependencias
```bash
cd client
npm install
```

### 2. Asegúrate que el servidor está corriendo
```bash
npm run dev
```
(En otra terminal)

### 3. Ejecuta las pruebas
```bash
npm run selenium
```

¡Listo! ✅

---

## Ejecución Paso a Paso

### Opción A: Menú Interactivo (Recomendado)

**En Windows (PowerShell):**
```powershell
cd client/tests/selenium
.\run-tests.ps1
```

**En macOS/Linux (Bash):**
```bash
cd client/tests/selenium
chmod +x run-tests.sh
./run-tests.sh
```

### Opción B: Comandos Directos

```bash
# Todas las pruebas
npm run selenium

# Con navegador visible
npm run selenium:headed

# En modo watch (recarga automática)
npm run selenium:watch

# Prueba específica
npx vitest tests/selenium -t "Login"
```

---

## Estructura de Pruebas

```
✅ Registro de Usuario (4 pruebas)
   └─ Datos válidos, validaciones de email, contraseña y nombre

✅ Inicio de Sesión (6 pruebas)
   └─ Login exitoso, credenciales inválidas, validaciones

✅ Flujo Completo (2 pruebas)
   └─ Navegación y seguridad

✅ Validaciones (8+ pruebas)
   └─ Email, contraseña, nombre, XSS, CSRF

✅ Accesibilidad (3 pruebas)
   └─ Labels, ARIA, navegación con teclado

✅ Seguridad (3 pruebas)
   └─ XSS, sanitización, CSRF tokens

✅ Rendimiento (2 pruebas)
   └─ Tiempos de carga y respuesta

Total: 30+ pruebas
```

---

## Usuarios de Prueba

Asegúrate de que estos usuarios existan en tu base de datos:

| Email | Contraseña |
|-------|-----------|
| student1@uta.edu.ec | Password123! |
| student2@uta.edu.ec | Password456! |

---

## Archivos Creados

```
client/tests/selenium/
├── 📄 config.ts                 ← Configuración WebDriver
├── 📄 helpers.ts                ← Utilidades
├── 📄 auth.selenium.test.ts     ← Pruebas principales
├── 📄 auth.advanced.test.ts     ← Pruebas avanzadas
├── 📚 TESTING_GUIDE.md          ← Guía completa
├── 📚 README.md                 ← Guía rápida
├── 🔧 run-tests.sh              ← Script Bash
└── 🔧 run-tests.ps1             ← Script PowerShell

client/
├── vitest.selenium.config.ts    ← Config Vitest
└── package.json                 ← Actualizado
```

---

## Opciones de Ejecución

### Headless (Recomendado para CI/CD)
```bash
npm run selenium
```
- Más rápido
- Sin interfaz gráfica
- Ideal para automatización

### Headed (Para debugging)
```bash
npm run selenium:headed
```
- Ve el navegador en acción
- Útil para depuración
- Validar que todo funciona

### Watch Mode
```bash
npm run selenium:watch
```
- Recarga automática en cambios
- Desarrollo activo
- Feedback inmediato

---

## Troubleshooting Rápido

### "Error: Cannot find module 'selenium-webdriver'"
```bash
npm install
```

### "Connection refused" (puerto 5173)
```bash
# En otra terminal, asegúrate que:
npm run dev
```

### "Chrome not found"
```bash
npm install chromedriver --save-dev
```

### Las pruebas se tardan mucho
- Usa `npm run selenium` (headless es más rápido)
- Verifica tu conexión de internet
- ChromeDriver descargará archivos

---

## Próximos Pasos

1. ✅ **Ejecutar pruebas**: `npm run selenium`
2. 📊 **Ver reporte**: Espera a que terminen
3. 🐛 **Debuggear si falla**: `npm run selenium:headed`
4. 📚 **Leer documentación**: Ver `TESTING_GUIDE.md`
5. 🔄 **Integrar CI/CD**: Agregar a GitHub Actions / GitLab CI

---

## Documentación Completa

Para información detallada, ver:
- [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) - Guía exhaustiva
- [`README.md`](./README.md) - Guía de referencia
- [`../SELENIUM_SETUP.md`](../SELENIUM_SETUP.md) - Resumen del proyecto

---

## Tips Útiles

✨ **Ver el navegador en acción:**
```bash
npm run selenium:headed
```

🔍 **Ejecutar solo un tipo de prueba:**
```bash
npx vitest tests/selenium -t "Login"
npx vitest tests/selenium -t "Registro"
npx vitest tests/selenium -t "Seguridad"
```

🆔 **Ver información del entorno:**
```bash
node --version
npm --version
```

---

## Dependencias Instaladas

- ✅ `selenium-webdriver@^4.21.0` - Framework
- ✅ `chromedriver@^130.0.0` - Chrome Driver
- ✅ `vitest@^4.1.5` - Test Runner
- ✅ `cross-env@^7.0.3` - Variables de entorno

---

## Contacto y Soporte

Si encuentras problemas:
1. Revisa [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) sección "Solución de Problemas"
2. Verifica que el servidor está corriendo: `npm run dev`
3. Ejecuta en modo headed para ver qué sucede: `npm run selenium:headed`

---

**¡Listo para empezar! 🎉**

Cualquier pregunta, revisa la documentación completa en [`TESTING_GUIDE.md`](./TESTING_GUIDE.md)
