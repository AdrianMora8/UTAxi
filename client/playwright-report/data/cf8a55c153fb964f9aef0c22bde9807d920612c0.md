# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payment.spec.ts >> Payment - E2E >> authenticated >> shows "Solicitud no encontrada" for invalid request ID
- Location: tests\e2e\payment.spec.ts:22:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Iniciar Sesión")')
    - locator resolved to <button type="submit" class="w-full bg-gradient-primary text-on-primary py-4 rounded-lg font-headline font-bold text-lg active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,255,65,0.15)] hover:shadow-[0_4px_20px_rgba(0,255,65,0.25)] disabled:opacity-50">Iniciar Sesión</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - link "U-Ride" [ref=e6]:
        - /url: /
      - link "Registrarse" [ref=e7]:
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
            - textbox "usuario@uta.edu.ec" [ref=e40]: student1@uta.edu.ec
          - generic [ref=e41]:
            - generic [ref=e42]: Contraseña
            - textbox "••••••••" [active] [ref=e43]: Password123!
          - link "¿Olvidaste tu contraseña?" [ref=e45]:
            - /url: /forgot-password
          - button "Iniciar Sesión" [ref=e46] [cursor=pointer]
        - generic [ref=e47]:
          - paragraph [ref=e48]: ¿No tienes una cuenta?
          - link "Registrarse como Estudiante" [ref=e49]:
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
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | async function login(page: Page) {
  4   |   await page.goto('/login');
  5   |   await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  6   |   await page.fill('input[placeholder="••••••••"]', 'Password123!');
> 7   |   await page.click('button:has-text("Iniciar Sesión")');
      |              ^ Error: page.click: Test timeout of 30000ms exceeded.
  8   |   await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
  9   | }
  10  | 
  11  | test.describe('Payment - E2E', () => {
  12  |   test('should redirect to login when not authenticated', async ({ page }) => {
  13  |     await page.goto('/pay/some-request-id');
  14  |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  15  |   });
  16  | 
  17  |   test.describe('authenticated', () => {
  18  |     test.beforeEach(async ({ page }) => {
  19  |       await login(page);
  20  |     });
  21  | 
  22  |     test('shows "Solicitud no encontrada" for invalid request ID', async ({ page }) => {
  23  |       await page.goto('/pay/id-inexistente-00000000');
  24  | 
  25  |       await expect(
  26  |         page.locator('text="Solicitud no encontrada."')
  27  |       ).toBeVisible({ timeout: 10000 });
  28  | 
  29  |       await expect(
  30  |         page.locator('a:has-text("← Volver a mis solicitudes")')
  31  |       ).toBeVisible();
  32  |     });
  33  | 
  34  |     test('"Volver a mis solicitudes" link navigates to /requests', async ({ page }) => {
  35  |       await page.goto('/pay/id-inexistente-00000000');
  36  | 
  37  |       await page.locator('a:has-text("← Volver a mis solicitudes")').click();
  38  | 
  39  |       await expect(page).toHaveURL(/.*requests/, { timeout: 8000 });
  40  |     });
  41  | 
  42  |     test('payment page shows Confirmar Pago heading and card form', async ({ page }) => {
  43  |       // Navegar desde /requests si hay un request ACCEPTED sin pagar
  44  |       await page.goto('/requests');
  45  |       const payBtn = page.locator('button:has-text("Pagar Ahora")').first();
  46  |       const hasPayButton = await payBtn.isVisible({ timeout: 5000 }).catch(() => false);
  47  | 
  48  |       if (!hasPayButton) {
  49  |         test.skip();
  50  |         return;
  51  |       }
  52  | 
  53  |       await payBtn.click();
  54  |       await expect(page).toHaveURL(/\/pay\//, { timeout: 8000 });
  55  | 
  56  |       await expect(page.locator('h1:has-text("Confirmar Pago")')).toBeVisible({ timeout: 8000 });
  57  |       await expect(page.locator('text="Número de Tarjeta"')).toBeVisible();
  58  |       await expect(page.locator('text="Titular de la Tarjeta"')).toBeVisible();
  59  |       await expect(page.locator('text="Vencimiento"')).toBeVisible();
  60  |       await expect(page.locator('text="CVV"')).toBeVisible();
  61  |     });
  62  | 
  63  |     test('payment page shows Confirmar Pago button and Cancelar Transacción link', async ({ page }) => {
  64  |       await page.goto('/requests');
  65  |       const payBtn = page.locator('button:has-text("Pagar Ahora")').first();
  66  |       const hasPayButton = await payBtn.isVisible({ timeout: 5000 }).catch(() => false);
  67  | 
  68  |       if (!hasPayButton) {
  69  |         test.skip();
  70  |         return;
  71  |       }
  72  | 
  73  |       await payBtn.click();
  74  |       await expect(page).toHaveURL(/\/pay\//, { timeout: 8000 });
  75  | 
  76  |       await expect(page.locator('button:has-text("Confirmar Pago")')).toBeVisible({ timeout: 8000 });
  77  |       await expect(page.locator('a:has-text("Cancelar Transacción")')).toBeVisible();
  78  |     });
  79  | 
  80  |     test('payment page shows demo disclaimer', async ({ page }) => {
  81  |       await page.goto('/requests');
  82  |       const payBtn = page.locator('button:has-text("Pagar Ahora")').first();
  83  |       const hasPayButton = await payBtn.isVisible({ timeout: 5000 }).catch(() => false);
  84  | 
  85  |       if (!hasPayButton) {
  86  |         test.skip();
  87  |         return;
  88  |       }
  89  | 
  90  |       await payBtn.click();
  91  |       await expect(page).toHaveURL(/\/pay\//, { timeout: 8000 });
  92  | 
  93  |       await expect(
  94  |         page.locator('text=/Entorno de demostración/i')
  95  |       ).toBeVisible({ timeout: 8000 });
  96  |     });
  97  | 
  98  |     test('Cancelar Transacción navigates back to /requests', async ({ page }) => {
  99  |       await page.goto('/requests');
  100 |       const payBtn = page.locator('button:has-text("Pagar Ahora")').first();
  101 |       const hasPayButton = await payBtn.isVisible({ timeout: 5000 }).catch(() => false);
  102 | 
  103 |       if (!hasPayButton) {
  104 |         test.skip();
  105 |         return;
  106 |       }
  107 | 
```