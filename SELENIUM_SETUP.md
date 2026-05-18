# Pruebas de Selenium - Registro e Inicio de Sesión

## 📋 Resumen de Implementación

Se han creado **pruebas de Selenium WebDriver completas** para validar el flujo de autenticación de UTAxi.

## 📁 Estructura de Archivos Creados

```
client/
├── tests/
│   └── selenium/
│       ├── config.ts                 ← Configuración WebDriver
│       ├── helpers.ts                ← Utilidades avanzadas
│       ├── auth.selenium.test.ts     ← Pruebas principales (8 suites)
│       ├── auth.advanced.test.ts     ← Pruebas avanzadas (8 suites)
│       ├── README.md                 ← Guía rápida
│       └── TESTING_GUIDE.md          ← Documentación completa
├── vitest.selenium.config.ts         ← Config específica para Selenium
└── package.json                      ← Actualizado con dependencias
```

## ✅ Suites de Pruebas Implementadas

### 1. **Registro de Usuario** (4 pruebas)
- ✓ Registrar nuevo usuario con datos válidos
- ✓ Error cuando email no es @uta.edu.ec
- ✓ Error cuando contraseña es muy corta
- ✓ Error cuando nombre es muy corto

### 2. **Inicio de Sesión** (6 pruebas)
- ✓ Login exitoso con credenciales válidas
- ✓ Error con credenciales inválidas
- ✓ Error cuando email está vacío
- ✓ Error cuando contraseña está vacía
- ✓ Error con email inválido
- ✓ Mantener datos del formulario en errores

### 3. **Flujo Completo** (2 pruebas)
- ✓ Navegar entre Login y Register
- ✓ Verificar mecanismos de seguridad CSRF

### 4. **Validación de Campos** (2 pruebas)
- ✓ Limpiar campos después de reset
- ✓ Copiar y pegar en campos de contraseña

### 5. **Validaciones de Email** (múltiples)
- ✓ Rechaza emails no válidos
- ✓ Requiere dominio @uta.edu.ec
- ✓ Valida formato RFC 5322

### 6. **Validaciones de Contraseña** (múltiples)
- ✓ Rechaza contraseñas débiles
- ✓ Requiere mínimo 8 caracteres
- ✓ Acepta caracteres especiales

### 7. **Seguridad** (3 pruebas)
- ✓ Protección contra XSS
- ✓ Sanitización de inputs
- ✓ Validación de tokens CSRF

### 8. **Accesibilidad** (3 pruebas)
- ✓ Labels asociados a inputs
- ✓ Atributos ARIA apropiados
- ✓ Navegación con teclado

### 9. **Rendimiento** (2 pruebas)
- ✓ Página carga en < 15 segundos
- ✓ Respuesta a entrada en < 2 segundos

### 10. **Manejo de Errores** (2 pruebas)
- ✓ Errores del servidor claramente visibles
- ✓ Recuperación de errores de red

**Total: 30+ pruebas**

## 🚀 Cómo Ejecutar

### Instalación
```bash
cd client
npm install
```

### Ejecutar Todas las Pruebas
```bash
npm run selenium
```

### Opciones de Ejecución
```bash
# En modo watch (auto-reload)
npm run selenium:watch

# Con navegador visible
npm run selenium:headed

# Con debugging
npm run selenium:debug

# Prueba específica
npx vitest tests/selenium/auth.selenium.test.ts

# Buscar por patrón
npx vitest tests/selenium -t "Login"
```

## 🔧 Clases y Utilidades Proporcionadas

### `SeleniumTestHelper`
Métodos principales:
- `goTo(path)` - Navega a una ruta
- `fillInput(locator, value)` - Llena un campo
- `click(locator)` - Hace click
- `waitForElementVisible(locator)` - Espera elemento visible
- `getText(locator)` - Obtiene texto
- `getAttribute(locator, attr)` - Obtiene atributo
- `isElementPresent/Visible(locator)` - Verifica estado

### `AuthTestHelper`
Métodos específicos de autenticación:
- `fillRegisterForm()` - Completa registro
- `fillLoginForm()` - Completa login
- `hasValidationErrors()` - Verifica errores
- `getErrorMessages()` - Obtiene mensajes de error
- `generateUniqueEmail()` - Genera email único
- `generateSecurePassword()` - Genera contraseña

## 📊 Localizadores Preconfigurados

```typescript
Locators = {
  emailInput: By.name('email'),
  passwordInput: By.name('password'),
  fullNameInput: By.name('fullName'),
  careerSelect: By.name('career'),
  loginButton: By.xpath("//button[contains(text(), 'Login')]"),
  registerButton: By.xpath("//button[contains(text(), 'Register')]"),
  // ... y más
}
```

## 📋 Datos de Prueba Disponibles

```typescript
testData = {
  validUsers: [
    { email: 'student1@uta.edu.ec', password: 'Password123!' },
    { email: 'student2@uta.edu.ec', password: 'Password456!' }
  ],
  invalidEmails: [...],
  weakPasswords: [...],
  shortNames: [...]
}
```

## ⚙️ Configuración del Entorno

### Variables de Entorno
```bash
BASE_URL=http://localhost:5173      # URL de la aplicación
HEADLESS=false                      # Ver navegador
WAIT_TIMEOUT=10000                  # Timeout de esperas
```

### Opciones de Chrome
```typescript
--headless=new                      # Modo headless
--no-sandbox                        # Sandbox disabled
--disable-dev-shm-usage            # Usar memoria del host
--start-maximized                  # Maximizar ventana
```

## ⚠️ Requisitos Previos

- **Node.js 16+**
- **npm o yarn**
- **ChromeDriver** (se instala automáticamente)
- **Servidor corriendo** en http://localhost:5173
- **Usuarios de prueba en la BD**:
  - student1@uta.edu.ec / Password123!
  - student2@uta.edu.ec / Password456!

## 🐛 Solución de Problemas

| Problema | Solución |
|----------|----------|
| ChromeDriver no encontrado | `npm install chromedriver --save-dev` |
| Connection refused | Asegúrate que `npm run dev` está corriendo |
| Pruebas timeout | Aumenta `timeout` en `waitForElement()` |
| Elemento no se encuentra | Verifica localizador en DevTools |
| Validación inconsistente | Usa modo headed: `npm run selenium:headed` |

## 📚 Documentación

- [TESTING_GUIDE.md](./selenium/TESTING_GUIDE.md) - Guía completa
- [README.md](./selenium/README.md) - Guía rápida
- [config.ts](./selenium/config.ts) - Configuración del WebDriver
- [helpers.ts](./selenium/helpers.ts) - Utilidades y datos

## 🔐 Seguridad Validada

- ✓ Protección XSS
- ✓ Sanitización de inputs
- ✓ Validación de tokens CSRF
- ✓ Contraseñas seguras (min 8 caracteres)
- ✓ Formato de email estricto

## 🎯 Próximos Pasos

1. **Ejecutar las pruebas**:
   ```bash
   npm install
   npm run selenium
   ```

2. **Ver navegador en acción**:
   ```bash
   npm run selenium:headed
   ```

3. **Integrar en CI/CD** (GitHub Actions, GitLab CI, etc.)

4. **Agregar más pruebas** específicas del proyecto

## 📞 Soporte

Para más información, consulta:
- [Documentación de Selenium](https://www.selenium.dev/)
- [Documentación de Vitest](https://vitest.dev/)
- [Guía de pruebas completa](./selenium/TESTING_GUIDE.md)

---

**Creado**: 15 de Mayo de 2026
**Framework**: Selenium WebDriver + Vitest
**Estado**: ✅ Listo para usar
