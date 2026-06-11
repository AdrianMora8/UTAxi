# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: my-trips.spec.ts >> My Trips - E2E >> authenticated >> Activos tab: shows trips or empty state "Sin viajes activos"
- Location: tests\e2e\my-trips.spec.ts:44:5

# Error details

```
Error: page.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('button:has-text("Iniciar Sesión")')
    - locator resolved to <button type="submit" class="w-full bg-gradient-primary text-on-primary py-4 rounded-lg font-headline font-bold text-lg active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,255,65,0.15)] hover:shadow-[0_4px_20px_rgba(0,255,65,0.25)] disabled:opacity-50">Iniciar Sesión</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling

```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | 
  3  | async function login(page: Page) {
  4  |   await page.goto('/login');
  5  |   await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  6  |   await page.fill('input[placeholder="••••••••"]', 'Password123!');
> 7  |   await page.click('button:has-text("Iniciar Sesión")');
     |              ^ Error: page.click: Target page, context or browser has been closed
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
  41 |       ).toBeVisible({ timeout: 8000 });
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