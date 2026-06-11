# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: create-trip.spec.ts >> Create Trip - E2E >> authenticated >> should show date, time, seats and price fields
- Location: tests\e2e\create-trip.spec.ts:45:5

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
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | async function login(page: Page) {
  4   |   await page.goto('/login');
  5   |   await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  6   |   await page.fill('input[placeholder="••••••••"]', 'Password123!');
> 7   |   await page.click('button:has-text("Iniciar Sesión")');
      |              ^ Error: page.click: Target page, context or browser has been closed
  8   |   await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
  9   | }
  10  | 
  11  | test.describe('Create Trip - E2E', () => {
  12  |   test('should redirect to login when not authenticated', async ({ page }) => {
  13  |     await page.goto('/trips/new');
  14  |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  15  |   });
  16  | 
  17  |   test.describe('authenticated', () => {
  18  |     test.beforeEach(async ({ page }) => {
  19  |       await login(page);
  20  |     });
  21  | 
  22  |     test('should show the create trip form heading', async ({ page }) => {
  23  |       await page.goto('/trips/new');
  24  | 
  25  |       await expect(page.locator('text=/PLANEA TU/i')).toBeVisible({ timeout: 8000 });
  26  |       await expect(page.locator('button:has-text("Publicar Viaje")')).toBeVisible();
  27  |     });
  28  | 
  29  |     test('should show campus picker with UTA campus options', async ({ page }) => {
  30  |       await page.goto('/trips/new');
  31  | 
  32  |       await expect(page.locator('button:has-text("Campus Huachi")')).toBeVisible({ timeout: 8000 });
  33  |       await expect(page.locator('button:has-text("Campus Ingahurco")')).toBeVisible();
  34  |       await expect(page.locator('button:has-text("Campus Querochamba")')).toBeVisible();
  35  |     });
  36  | 
  37  |     test('should show destination field with search input', async ({ page }) => {
  38  |       await page.goto('/trips/new');
  39  | 
  40  |       await expect(
  41  |         page.locator('input[placeholder="Buscar calle, barrio, sector..."]')
  42  |       ).toBeVisible({ timeout: 8000 });
  43  |     });
  44  | 
  45  |     test('should show date, time, seats and price fields', async ({ page }) => {
  46  |       await page.goto('/trips/new');
  47  | 
  48  |       await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 8000 });
  49  |       await expect(page.locator('input[type="time"]')).toBeVisible();
  50  |       await expect(page.locator('input[type="number"]').first()).toBeVisible();
  51  |     });
  52  | 
  53  |     test('should show campus validation error when submitting without campus', async ({ page }) => {
  54  |       await page.goto('/trips/new');
  55  | 
  56  |       // Llenar fecha y hora para que pase la validación Zod
  57  |       await page.locator('input[type="date"]').fill('2026-12-01');
  58  |       await page.locator('input[type="time"]').fill('08:00');
  59  |       await page.click('button:has-text("Publicar Viaje")');
  60  | 
  61  |       await expect(
  62  |         page.locator('text="Selecciona el campus de origen"')
  63  |       ).toBeVisible({ timeout: 8000 });
  64  |     });
  65  | 
  66  |     test('should show destination validation error when campus selected but no destination', async ({ page }) => {
  67  |       await page.goto('/trips/new');
  68  | 
  69  |       await page.click('button:has-text("Campus Huachi")');
  70  |       await page.locator('input[type="date"]').fill('2026-12-01');
  71  |       await page.locator('input[type="time"]').fill('08:00');
  72  |       await page.click('button:has-text("Publicar Viaje")');
  73  | 
  74  |       await expect(
  75  |         page.locator('text="Elige el destino en el mapa"')
  76  |       ).toBeVisible({ timeout: 8000 });
  77  |     });
  78  | 
  79  |     test('should show date validation error when date is empty', async ({ page }) => {
  80  |       await page.goto('/trips/new');
  81  | 
  82  |       await page.click('button:has-text("Campus Huachi")');
  83  |       await page.click('button:has-text("Publicar Viaje")');
  84  | 
  85  |       await expect(
  86  |         page.locator('text="Selecciona una fecha"')
  87  |       ).toBeVisible({ timeout: 8000 });
  88  |     });
  89  | 
  90  |     test('Cancelar button navigates back to /trips', async ({ page }) => {
  91  |       await page.goto('/trips/new');
  92  | 
  93  |       await page.click('button:has-text("Cancelar")');
  94  | 
  95  |       await expect(page).toHaveURL(/.*\/trips$/, { timeout: 8000 });
  96  |     });
  97  | 
  98  |     test('selecting a campus highlights it visually', async ({ page }) => {
  99  |       await page.goto('/trips/new');
  100 | 
  101 |       await page.click('button:has-text("Campus Huachi")');
  102 | 
  103 |       // El campus seleccionado muestra un check icon (material-symbols-outlined "check")
  104 |       const campusBtn = page.locator('button:has-text("Campus Huachi")');
  105 |       await expect(campusBtn).toBeVisible();
  106 |       // Verificar que el botón cambia estado (contiene el ícono check)
  107 |       await expect(campusBtn.locator('text="check"')).toBeVisible();
```