# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: my-trips.spec.ts >> My Trips - E2E >> authenticated >> should show Publicar Viaje link in header
- Location: tests\e2e\my-trips.spec.ts:36:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href="/trips/new"]:has-text("Publicar")')
Expected: visible
Error: strict mode violation: locator('a[href="/trips/new"]:has-text("Publicar")') resolved to 2 elements:
    1) <a href="/trips/new" class="font-headline tracking-tight transition-colors pb-1 text-zinc-400 hover:text-white">Publicar Viaje</a> aka getByRole('link', { name: 'Publicar Viaje' })
    2) <a href="/trips/new" class="flex flex-col items-center gap-1 transition-colors text-zinc-500">…</a> aka getByText('add_circlePublicar')

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('a[href="/trips/new"]:has-text("Publicar")')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - link "U-Ride" [ref=e6]:
        - /url: /
      - generic [ref=e7]:
        - link "Buscar Viaje" [ref=e8]:
          - /url: /trips
        - link "Publicar Viaje" [ref=e9]:
          - /url: /trips/new
        - link "Mis Solicitudes" [ref=e10]:
          - /url: /requests
        - link "Mis Viajes" [ref=e11]:
          - /url: /my-trips
        - link "U-Wallet" [ref=e12]:
          - /url: /wallet
        - generic [ref=e13]:
          - generic [ref=e14]: Conductor / Pasajero
          - link "account_circle" [ref=e15]:
            - /url: /profile
          - button "logout" [ref=e16] [cursor=pointer]
  - main [ref=e17]:
    - generic [ref=e18]:
      - main [ref=e19]:
        - generic [ref=e21]:
          - generic [ref=e22]:
            - generic [ref=e23]: Panel del Conductor
            - heading "Mis Viajes" [level=2] [ref=e24]
          - generic [ref=e25]:
            - generic [ref=e26]:
              - button "Activos" [ref=e27] [cursor=pointer]
              - button "Completados" [ref=e28] [cursor=pointer]
            - link "+ Publicar" [ref=e29]:
              - /url: /trips/new
        - generic [ref=e31]:
          - generic [ref=e33]: directions_car
          - heading "Sin viajes activos" [level=3] [ref=e34]
          - paragraph [ref=e35]: Publica tu primer viaje y conecta con tus compañeros.
          - link "Publicar Viaje" [ref=e36]:
            - /url: /trips/new
      - generic [ref=e38]:
        - generic [ref=e39]:
          - text: U-Ride
          - paragraph [ref=e40]: © 2024 U-Ride Institutional. Powered by Academic Kinetic.
        - generic [ref=e41]:
          - generic [ref=e42]: Centro de Ayuda
          - generic [ref=e43]: Privacidad
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | 
  3  | async function login(page: Page) {
  4  |   await page.goto('/login');
  5  |   await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  6  |   await page.fill('input[placeholder="••••••••"]', 'Password123!');
  7  |   await page.click('button:has-text("Iniciar Sesión")');
  8  |   await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
  9  | }
  10 | 
  11 | test.describe('My Trips - E2E', () => {
  12 |   test('should redirect to login when not authenticated', async ({ page }) => {
  13 |     await page.goto('/my-trips');
  14 |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  15 |   });
  16 | 
  17 |   test.describe('authenticated', () => {
  18 |     test.beforeEach(async ({ page }) => {
  19 |       await login(page);
  20 |     });
  21 | 
  22 |     test('should show Mis Viajes heading and Panel del Conductor', async ({ page }) => {
  23 |       await page.goto('/my-trips');
  24 | 
  25 |       await expect(page.locator('text="Mis Viajes"').first()).toBeVisible({ timeout: 8000 });
  26 |       await expect(page.locator('text="Panel del Conductor"')).toBeVisible();
  27 |     });
  28 | 
  29 |     test('should show Activos and Completados tab buttons', async ({ page }) => {
  30 |       await page.goto('/my-trips');
  31 | 
  32 |       await expect(page.locator('button:has-text("Activos")')).toBeVisible({ timeout: 8000 });
  33 |       await expect(page.locator('button:has-text("Completados")')).toBeVisible();
  34 |     });
  35 | 
  36 |     test('should show Publicar Viaje link in header', async ({ page }) => {
  37 |       await page.goto('/my-trips');
  38 | 
  39 |       await expect(
  40 |         page.locator('a[href="/trips/new"]:has-text("Publicar")')
> 41 |       ).toBeVisible({ timeout: 8000 });
     |         ^ Error: expect(locator).toBeVisible() failed
  42 |     });
  43 | 
  44 |     test('Activos tab: shows trips or empty state "Sin viajes activos"', async ({ page }) => {
  45 |       await page.goto('/my-trips');
  46 | 
  47 |       await page.click('button:has-text("Activos")');
  48 | 
  49 |       const content = page.locator('text="Sin viajes activos"').or(
  50 |         page.locator('text="Origen"')
  51 |       );
  52 |       await expect(content.first()).toBeVisible({ timeout: 10000 });
  53 |     });
  54 | 
  55 |     test('Completados tab: shows "Sin viajes completados" or completed trips', async ({ page }) => {
  56 |       await page.goto('/my-trips');
  57 | 
  58 |       await page.click('button:has-text("Completados")');
  59 | 
  60 |       const content = page.locator('text="Sin viajes completados"').or(
  61 |         page.locator('text="COMPLETADO"')
  62 |       );
  63 |       await expect(content.first()).toBeVisible({ timeout: 8000 });
  64 |     });
  65 | 
  66 |     test('empty state Activos shows Publicar Viaje link', async ({ page }) => {
  67 |       await page.goto('/my-trips');
  68 |       await page.click('button:has-text("Activos")');
  69 | 
  70 |       const emptyState = page.locator('text="Sin viajes activos"');
  71 |       const hasTripCards = await page.locator('text="Origen"').count();
  72 | 
  73 |       if (hasTripCards === 0) {
  74 |         await expect(emptyState).toBeVisible({ timeout: 8000 });
  75 |         await expect(page.locator('a[href="/trips/new"]:has-text("Publicar Viaje")').last()).toBeVisible();
  76 |       } else {
  77 |         // hay viajes activos — solo verificamos que cargaron
  78 |         await expect(page.locator('text="Origen"').first()).toBeVisible();
  79 |       }
  80 |     });
  81 | 
  82 |     test('clicking Gestionar in a trip row navigates to requests page', async ({ page }) => {
  83 |       await page.goto('/my-trips');
  84 | 
  85 |       const gestionar = page.locator('button:has-text("Gestionar")').first();
  86 |       const hasTrips = await gestionar.isVisible({ timeout: 5000 }).catch(() => false);
  87 | 
  88 |       if (hasTrips) {
  89 |         await gestionar.click();
  90 |         await expect(page).toHaveURL(/\/trips\/[^/]+\/requests/, { timeout: 8000 });
  91 |         await expect(page.locator('text="Solicitudes Pendientes"')).toBeVisible({ timeout: 8000 });
  92 |       } else {
  93 |         test.skip();
  94 |       }
  95 |     });
  96 |   });
  97 | });
  98 | 
```