# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow - E2E >> should register a new user and redirect to verify-email
- Location: tests\e2e\auth.spec.ts:45:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*verify-email/
Received string:  "http://localhost:4278/register"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    14 × unexpected value "http://localhost:4278/register"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - generic [ref=e7]:
      - link "U-Ride" [ref=e9] [cursor=pointer]:
        - /url: /
      - heading "Únete a la Red" [level=1] [ref=e11]
      - paragraph [ref=e12]: Crea tu cuenta institucional para empezar a moverte con eficiencia.
    - generic [ref=e13]:
      - generic [ref=e14]:
        - text: Nombre Completo
        - textbox "Ej. Alex Maldonado" [ref=e15]: Test E2E User
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: Correo Institucional
          - generic [ref=e19]:
            - generic [ref=e20]: verified
            - text: UTA VERIFIED
        - textbox "usuario@uta.edu.ec" [ref=e21]: e2etest@uta.edu.ec
      - generic [ref=e22]:
        - text: Carrera / Facultad
        - combobox [ref=e23] [cursor=pointer]:
          - option "Selecciona tu carrera" [disabled]
          - option "Ingeniería en Sistemas" [selected]
          - option "Ciencias Administrativas"
          - option "Ciencias de la Salud"
          - option "Diseño y Arquitectura"
          - option "Ingeniería Civil"
          - option "Ingeniería Eléctrica"
          - option "Otra carrera"
      - generic [ref=e24]:
        - text: Contraseña
        - textbox "••••••••" [ref=e25]: SecurePass123!
      - generic [ref=e26]:
        - generic [ref=e27]: error
        - paragraph [ref=e28]: Ya existe una cuenta con ese correo
      - button "Crear Cuenta Institucional" [ref=e30] [cursor=pointer]
    - generic [ref=e31]:
      - paragraph [ref=e32]:
        - text: ¿Ya tienes una cuenta?
        - link "Inicia Sesión" [ref=e33] [cursor=pointer]:
          - /url: /login
      - generic [ref=e34]:
        - generic [ref=e35]: UTA Academic Kinetic
        - generic [ref=e36]: Security Protocol v2.4
  - generic [ref=e39]:
    - generic [ref=e40]:
      - generic [ref=e41]:
        - generic [ref=e43]: shield_with_heart
        - heading "Seguridad Institucional" [level=3] [ref=e44]
        - paragraph [ref=e45]: Solo miembros verificados de la @uta.edu.ec pueden acceder. Rastreo en tiempo real y perfiles validados.
      - generic [ref=e46]:
        - generic [ref=e47]:
          - generic [ref=e49]: person
          - generic [ref=e51]: person
          - generic [ref=e52]: +5K
        - generic [ref=e53]: Usuarios Activos Hoy
    - generic [ref=e54]:
      - generic [ref=e56]: groups
      - generic [ref=e57]:
        - generic [ref=e59]: diversity_3
        - heading "Comunidad Académica" [level=3] [ref=e60]
        - paragraph [ref=e61]: Conecta con compañeros de tu facultad. Comparte gastos y llega puntual.
        - generic [ref=e62]:
          - generic [ref=e65]: "FISE: +12 viajes activos"
          - generic [ref=e67]: "Campus Huachi: punto de encuentro"
    - generic [ref=e68]:
      - generic [ref=e70]: speed
      - generic [ref=e71]:
        - heading "Máxima Eficiencia" [level=3] [ref=e72]
        - paragraph [ref=e73]: Reduce tiempos de espera hasta en un 60% frente al transporte público.
        - generic [ref=e74]:
          - generic [ref=e75]: Rutas Inteligentes
          - generic [ref=e76]: Zero-Emission
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
  40  |     ).toBeVisible({ timeout: 8000 });
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
> 55  |     await expect(page).toHaveURL(/.*verify-email/, { timeout: 10000 });
      |                        ^ Error: expect(page).toHaveURL(expected) failed
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