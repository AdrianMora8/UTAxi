# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Forgot Password / Reset Password Flow - E2E >> should show error when reset code is invalid
- Location: tests\e2e\auth.spec.ts:30:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=/código|inválido|expirado|error/i')
Expected: visible
Error: strict mode violation: locator('text=/código|inválido|expirado|error/i') resolved to 3 elements:
    1) <p class="text-on-surface-variant mb-8">Ingresa el código que recibiste y tu nueva contra…</p> aka getByText('Ingresa el código que')
    2) <label class="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">Código de recuperación</label> aka getByText('Código de recuperación')
    3) <p class="text-on-surface-variant text-sm mb-4">…</p> aka getByText('¿No tienes el código?')

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('text=/código|inválido|expirado|error/i')

```

# Page snapshot

```yaml
- generic [ref=e7]:
  - heading "Restablecer contraseña" [level=2] [ref=e8]
  - paragraph [ref=e9]: Ingresa el código que recibiste y tu nueva contraseña
  - generic [ref=e10]:
    - generic [ref=e11]:
      - generic [ref=e12]: Correo Institucional
      - textbox "usuario@uta.edu.ec" [ref=e13]: student1@uta.edu.ec
    - generic [ref=e14]:
      - generic [ref=e15]: Código de recuperación
      - textbox "000000" [ref=e16]
    - generic [ref=e17]:
      - generic [ref=e18]: Nueva contraseña
      - textbox "Mínimo 8 caracteres" [ref=e19]: NewPass123!
    - generic [ref=e20]:
      - generic [ref=e21]: Confirmar contraseña
      - textbox "Repite la contraseña" [active] [ref=e22]
      - paragraph [ref=e23]: Las contraseñas no coinciden
    - button "Restablecer contraseña" [ref=e24] [cursor=pointer]
  - generic [ref=e25]:
    - paragraph [ref=e26]:
      - text: ¿No tienes el código?
      - link "Solicitar otro" [ref=e27] [cursor=pointer]:
        - /url: /forgot-password
    - link "Volver a iniciar sesión" [ref=e28] [cursor=pointer]:
      - /url: /login
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Forgot Password / Reset Password Flow - E2E', () => {
  4   |   test('should show forgot-password form with email input', async ({ page }) => {
  5   |     await page.goto('/forgot-password');
  6   | 
  7   |     await expect(page.locator('input[placeholder="usuario@uta.edu.ec"]')).toBeVisible();
  8   |     await expect(page.locator('button:has-text("Enviar código")')).toBeVisible();
  9   |   });
  10  | 
  11  |   test('should navigate to forgot-password via login page link', async ({ page }) => {
  12  |     await page.goto('/login');
  13  | 
  14  |     await page.click('a[href="/forgot-password"]');
  15  | 
  16  |     await expect(page).toHaveURL(/.*forgot-password/);
  17  |     await expect(page.locator('button:has-text("Enviar código")')).toBeVisible();
  18  |   });
  19  | 
  20  |   test('should show reset-password form with email, code and password fields', async ({ page }) => {
  21  |     await page.goto('/reset-password');
  22  | 
  23  |     await expect(page.locator('text="Restablecer contraseña"').first()).toBeVisible();
  24  |     await expect(page.locator('input[placeholder="usuario@uta.edu.ec"]')).toBeVisible();
  25  |     await expect(page.locator('input[placeholder="000000"]')).toBeVisible();
  26  |     await expect(page.locator('input[placeholder="Mínimo 8 caracteres"]')).toBeVisible();
  27  |     await expect(page.locator('button:has-text("Restablecer contraseña")')).toBeVisible();
  28  |   });
  29  | 
  30  |   test('should show error when reset code is invalid', async ({ page }) => {
  31  |     await page.goto('/reset-password');
  32  | 
  33  |     await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  34  |     await page.fill('input[placeholder="000000"]', '000000');
  35  |     await page.fill('input[placeholder="Mínimo 8 caracteres"]', 'NewPass123!');
  36  |     await page.click('button:has-text("Restablecer contraseña")');
  37  | 
  38  |     await expect(
  39  |       page.locator('text=/código|inválido|expirado|error/i')
> 40  |     ).toBeVisible({ timeout: 8000 });
      |       ^ Error: expect(locator).toBeVisible() failed
  41  |   });
  42  | });
  43  | 
  44  | test.describe('Authentication Flow - E2E', () => {
  45  |   test('should register a new user and redirect to verify-email', async ({ page }) => {
  46  |     await page.goto('/register');
  47  | 
  48  |     await page.fill('input[placeholder="Ej. Alex Maldonado"]', 'Test E2E User');
  49  |     await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'e2etest@uta.edu.ec');
  50  |     await page.selectOption('select', { label: 'Ingeniería en Sistemas' });
  51  |     await page.fill('input[placeholder="••••••••"]', 'SecurePass123!');
  52  | 
  53  |     await page.click('button:has-text("Crear Cuenta Institucional")');
  54  | 
  55  |     await expect(page).toHaveURL(/.*verify-email/, { timeout: 10000 });
  56  |   });
  57  | 
  58  |   test('should show verify-email form with code input', async ({ page }) => {
  59  |     await page.goto('/verify-email?email=e2etest@uta.edu.ec');
  60  | 
  61  |     await expect(page.locator('input[placeholder="000000"]')).toBeVisible();
  62  |     await expect(page.locator('button:has-text("Verificar Código")')).toBeVisible();
  63  |   });
  64  | 
  65  |   test('should show error on invalid OTP code', async ({ page }) => {
  66  |     await page.goto('/verify-email?email=e2etest@uta.edu.ec');
  67  | 
  68  |     await page.fill('input[placeholder="000000"]', '000000');
  69  |     await page.click('button:has-text("Verificar Código")');
  70  | 
  71  |     await expect(page.locator('text=/Código inválido|expirado|inválido/i')).toBeVisible({ timeout: 8000 });
  72  |   });
  73  | 
  74  |   test('should login with valid credentials', async ({ page }) => {
  75  |     await page.goto('/login');
  76  | 
  77  |     await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  78  |     await page.fill('input[placeholder="••••••••"]', 'Password123!');
  79  |     await page.click('button:has-text("Iniciar Sesión")');
  80  | 
  81  |     await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
  82  |   });
  83  | 
  84  |   test('should reject login with incorrect password', async ({ page }) => {
  85  |     await page.goto('/login');
  86  | 
  87  |     await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  88  |     await page.fill('input[placeholder="••••••••"]', 'WrongPassword123!');
  89  |     await page.click('button:has-text("Iniciar Sesión")');
  90  | 
  91  |     await expect(page.locator('text=/Credenciales incorrectas|credenciales/i')).toBeVisible({ timeout: 8000 });
  92  |   });
  93  | 
  94  |   test('should show inline validation error for invalid email', async ({ page }) => {
  95  |     await page.goto('/login');
  96  | 
  97  |     await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'not-an-email');
  98  |     await page.fill('input[placeholder="••••••••"]', 'Password123!');
  99  |     await page.click('button:has-text("Iniciar Sesión")');
  100 | 
  101 |     await expect(page.locator('text="Email inválido"')).toBeVisible();
  102 |   });
  103 | 
  104 |   test('should navigate to register page from login link', async ({ page }) => {
  105 |     await page.goto('/login');
  106 | 
  107 |     await page.click('a:has-text("Registrarse como Estudiante")');
  108 | 
  109 |     await expect(page).toHaveURL(/.*register/);
  110 |   });
  111 | 
  112 |   test('should redirect unauthenticated user from protected route', async ({ page }) => {
  113 |     await page.goto('/trips/new');
  114 | 
  115 |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  116 |   });
  117 | });
  118 | 
```