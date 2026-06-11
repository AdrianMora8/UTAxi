# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: requests.spec.ts >> My Requests - E2E >> authenticated >> should show U-Wallet sidebar with Recargar link
- Location: tests\e2e\requests.spec.ts:36:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*trips/
Received string:  "http://localhost:4278/login"

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    2 × unexpected value "http://localhost:4278/login"

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
  11  | test.describe('My Requests - E2E', () => {
  12  |   test('should redirect to login when not authenticated', async ({ page }) => {
  13  |     await page.goto('/requests');
  14  |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  15  |   });
  16  | 
  17  |   test.describe('authenticated', () => {
  18  |     test.beforeEach(async ({ page }) => {
  19  |       await login(page);
  20  |     });
  21  | 
  22  |     test('should show Mis Solicitudes heading and Panel de Pasajero', async ({ page }) => {
  23  |       await page.goto('/requests');
  24  | 
  25  |       await expect(page.locator('text="Mis Solicitudes"')).toBeVisible({ timeout: 8000 });
  26  |       await expect(page.locator('text="Panel de Pasajero"')).toBeVisible();
  27  |     });
  28  | 
  29  |     test('should show Activas and Historial tab buttons', async ({ page }) => {
  30  |       await page.goto('/requests');
  31  | 
  32  |       await expect(page.locator('button:has-text("Activas")')).toBeVisible({ timeout: 8000 });
  33  |       await expect(page.locator('button:has-text("Historial")')).toBeVisible();
  34  |     });
  35  | 
  36  |     test('should show U-Wallet sidebar with Recargar link', async ({ page }) => {
  37  |       await page.goto('/requests');
  38  | 
  39  |       await expect(page.locator('text="Saldo U-Wallet"')).toBeVisible({ timeout: 8000 });
  40  |       // El sidebar muestra un link "Recargar" hacia /wallet (no un botón)
  41  |       await expect(page.locator('a[href="/wallet"]:has-text("Recargar")').first()).toBeVisible();
  42  |     });
  43  | 
  44  |     test('Activas tab: shows requests or empty state with Buscar Viaje link', async ({ page }) => {
  45  |       await page.goto('/requests');
  46  |       await page.click('button:has-text("Activas")');
  47  | 
  48  |       const content = page.locator('text="No tienes viajes activos"').or(
  49  |         page.locator('text="PENDIENTE"')
  50  |       ).or(
  51  |         page.locator('text="ACEPTADO"')
  52  |       );
  53  |       await expect(content.first()).toBeVisible({ timeout: 10000 });
  54  |     });
  55  | 
  56  |     test('empty Activas state shows Buscar Viaje link to /trips', async ({ page }) => {
  57  |       await page.goto('/requests');
  58  |       await page.click('button:has-text("Activas")');
  59  | 
  60  |       const emptyState = page.locator('text="No tienes viajes activos"');
  61  |       const isEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
  62  | 
  63  |       if (isEmpty) {
  64  |         // Usar el link dentro del área de contenido principal, no el del navbar
  65  |         // El empty state tiene un Link con clase bg-gradient-primary
  66  |         const buscarLink = page.locator('a.bg-gradient-primary:has-text("Buscar Viaje")');
  67  |         await expect(buscarLink).toBeVisible();
  68  |         await buscarLink.click();
  69  |         await expect(page).toHaveURL(/.*\/trips$/, { timeout: 8000 });
  70  |       } else {
  71  |         // hay solicitudes activas — verificar que se muestran los datos
  72  |         await expect(page.locator('text="Origen"').first()).toBeVisible();
  73  |       }
  74  |     });
  75  | 
  76  |     test('Historial tab: shows completed requests or empty state', async ({ page }) => {
  77  |       await page.goto('/requests');
  78  |       await page.click('button:has-text("Historial")');
  79  | 
  80  |       const content = page.locator('text="Sin viajes completados"').or(
  81  |         page.locator('text="COMPLETADO"')
  82  |       );
  83  |       await expect(content.first()).toBeVisible({ timeout: 8000 });
  84  |     });
  85  | 
  86  |     test('pending request shows Cancelar Solicitud button', async ({ page }) => {
  87  |       await page.goto('/requests');
  88  |       await page.click('button:has-text("Activas")');
  89  | 
  90  |       const cancelBtn = page.locator('button:has-text("Cancelar Solicitud")').first();
  91  |       const hasPending = await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false);
  92  | 
  93  |       if (hasPending) {
  94  |         await expect(cancelBtn).toBeVisible();
  95  |       } else {
  96  |         // No hay solicitudes PENDING — test condicional
  97  |         test.skip();
  98  |       }
  99  |     });
  100 | 
  101 |     test('accepted unpaid request shows payment buttons', async ({ page }) => {
  102 |       await page.goto('/requests');
  103 |       await page.click('button:has-text("Activas")');
  104 | 
  105 |       // La UI muestra "Pagar con U-Wallet" o "Pagar con Tarjeta" (no "Pagar Ahora")
  106 |       const walletBtn = page.locator('button:has-text("Pagar con U-Wallet")').first();
  107 |       const cardBtn  = page.locator('button:has-text("Pagar con Tarjeta")').first();
  108 |       const hasAccepted = await walletBtn.isVisible({ timeout: 5000 }).catch(() => false);
```