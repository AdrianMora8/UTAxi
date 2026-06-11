# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow - E2E >> should reject login with incorrect password
- Location: tests\e2e\auth.spec.ts:84:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=/Credenciales incorrectas|credenciales/i')
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('text=/Credenciales incorrectas|credenciales/i')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - link "U-Ride" [ref=e6] [cursor=pointer]:
        - /url: /
      - link "Registrarse" [ref=e7] [cursor=pointer]:
        - /url: /register
  - main [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: verified_user
          - generic [ref=e15]: Solo correos universitarios permitidos
        - heading "Transporte seguro para la comunidad estudiantil" [level=1] [ref=e16]
        - paragraph [ref=e17]: U-Ride es la red exclusiva de transporte académico diseñada para conectar estudiantes en rutas seguras y eficientes.
      - generic [ref=e18]:
        - generic [ref=e20]:
          - generic [ref=e21]: directions_car
          - paragraph [ref=e22]: Campus UTA — Ambato
        - generic [ref=e24]:
          - generic [ref=e26]: security
          - generic [ref=e27]:
            - generic [ref=e28]: Validación Institucional
            - generic [ref=e29]: Acceso restringido por dominio
    - generic [ref=e33]:
      - generic [ref=e34]:
        - heading "Bienvenido de vuelta" [level=2] [ref=e35]
        - paragraph [ref=e36]: Ingresa con tu credencial institucional.
        - generic [ref=e37]:
          - generic [ref=e38]:
            - generic [ref=e39]: Correo Institucional
            - textbox "usuario@uta.edu.ec" [active] [ref=e40]
          - generic [ref=e41]:
            - generic [ref=e42]: Contraseña
            - textbox "••••••••" [ref=e43]
          - link "¿Olvidaste tu contraseña?" [ref=e45] [cursor=pointer]:
            - /url: /forgot-password
          - button "Iniciar Sesión" [ref=e46] [cursor=pointer]
        - generic [ref=e47]:
          - paragraph [ref=e48]: ¿No tienes una cuenta?
          - link "Registrarse como Estudiante" [ref=e49] [cursor=pointer]:
            - /url: /register
      - generic [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e53]: shield
          - generic [ref=e54]:
            - heading "Security First" [level=3] [ref=e55]
            - paragraph [ref=e56]: Monitoreo en tiempo real y perfiles verificados únicamente por la administración universitaria.
        - generic [ref=e57]:
          - generic [ref=e59]: route
          - generic [ref=e60]:
            - heading "Coordination" [level=3] [ref=e61]
            - paragraph [ref=e62]: Rutas optimizadas entre facultades y zonas residenciales de Ambato.
        - generic [ref=e63]:
          - generic [ref=e64]:
            - generic [ref=e66]: military_tech
            - heading "Reputation & Trust" [level=3] [ref=e67]
            - paragraph [ref=e68]: Sistema de karma académico basado en puntualidad y respeto, con reseñas directas de compañeros.
          - generic [ref=e71]: handshake
    - generic [ref=e72]:
      - paragraph [ref=e73]: Red académica exclusiva UTA
      - generic [ref=e74]:
        - generic [ref=e75]: UTA
        - generic [ref=e76]: FISE
        - generic [ref=e77]: FCA
        - generic [ref=e78]: FCEAH
        - generic [ref=e79]: FADU
  - contentinfo [ref=e80]:
    - generic [ref=e81]:
      - generic [ref=e82]:
        - generic [ref=e83]: U-Ride
        - paragraph [ref=e84]: © 2024 U-Ride Institutional. Powered by Academic Kinetic.
      - generic [ref=e85]:
        - generic [ref=e86]: Centro de Ayuda
        - generic [ref=e87]: Seguridad
        - generic [ref=e88]: Privacidad
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
> 91  |     await expect(page.locator('text=/Credenciales incorrectas|credenciales/i')).toBeVisible({ timeout: 8000 });
      |                                                                                 ^ Error: expect(locator).toBeVisible() failed
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