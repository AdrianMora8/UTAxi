# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: active-trip.spec.ts >> Active Trip - E2E >> authenticated >> "← Volver a viajes" navigates to /trips
- Location: tests\e2e\active-trip.spec.ts:53:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*trips/
Received string:  "http://localhost:4278/login"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    13 × unexpected value "http://localhost:4278/login"

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
            - textbox "••••••••" [ref=e43]: Password123!
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
  7   |   await page.click('button:has-text("Iniciar Sesión")');
> 8   |   await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  9   | }
  10  | 
  11  | async function navigateToActiveTrip(page: Page): Promise<boolean> {
  12  |   // Reach /trips/:id/active via Manage Requests → Ir al Mapa GPS (trip IN_PROGRESS)
  13  |   await page.goto('/my-trips');
  14  |   const gestionar = page.locator('button:has-text("Gestionar")').first();
  15  |   const hasTrip = await gestionar.isVisible({ timeout: 6000 }).catch(() => false);
  16  |   if (!hasTrip) return false;
  17  | 
  18  |   await gestionar.click();
  19  |   await expect(page).toHaveURL(/\/trips\/[^/]+\/requests/, { timeout: 8000 });
  20  | 
  21  |   const mapa = page.locator('button:has-text("Ir al Mapa GPS")');
  22  |   const hasInProgress = await mapa.isVisible({ timeout: 4000 }).catch(() => false);
  23  |   if (!hasInProgress) return false;
  24  | 
  25  |   await mapa.click();
  26  |   await expect(page).toHaveURL(/\/trips\/[^/]+\/active/, { timeout: 8000 });
  27  |   return true;
  28  | }
  29  | 
  30  | test.describe('Active Trip - E2E', () => {
  31  |   test('should redirect to login when not authenticated', async ({ page }) => {
  32  |     await page.goto('/trips/some-trip-id/active');
  33  |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  34  |   });
  35  | 
  36  |   test.describe('authenticated', () => {
  37  |     test.beforeEach(async ({ page }) => {
  38  |       await login(page);
  39  |     });
  40  | 
  41  |     test('shows "Viaje no encontrado." for invalid trip ID', async ({ page }) => {
  42  |       await page.goto('/trips/id-inexistente-00000000/active');
  43  | 
  44  |       await expect(
  45  |         page.locator('text="Viaje no encontrado."')
  46  |       ).toBeVisible({ timeout: 10000 });
  47  | 
  48  |       await expect(
  49  |         page.locator('a:has-text("← Volver a viajes")')
  50  |       ).toBeVisible();
  51  |     });
  52  | 
  53  |     test('"← Volver a viajes" navigates to /trips', async ({ page }) => {
  54  |       await page.goto('/trips/id-inexistente-00000000/active');
  55  | 
  56  |       await page.locator('a:has-text("← Volver a viajes")').click();
  57  |       await expect(page).toHaveURL(/.*\/trips$/, { timeout: 8000 });
  58  |     });
  59  | 
  60  |     test('shows Detalle back link when trip is valid', async ({ page }) => {
  61  |       const reached = await navigateToActiveTrip(page);
  62  |       if (!reached) { test.skip(); return; }
  63  | 
  64  |       await expect(page.locator('a:has-text("Detalle")')).toBeVisible({ timeout: 8000 });
  65  |     });
  66  | 
  67  |     test('shows connection status pill (Conectando... or tracking active)', async ({ page }) => {
  68  |       const reached = await navigateToActiveTrip(page);
  69  |       if (!reached) { test.skip(); return; }
  70  | 
  71  |       const status = page
  72  |         .locator('text="Conectando..."')
  73  |         .or(page.locator('text="Transmitiendo GPS"'))
  74  |         .or(page.locator('text="Tracking activo"'));
  75  | 
  76  |       await expect(status.first()).toBeVisible({ timeout: 10000 });
  77  |     });
  78  | 
  79  |     test('shows map loading area or map content', async ({ page }) => {
  80  |       const reached = await navigateToActiveTrip(page);
  81  |       if (!reached) { test.skip(); return; }
  82  | 
  83  |       const mapArea = page
  84  |         .locator('text="Cargando mapa..."')
  85  |         .or(page.locator('.leaflet-container'))
  86  |         .or(page.locator('[class*="leaflet"]'));
  87  | 
  88  |       await expect(mapArea.first()).toBeVisible({ timeout: 12000 });
  89  |     });
  90  | 
  91  |     test('bottom panel shows Viaje en Curso badge', async ({ page }) => {
  92  |       const reached = await navigateToActiveTrip(page);
  93  |       if (!reached) { test.skip(); return; }
  94  | 
  95  |       await expect(page.locator('text="Viaje en Curso"')).toBeVisible({ timeout: 8000 });
  96  |     });
  97  | 
  98  |     test('bottom panel shows ETA ~15 MIN', async ({ page }) => {
  99  |       const reached = await navigateToActiveTrip(page);
  100 |       if (!reached) { test.skip(); return; }
  101 | 
  102 |       await expect(page.locator('text="~15 MIN"')).toBeVisible({ timeout: 8000 });
  103 |     });
  104 | 
  105 |     test('bottom panel shows Chat button', async ({ page }) => {
  106 |       const reached = await navigateToActiveTrip(page);
  107 |       if (!reached) { test.skip(); return; }
  108 | 
```