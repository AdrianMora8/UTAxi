# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: report-driver.spec.ts >> Reportar Conductor - E2E >> página /reports >> el botón Enviar Reporte sigue deshabilitado con solo motivo seleccionado
- Location: tests\e2e\report-driver.spec.ts:44:5

# Error details

```
Error: page.fill: Target page, context or browser has been closed
Call log:
  - waiting for locator('input[placeholder="••••••••"]')

```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | async function login(page: Page, email = 'student1@uta.edu.ec', password = 'Password123!') {
  4   |   await page.goto('/login');
  5   |   await page.fill('input[placeholder="usuario@uta.edu.ec"]', email);
> 6   |   await page.fill('input[placeholder="••••••••"]', password);
      |              ^ Error: page.fill: Target page, context or browser has been closed
  7   |   await page.click('button:has-text("Iniciar Sesión")');
  8   |   await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
  9   | }
  10  | 
  11  | test.describe('Reportar Conductor - E2E', () => {
  12  |   test('redirige a login si no está autenticado', async ({ page }) => {
  13  |     await page.goto('/reports?userId=abc&name=Test');
  14  |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  15  |   });
  16  | 
  17  |   test.describe('página /reports', () => {
  18  |     test.beforeEach(async ({ page }) => {
  19  |       await login(page);
  20  |     });
  21  | 
  22  |     test('muestra el título "Reportar Usuario"', async ({ page }) => {
  23  |       await page.goto('/reports?userId=some-id&name=Carlos+P%C3%A9rez');
  24  |       await expect(page.locator('h1:has-text("Reportar Usuario")')).toBeVisible({ timeout: 8000 });
  25  |     });
  26  | 
  27  |     test('muestra el nombre del conductor desde el query param', async ({ page }) => {
  28  |       await page.goto('/reports?userId=some-id&name=Luis+Vera');
  29  |       await expect(page.locator('text="Luis Vera"')).toBeVisible({ timeout: 8000 });
  30  |     });
  31  | 
  32  |     test('muestra las secciones del formulario', async ({ page }) => {
  33  |       await page.goto('/reports?userId=some-id&name=Test+Driver');
  34  |       await expect(page.locator('text="Motivo del Reporte"')).toBeVisible({ timeout: 8000 });
  35  |       await expect(page.locator('text="Descripción de los hechos"')).toBeVisible();
  36  |       await expect(page.locator('text="Evidencia Fotográfica"')).toBeVisible();
  37  |     });
  38  | 
  39  |     test('el botón Enviar Reporte está deshabilitado sin motivo ni descripción', async ({ page }) => {
  40  |       await page.goto('/reports?userId=some-id&name=Test+Driver');
  41  |       await expect(page.locator('button:has-text("Enviar Reporte")')).toBeDisabled({ timeout: 8000 });
  42  |     });
  43  | 
  44  |     test('el botón Enviar Reporte sigue deshabilitado con solo motivo seleccionado', async ({ page }) => {
  45  |       await page.goto('/reports?userId=some-id&name=Test+Driver');
  46  |       await page.selectOption('select', 'INAPPROPRIATE_BEHAVIOR');
  47  |       await expect(page.locator('button:has-text("Enviar Reporte")')).toBeDisabled();
  48  |     });
  49  | 
  50  |     test('el botón Enviar Reporte sigue deshabilitado con descripción menor a 10 chars', async ({ page }) => {
  51  |       await page.goto('/reports?userId=some-id&name=Test+Driver');
  52  |       await page.selectOption('select', 'FRAUD');
  53  |       await page.fill('textarea', 'corta');
  54  |       await expect(page.locator('button:has-text("Enviar Reporte")')).toBeDisabled();
  55  |     });
  56  | 
  57  |     test('el botón Enviar Reporte se habilita con motivo y descripción válida', async ({ page }) => {
  58  |       await page.goto('/reports?userId=some-id&name=Test+Driver');
  59  |       await page.selectOption('select', 'HARASSMENT');
  60  |       await page.fill('textarea', 'El conductor tuvo un comportamiento muy inapropiado durante el trayecto.');
  61  |       await expect(page.locator('button:has-text("Enviar Reporte")')).toBeEnabled();
  62  |     });
  63  | 
  64  |     test('el link Cancelar navega de vuelta a /trips', async ({ page }) => {
  65  |       await page.goto('/reports?userId=some-id&name=Test+Driver');
  66  |       await expect(page.locator('a:has-text("Cancelar")')).toBeVisible({ timeout: 8000 });
  67  |       await page.click('a:has-text("Cancelar")');
  68  |       await expect(page).toHaveURL(/.*\/trips$/, { timeout: 8000 });
  69  |     });
  70  | 
  71  |     test('muestra opciones correctas en el selector de motivo', async ({ page }) => {
  72  |       await page.goto('/reports?userId=some-id&name=Test+Driver');
  73  |       await page.click('select');
  74  |       const options = await page.locator('select option').allTextContents();
  75  |       expect(options).toContain('Comportamiento inapropiado');
  76  |       expect(options).toContain('Conducción peligrosa / Inseguridad');
  77  |       expect(options).toContain('Fraude o problema con el pago');
  78  |       expect(options).toContain('Hostigamiento o acoso');
  79  |     });
  80  |   });
  81  | 
  82  |   test.describe('botón Reportar conductor desde Mis Solicitudes', () => {
  83  |     test.beforeEach(async ({ page }) => {
  84  |       await login(page);
  85  |     });
  86  | 
  87  |     test('muestra Reportar conductor en historial si hay viajes completados', async ({ page }) => {
  88  |       await page.goto('/requests');
  89  |       await page.click('button:has-text("Historial")');
  90  | 
  91  |       const reportBtn = page.locator('button:has-text("Reportar conductor")').first();
  92  |       const hasCompleted = await reportBtn.isVisible({ timeout: 6000 }).catch(() => false);
  93  | 
  94  |       if (!hasCompleted) {
  95  |         test.skip();
  96  |         return;
  97  |       }
  98  | 
  99  |       await expect(reportBtn).toBeVisible();
  100 |     });
  101 | 
  102 |     test('Reportar conductor navega a /reports con userId y name en query', async ({ page }) => {
  103 |       await page.goto('/requests');
  104 |       await page.click('button:has-text("Historial")');
  105 | 
  106 |       const reportBtn = page.locator('button:has-text("Reportar conductor")').first();
```