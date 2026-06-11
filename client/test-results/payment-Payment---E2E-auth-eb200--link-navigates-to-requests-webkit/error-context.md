# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payment.spec.ts >> Payment - E2E >> authenticated >> "Volver a mis solicitudes" link navigates to /requests
- Location: tests\e2e\payment.spec.ts:34:5

# Error details

```
Error: page.goto: Target page, context or browser has been closed
Call log:
  - navigating to "http://localhost:4278/login", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | async function login(page: Page) {
> 4   |   await page.goto('/login');
      |              ^ Error: page.goto: Target page, context or browser has been closed
  5   |   await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  6   |   await page.fill('input[placeholder="••••••••"]', 'Password123!');
  7   |   await page.click('button:has-text("Iniciar Sesión")');
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
```