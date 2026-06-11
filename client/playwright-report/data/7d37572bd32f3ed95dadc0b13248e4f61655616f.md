# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manage-requests.spec.ts >> Manage Requests - E2E >> authenticated >> shows Ir al Mapa GPS and Completar Viaje when trip is IN_PROGRESS
- Location: tests\e2e\manage-requests.spec.ts:91:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="usuario@uta.edu.ec"]')

```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | async function login(page: Page) {
  4   |   await page.goto('/login');
> 5   |   await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
      |              ^ Error: page.fill: Test timeout of 30000ms exceeded.
  6   |   await page.fill('input[placeholder="••••••••"]', 'Password123!');
  7   |   await page.click('button:has-text("Iniciar Sesión")');
  8   |   await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
  9   | }
  10  | 
  11  | async function navigateToManageRequests(page: Page): Promise<boolean> {
  12  |   await page.goto('/my-trips');
  13  |   const gestionar = page.locator('button:has-text("Gestionar")').first();
  14  |   const hasTrip = await gestionar.isVisible({ timeout: 6000 }).catch(() => false);
  15  |   if (!hasTrip) return false;
  16  |   await gestionar.click();
  17  |   await expect(page).toHaveURL(/\/trips\/[^/]+\/requests/, { timeout: 8000 });
  18  |   return true;
  19  | }
  20  | 
  21  | test.describe('Manage Requests - E2E', () => {
  22  |   test('should redirect to login when not authenticated', async ({ page }) => {
  23  |     await page.goto('/trips/some-trip-id/requests');
  24  |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  25  |   });
  26  | 
  27  |   test.describe('authenticated', () => {
  28  |     test.beforeEach(async ({ page }) => {
  29  |       await login(page);
  30  |     });
  31  | 
  32  |     test('should show Solicitudes Pendientes heading', async ({ page }) => {
  33  |       const reached = await navigateToManageRequests(page);
  34  |       if (!reached) { test.skip(); return; }
  35  | 
  36  |       await expect(page.locator('text="Solicitudes Pendientes"')).toBeVisible({ timeout: 8000 });
  37  |     });
  38  | 
  39  |     test('should show Pasajeros Confirmados section', async ({ page }) => {
  40  |       const reached = await navigateToManageRequests(page);
  41  |       if (!reached) { test.skip(); return; }
  42  | 
  43  |       await expect(page.locator('text="Pasajeros Confirmados"')).toBeVisible({ timeout: 8000 });
  44  |     });
  45  | 
  46  |     test('shows empty state when no pending requests', async ({ page }) => {
  47  |       const reached = await navigateToManageRequests(page);
  48  |       if (!reached) { test.skip(); return; }
  49  | 
  50  |       const pendingCard = page.locator('button:has-text("Aceptar")').first();
  51  |       const hasPending = await pendingCard.isVisible({ timeout: 4000 }).catch(() => false);
  52  | 
  53  |       if (!hasPending) {
  54  |         await expect(page.locator('text="No hay solicitudes pendientes."')).toBeVisible({ timeout: 8000 });
  55  |       } else {
  56  |         await expect(pendingCard).toBeVisible();
  57  |       }
  58  |     });
  59  | 
  60  |     test('pending request shows Aceptar and Declinar buttons', async ({ page }) => {
  61  |       const reached = await navigateToManageRequests(page);
  62  |       if (!reached) { test.skip(); return; }
  63  | 
  64  |       const aceptar = page.locator('button:has-text("Aceptar")').first();
  65  |       const hasPending = await aceptar.isVisible({ timeout: 4000 }).catch(() => false);
  66  | 
  67  |       if (!hasPending) {
  68  |         test.skip();
  69  |         return;
  70  |       }
  71  | 
  72  |       await expect(aceptar).toBeVisible();
  73  |       await expect(page.locator('button:has-text("Declinar")').first()).toBeVisible();
  74  |     });
  75  | 
  76  |     test('shows Empezar Viaje button when trip is SCHEDULED', async ({ page }) => {
  77  |       const reached = await navigateToManageRequests(page);
  78  |       if (!reached) { test.skip(); return; }
  79  | 
  80  |       const empezar = page.locator('button:has-text("Empezar Viaje")');
  81  |       const hasScheduled = await empezar.isVisible({ timeout: 4000 }).catch(() => false);
  82  | 
  83  |       if (!hasScheduled) {
  84  |         test.skip();
  85  |         return;
  86  |       }
  87  | 
  88  |       await expect(empezar).toBeVisible();
  89  |     });
  90  | 
  91  |     test('shows Ir al Mapa GPS and Completar Viaje when trip is IN_PROGRESS', async ({ page }) => {
  92  |       const reached = await navigateToManageRequests(page);
  93  |       if (!reached) { test.skip(); return; }
  94  | 
  95  |       const mapa = page.locator('button:has-text("Ir al Mapa GPS")');
  96  |       const hasInProgress = await mapa.isVisible({ timeout: 4000 }).catch(() => false);
  97  | 
  98  |       if (!hasInProgress) {
  99  |         test.skip();
  100 |         return;
  101 |       }
  102 | 
  103 |       await expect(mapa).toBeVisible();
  104 |       await expect(page.locator('button:has-text("Completar Viaje")')).toBeVisible();
  105 |     });
```