# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-reports.spec.ts >> Admin — Gestión de Reportes - E2E >> panel admin autenticado >> tab Trazabilidad muestra eventos del sistema
- Location: tests\e2e\admin-reports.spec.ts:179:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*\/admin/
Received string:  "http://localhost:4278/trips"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    3 × unexpected value "http://localhost:4278/login"
    10 × unexpected value "http://localhost:4278/trips"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - link "U-Ride" [ref=e6] [cursor=pointer]:
        - /url: /
      - generic [ref=e7]:
        - link "Buscar Viaje" [ref=e8] [cursor=pointer]:
          - /url: /trips
        - link "Mis Solicitudes" [ref=e9] [cursor=pointer]:
          - /url: /requests
        - link "U-Wallet" [ref=e10] [cursor=pointer]:
          - /url: /wallet
        - link "Admin" [ref=e11] [cursor=pointer]:
          - /url: /admin
        - generic [ref=e12]:
          - generic [ref=e13]: Pasajero
          - link "account_circle" [ref=e14] [cursor=pointer]:
            - /url: /profile
          - button "logout" [ref=e15] [cursor=pointer]
  - main [ref=e16]:
    - generic [ref=e17]:
      - main [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]:
            - heading "Kinetic Movement for the Academic Mind." [level=1] [ref=e21]
            - paragraph [ref=e22]: Conecta con compañeros para un traslado más seguro, inteligente y sostenible al campus.
          - generic [ref=e24]:
            - generic [ref=e25]:
              - generic [ref=e26]: Zona de Origen
              - generic [ref=e27]:
                - generic [ref=e28]: location_on
                - textbox "¿De dónde sales?" [ref=e29]
            - generic [ref=e30]:
              - generic [ref=e31]: Zona de Destino
              - generic [ref=e32]:
                - generic [ref=e33]: near_me
                - textbox "¿A dónde vas?" [ref=e34]
            - generic [ref=e35]:
              - generic [ref=e36]: Horario
              - generic [ref=e37]:
                - generic [ref=e38]: schedule
                - textbox [ref=e39]
            - button "search Encontrar Viaje" [ref=e40] [cursor=pointer]:
              - generic [ref=e41]: search
              - text: Encontrar Viaje
        - generic [ref=e42]:
          - generic [ref=e43]:
            - heading "Viajes Disponibles" [level=2] [ref=e44]
            - paragraph [ref=e45]: 0 rutas encontradas
          - generic [ref=e46]:
            - button "MÁS RECIENTES" [ref=e47] [cursor=pointer]
            - button "MEJOR CALIFICADOS" [ref=e48] [cursor=pointer]
        - generic [ref=e49]:
          - generic [ref=e50]: directions_car
          - paragraph [ref=e51]: No hay viajes disponibles con esos filtros.
          - button "Limpiar filtros" [ref=e52] [cursor=pointer]
        - generic [ref=e53]:
          - generic [ref=e56]: shield
          - generic [ref=e57]:
            - heading "Protocolo de Seguridad Académica" [level=3] [ref=e58]
            - paragraph [ref=e59]: Todos los conductores en U-Ride son estudiantes o personal verificado con correo institucional @uta.edu.ec. Tu viaje está monitoreado por GPS en tiempo real para tu tranquilidad.
          - generic [ref=e60]: Ver Reglas
      - generic [ref=e62]:
        - generic [ref=e63]:
          - text: U-Ride
          - paragraph [ref=e64]: © 2024 U-Ride Institutional. Powered by Academic Kinetic.
        - generic [ref=e65]:
          - generic [ref=e66]: Centro de Ayuda
          - generic [ref=e67]: Reglas de Seguridad
          - generic [ref=e68]: Privacidad
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | async function loginAsAdmin(page: Page) {
  4   |   await page.goto('/login');
  5   |   await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'admin@uta.edu.ec');
  6   |   await page.fill('input[placeholder="••••••••"]', '123456');
  7   |   await page.click('button:has-text("Iniciar Sesión")');
> 8   |   await expect(page).toHaveURL(/.*\/admin/, { timeout: 10000 });
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  9   | }
  10  | 
  11  | async function loginAsStudent(page: Page) {
  12  |   await page.goto('/login');
  13  |   await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  14  |   await page.fill('input[placeholder="••••••••"]', 'Password123!');
  15  |   await page.click('button:has-text("Iniciar Sesión")');
  16  |   await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
  17  | }
  18  | 
  19  | test.describe('Admin — Gestión de Reportes - E2E', () => {
  20  |   test('redirige a login si no está autenticado', async ({ page }) => {
  21  |     await page.goto('/admin');
  22  |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  23  |   });
  24  | 
  25  |   test('bloquea acceso a un usuario no-admin', async ({ page }) => {
  26  |     await loginAsStudent(page);
  27  |     await page.goto('/admin');
  28  |     // debe redirigir o mostrar error de acceso
  29  |     await expect(page).not.toHaveURL(/.*\/admin$/, { timeout: 5000 });
  30  |   });
  31  | 
  32  |   test.describe('panel admin autenticado', () => {
  33  |     test.beforeEach(async ({ page }) => {
  34  |       await loginAsAdmin(page);
  35  |     });
  36  | 
  37  |     test('muestra el Dashboard Admin con sidebar', async ({ page }) => {
  38  |       await expect(page.locator('text="Dashboard"')).toBeVisible({ timeout: 8000 });
  39  |       await expect(page.locator('text="Admin Panel"')).toBeVisible();
  40  |     });
  41  | 
  42  |     test('muestra los 4 tabs de navegación en el sidebar', async ({ page }) => {
  43  |       await expect(page.locator('button:has-text("Reportes")')).toBeVisible({ timeout: 8000 });
  44  |       await expect(page.locator('button:has-text("Usuarios")')).toBeVisible();
  45  |       await expect(page.locator('button:has-text("Viajes")')).toBeVisible();
  46  |       await expect(page.locator('button:has-text("Trazabilidad")')).toBeVisible();
  47  |     });
  48  | 
  49  |     test('muestra las 4 stat cards', async ({ page }) => {
  50  |       await expect(page.locator('text="Reportes Abiertos"')).toBeVisible({ timeout: 8000 });
  51  |       await expect(page.locator('text="Usuarios Activos"')).toBeVisible();
  52  |       await expect(page.locator('text="Viajes Completados"')).toBeVisible();
  53  |       await expect(page.locator('text="Reputación Promedio"')).toBeVisible();
  54  |     });
  55  | 
  56  |     // ── Tab Reportes ────────────────────────────────────────────────
  57  | 
  58  |     test('tab Reportes está activo por defecto y muestra "Gestión de Reportes"', async ({ page }) => {
  59  |       await expect(page.locator('text="Gestión de Reportes"')).toBeVisible({ timeout: 8000 });
  60  |     });
  61  | 
  62  |     test('muestra el dropdown de filtro de estado en el header', async ({ page }) => {
  63  |       const select = page.locator('select').first();
  64  |       await expect(select).toBeVisible({ timeout: 8000 });
  65  | 
  66  |       const options = await select.locator('option').allTextContents();
  67  |       expect(options).toContain('Todos los reportes');
  68  |       expect(options).toContain('Abiertos');
  69  |       expect(options).toContain('Revisados');
  70  |       expect(options).toContain('Resueltos');
  71  |     });
  72  | 
  73  |     test('muestra la lista de reportes o estado vacío', async ({ page }) => {
  74  |       const content = page
  75  |         .locator('text="No hay reportes pendientes."')
  76  |         .or(page.locator('button:has-text("Review")').first());
  77  |       await expect(content.first()).toBeVisible({ timeout: 10000 });
  78  |     });
  79  | 
  80  |     test('filtrar por Abiertos recarga la lista de reportes', async ({ page }) => {
  81  |       await page.waitForTimeout(500); // espera que cargue la lista inicial
  82  |       const select = page.locator('select').first();
  83  |       await select.selectOption('OPEN');
  84  |       // el texto de reportes en total se actualiza
  85  |       await expect(page.locator('text=/reportes en total/')).toBeVisible({ timeout: 8000 });
  86  |     });
  87  | 
  88  |     test('filtrar por Resueltos recarga la lista', async ({ page }) => {
  89  |       const select = page.locator('select').first();
  90  |       await select.selectOption('RESOLVED');
  91  |       await expect(page.locator('text=/reportes en total/')).toBeVisible({ timeout: 8000 });
  92  |     });
  93  | 
  94  |     test('muestra el modal de revisión al hacer clic en Review', async ({ page }) => {
  95  |       const reviewBtn = page.locator('button:has-text("Review")').first();
  96  |       const hasReports = await reviewBtn.isVisible({ timeout: 8000 }).catch(() => false);
  97  | 
  98  |       if (!hasReports) {
  99  |         test.skip();
  100 |         return;
  101 |       }
  102 | 
  103 |       await reviewBtn.click();
  104 |       await expect(page.locator('text="Revisar Reporte"')).toBeVisible({ timeout: 5000 });
  105 |     });
  106 | 
  107 |     test('ReviewModal muestra las 3 acciones disponibles', async ({ page }) => {
  108 |       const reviewBtn = page.locator('button:has-text("Review")').first();
```