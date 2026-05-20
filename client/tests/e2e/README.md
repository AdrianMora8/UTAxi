# 🎭 Playwright E2E Tests - U-Ride

Pruebas de aceptación automatizadas usando Playwright para validar flujos completos de usuario.

---

## 📁 Estructura

```
tests/e2e/
├── auth.spec.ts          # Flujos de autenticación (5 tests)
└── trips.spec.ts         # Flujos de viajes (6 tests)
```

---

## 🚀 Instalación

```bash
# Las dependencias ya están en package.json
npm install

# Instalar navegadores de Playwright (una sola vez)
npx playwright install
```

---

## 🏃 Ejecutar Tests

```bash
# Todas las pruebas (headless)
npm run e2e

# Modo interactivo (UI)
npm run e2e:watch

# Con navegador visible
npm run e2e:headed

# Debug paso a paso
npm run e2e:debug

# Tests específicos
npx playwright test auth.spec.ts
npx playwright test trips.spec.ts

# Filtrar por nombre
npx playwright test -g "should register"

# Solo en un navegador
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## 📊 Ver Reportes

```bash
# HTML report
npm run e2e:report

# O
npx playwright show-report
```

Abrirá en navegador con videos y screenshots de fallos.

---

## 🧪 Tests Actuales

### auth.spec.ts

```typescript
describe('Authentication Flow - E2E')
├── should register a new user
├── should verify email with OTP code
├── should login with verified credentials
├── should reject login with incorrect password
└── should show validation errors for invalid email
```

### trips.spec.ts

```typescript
describe('Trips Flow - E2E')
├── should navigate to trips list
├── should view trip details
├── should request to join a trip
├── should filter trips by location
└── should show trip booking modal
```

---

## ✍️ Escribir Nuevos Tests

### Estructura Básica

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup antes de cada test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Acciones
    await page.click('button');
    
    // Assertions
    await expect(page.locator('text=/Success/')).toBeVisible();
  });
});
```

### Locators (Encontrar elementos)

```typescript
// Por texto
await page.click('button:has-text("Sign In")');

// Por atributo
await page.fill('input[name="email"]', 'test@uta.edu.ec');

// Por tipo
await page.fill('input[type="password"]', 'password123');

// Por role (recomendado)
await page.click('button[role="button"]:has-text("Submit")');

// Por testid (útil)
await page.click('[data-testid="login-button"]');
```

### Patrones Comunes

**Login**
```typescript
await page.goto('/login');
await page.fill('input[type="email"]', 'student@uta.edu.ec');
await page.fill('input[type="password"]', 'Password123!');
await page.click('button:has-text("Login")');
await expect(page).toHaveURL(/.*dashboard/);
```

**Esperar Elemento**
```typescript
await expect(page.locator('.modal')).toBeVisible({ timeout: 10000 });
```

**Llenar Formulario**
```typescript
await page.fill('input[name="fullName"]', 'John Doe');
await page.selectOption('select[name="career"]', 'Computer Science');
await page.check('input[type="checkbox"]');
```

**Hacer Screenshot**
```typescript
await page.screenshot({ path: 'screenshot.png' });
```

---

## ⚙️ Configuración

Ver `playwright.config.ts`:

- **baseURL:** http://localhost:5173
- **timeout:** 30 segundos por test
- **retries:** 0 (local), 2 (CI)
- **browsers:** Chromium, Firefox, WebKit

---

## 🐛 Debug

```bash
# Modo interactivo
npm run e2e:debug

# Pasos:
# 1. El navegador se abrirá
# 2. Usa las controles en la barra de herramientas
# 3. Step over/into/out
# 4. Ver estado de variables
```

---

## 📸 Screenshots en Fallos

Automáticamente guardados en `test-results/` cuando falla un test.

```bash
# Ver screenshots
ls -la test-results/
```

---

## 🎯 Buenas Prácticas

1. **Use selectors robustos**
   ```typescript
   // ✅ Bueno
   await page.click('button[role="button"]:has-text("Login")');
   
   // ❌ Evitar
   await page.click('button.btn.btn-primary'); // Frágil
   ```

2. **Esperar explícitamente**
   ```typescript
   // ✅ Bueno
   await expect(page.locator('.modal')).toBeVisible();
   
   // ❌ Evitar
   await page.waitForTimeout(2000); // Duerme siempre
   ```

3. **Mantén tests independientes**
   ```typescript
   // Cada test debe ser capaz de correr solo
   test.beforeEach(async ({ page }) => {
     await page.goto('/login');
     // ... hacer login
   });
   ```

4. **Agrupa tests relacionados**
   ```typescript
   test.describe('Auth', () => {
     test('should register', ...);
     test('should login', ...);
   });
   ```

---

## 🚀 CI/CD Integration

**GitHub Actions:**
```yaml
- name: Run E2E Tests
  run: |
    cd client
    npm install
    npx playwright install
    npm run e2e
```

---

## 📚 Recursos

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors](https://playwright.dev/docs/locators)
- [Actions](https://playwright.dev/docs/api/class-page)

---

**Versión:** 1.0
**Estado:** ✅ Listo para usar
