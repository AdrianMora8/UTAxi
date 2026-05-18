# Guía de Pruebas de Selenium - UTAxi

## Descripción

Este conjunto de pruebas de Selenium WebDriver verifica el flujo completo de autenticación de la aplicación UTAxi, incluyendo:

- Registro de nuevos usuarios
- Validación de campos de formulario
- Inicio de sesión
- Manejo de errores
- Seguridad contra XSS
- Accesibilidad

## Instalación

### Requisitos Previos

- Node.js 16 o superior
- npm o yarn
- ChromeDriver (se instalará automáticamente)

### Pasos de Instalación

1. Navega al directorio del cliente:
```bash
cd client
```

2. Instala las dependencias:
```bash
npm install
```

Esto instalará:
- `selenium-webdriver` - Framework de pruebas
- `chromedriver` - Driver para Chrome
- `vitest` - Test runner
- `cross-env` - Para variables de entorno multiplataforma

## Estructura de Pruebas

### Archivos Principales

```
tests/selenium/
├── config.ts                 # Configuración y helpers básicos
├── helpers.ts               # Utilidades avanzadas y datos de prueba
├── auth.selenium.test.ts    # Pruebas principales de auth
├── auth.advanced.test.ts    # Pruebas avanzadas (seguridad, accesibilidad)
└── README.md               # Esta guía
```

### Componentes Clave

#### `SeleniumTestHelper`
Clase que proporciona métodos auxiliares comunes:
- Navegación
- Búsqueda de elementos
- Relleno de formularios
- Esperas inteligentes
- Manejo de cookies

#### `AuthTestHelper`
Especializada en pruebas de autenticación:
- `fillRegisterForm()` - Completa formulario de registro
- `fillLoginForm()` - Completa formulario de login
- `hasValidationErrors()` - Verifica errores de validación
- `getErrorMessages()` - Obtiene mensajes de error

## Ejecución de Pruebas

### Todas las Pruebas de Selenium
```bash
npm run selenium
```

### En Modo Watch (recarga automática)
```bash
npm run selenium:watch
```

### Modo Headless (visible en navegador)
```bash
npm run selenium:headed
```

### Con Debugging
```bash
npm run selenium:debug
```

### Prueba Específica
```bash
npx vitest tests/selenium/auth.selenium.test.ts
```

### Pruebas que Contienen un Patrón
```bash
npx vitest tests/selenium -t "Login"
```

## Datos de Prueba

Las credenciales de prueba están definidas en `helpers.ts`:

```typescript
validUsers: [
  {
    email: 'student1@uta.edu.ec',
    password: 'Password123!',
    fullName: 'Student One',
  }
]
```

### Usuarios Disponibles para Testing

- Email: `student1@uta.edu.ec` | Password: `Password123!`
- Email: `student2@uta.edu.ec` | Password: `Password456!`

**Nota:** Estos usuarios deben existir en tu base de datos de desarrollo.

## Suites de Pruebas

### 1. Pruebas Básicas de Autenticación (`auth.selenium.test.ts`)

#### Registro de Usuario
- ✅ Registrar nuevo usuario con datos válidos
- ✅ Error cuando email no es @uta.edu.ec
- ✅ Error cuando contraseña es muy corta
- ✅ Error cuando nombre es muy corto

#### Inicio de Sesión
- ✅ Login exitoso con credenciales válidas
- ✅ Error con credenciales inválidas
- ✅ Error cuando email está vacío
- ✅ Error cuando contraseña está vacía
- ✅ Error con email inválido
- ✅ Mantener datos del formulario en errores de validación

#### Flujo Completo
- ✅ Navegar entre Login y Register
- ✅ Verificar mecanismos de seguridad (CSRF tokens)

#### Validación de Campos
- ✅ Limpiar campos después de reset
- ✅ Copiar y pegar en campos de contraseña

### 2. Pruebas Avanzadas (`auth.advanced.test.ts`)

#### Validaciones de Email
- ✅ Rechaza emails inválidos de diferentes formas
- ✅ Valida dominio @uta.edu.ec

#### Validaciones de Contraseña
- ✅ Rechaza contraseñas débiles
- ✅ Requiere mínimo 8 caracteres

#### Validaciones de Nombre
- ✅ Rechaza nombres muy cortos
- ✅ Requiere mínimo 3 caracteres

#### Seguridad
- ✅ Protección contra XSS
- ✅ Sanitización de inputs
- ✅ Validación de tokens CSRF

#### Accesibilidad
- ✅ Labels asociados a inputs
- ✅ Atributos ARIA apropiados
- ✅ Navegación con teclado

#### Rendimiento
- ✅ Página carga en tiempo razonable (< 15s)
- ✅ Respuesta rápida a entrada del usuario (< 2s)

#### Manejo de Errores
- ✅ Errores del servidor se muestran claramente
- ✅ Recuperación de errores de red

## Configuración Avanzada

### Variables de Entorno

```bash
# Base URL de la aplicación (default: http://localhost:5173)
BASE_URL=http://your-app.com

# Modo headless (default: true)
HEADLESS=false

# Timeout para esperas (default: 10000ms)
WAIT_TIMEOUT=15000
```

### Opciones de Chrome

Las opciones de Chrome se pueden personalizar en `config.ts`:

```typescript
options.addArguments(
  '--headless=new',           // Modo headless
  '--no-sandbox',             // Sandbox disabled
  '--disable-dev-shm-usage',  // Usar memoria del host
  '--start-maximized'         // Maximizar ventana
);
```

## Solución de Problemas

### "ChromeDriver not found"
```bash
npm install chromedriver --save-dev
```

### "Connection refused" (servidor no responde)
```bash
# Asegúrate de que el servidor está corriendo
npm run dev
```

### Pruebas Timeout
- Aumenta el timeout en `waitForElement()`: `timeout: 20000`
- Verifica la velocidad de tu máquina
- Comprueba los logs del servidor

### Elemento no se encuentra
- Verifica los localizadores en DevTools (F12)
- Usa selectores más específicos
- Agrega esperas explícitas

### Errores de Validación Inconsistentes
- Las validaciones pueden ser del cliente o servidor
- Verifica en la consola del navegador
- Usa modo headed para ver qué sucede

## Mejores Prácticas

### Escritura de Pruebas

1. **Usa nombres descriptivos**
   ```typescript
   it('Debe mostrar error cuando el email no es @uta.edu.ec', async () => {
   ```

2. **Estructura AAA (Arrange-Act-Assert)**
   ```typescript
   // Arrange
   await helper.goTo('/login');
   
   // Act
   await helper.fillInput(Locators.emailInput, 'invalid@gmail.com');
   
   // Assert
   expect(errorPresent).toBe(true);
   ```

3. **Evita sleeps a menos que sea necesario**
   ```typescript
   // ✗ Mal
   await helper.wait(5000);
   
   // ✓ Bien
   await helper.waitForElementVisible(locator);
   ```

4. **Usa datos únicos**
   ```typescript
   const timestamp = Date.now();
   const email = `test_${timestamp}@uta.edu.ec`;
   ```

### Mantenimiento

1. Actualiza localizadores si cambia el HTML
2. Mantén datos de prueba en `helpers.ts`
3. Reutiliza funciones en `AuthTestHelper`
4. Documenta casos especiales

## Integración CI/CD

### GitHub Actions

```yaml
- name: Run Selenium Tests
  run: npm run selenium

- name: Upload Test Reports
  uses: actions/upload-artifact@v2
  with:
    name: selenium-reports
    path: tests/selenium/
```

### GitLab CI

```yaml
selenium_tests:
  script:
    - npm install
    - npm run selenium
  artifacts:
    paths:
      - tests/selenium/
```

## Performance

Para ejecutar las pruebas de forma eficiente:

1. **Parallelización**: Las pruebas se ejecutan secuencialmente por defecto
2. **Headless Mode**: Es más rápido que modo headed
3. **Cache**: NPM cacheará las dependencias

## Debugging

### Ver qué hace Selenium
```bash
npm run selenium:headed
```

### Agregar Logs
```typescript
helper.wait(100);
console.log(await helper.getCurrentUrl());
```

### Inspeccionar Elementos
```typescript
const element = await helper.findElement(By.name('email'));
console.log(await element.getAttribute('value'));
```

## Recursos

- [Selenium WebDriver Docs](https://www.selenium.dev/documentation/)
- [Vitest Docs](https://vitest.dev/)
- [Xpath Tutorial](https://www.w3schools.com/xml/xpath_intro.asp)

## Contacto y Soporte

Para reportar problemas o sugerir mejoras, abre un issue en el repositorio.
