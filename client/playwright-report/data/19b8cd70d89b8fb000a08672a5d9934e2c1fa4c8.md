# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile.spec.ts >> Profile - E2E >> authenticated >> should navigate to /profile from navbar
- Location: tests\e2e\profile.spec.ts:92:5

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
  11  | test.describe('Profile - E2E', () => {
  12  |   test('should redirect to login when not authenticated', async ({ page }) => {
  13  |     await page.goto('/profile');
  14  |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  15  |   });
  16  | 
  17  |   test.describe('authenticated', () => {
  18  |     test.beforeEach(async ({ page }) => {
  19  |       await login(page);
  20  |     });
  21  | 
  22  |     test('should show user name as page heading', async ({ page }) => {
  23  |       await page.goto('/profile');
  24  | 
  25  |       // La página muestra el fullName del usuario como h1
  26  |       const heading = page.locator('h1').first();
  27  |       await expect(heading).toBeVisible({ timeout: 8000 });
  28  |       await expect(heading).not.toBeEmpty();
  29  |     });
  30  | 
  31  |     test('should show Información Personal section', async ({ page }) => {
  32  |       await page.goto('/profile');
  33  | 
  34  |       await expect(page.locator('text="Información Personal"')).toBeVisible({ timeout: 8000 });
  35  |     });
  36  | 
  37  |     test('should show profile form fields', async ({ page }) => {
  38  |       await page.goto('/profile');
  39  | 
  40  |       await expect(page.locator('input[placeholder="Tu nombre completo"]')).toBeVisible({ timeout: 8000 });
  41  |     });
  42  | 
  43  |     test('should show Guardar Cambios button', async ({ page }) => {
  44  |       await page.goto('/profile');
  45  | 
  46  |       await expect(page.locator('button:has-text("Guardar Cambios")')).toBeVisible({ timeout: 8000 });
  47  |     });
  48  | 
  49  |     test('should show vehicle section', async ({ page }) => {
  50  |       await page.goto('/profile');
  51  | 
  52  |       // El texto "Mi Vehículo"/"Registrar Vehículo" solo aparece en el tab "Vehículo"
  53  |       // Hay que hacer clic en el botón de tab primero
  54  |       const vehiculoTab = page.locator('button:has-text("Vehículo")');
  55  |       await expect(vehiculoTab).toBeVisible({ timeout: 8000 });
  56  |       await vehiculoTab.click();
  57  | 
  58  |       const vehicleSection = page.locator('text="Mi Vehículo"').or(
  59  |         page.locator('text="Registrar Vehículo"')
  60  |       );
  61  |       await expect(vehicleSection.first()).toBeVisible({ timeout: 8000 });
  62  |     });
  63  | 
  64  |     test('should save profile changes and show success state', async ({ page }) => {
  65  |       await page.goto('/profile');
  66  | 
  67  |       await page.waitForSelector('input[placeholder="Tu nombre completo"]', { timeout: 8000 });
  68  | 
  69  |       const nameInput = page.locator('input[placeholder="Tu nombre completo"]');
  70  |       await nameInput.fill('Student Test');
  71  | 
  72  |       await page.click('button:has-text("Guardar Cambios")');
  73  | 
  74  |       // Espera feedback: el botón cambia a "Guardando..." o aparece un mensaje de éxito
  75  |       await expect(
  76  |         page.locator('button:has-text("Guardando...")').or(
  77  |           page.locator('text=/actualizado|guardado|éxito/i')
  78  |         ).or(
  79  |           page.locator('button:has-text("Guardar Cambios")')
  80  |         )
  81  |       ).toBeVisible({ timeout: 8000 });
  82  |     });
  83  | 
  84  |     test('should show edit button for profile info', async ({ page }) => {
  85  |       await page.goto('/profile');
  86  | 
  87  |       await expect(
  88  |         page.locator('button[title="Editar información"]')
  89  |       ).toBeVisible({ timeout: 8000 });
  90  |     });
  91  | 
  92  |     test('should navigate to /profile from navbar', async ({ page }) => {
  93  |       await page.goto('/trips');
  94  | 
  95  |       // El navbar tiene un botón de perfil o link a /profile en el menú de usuario
  96  |       await page.click('a[href="/profile"]');
  97  | 
  98  |       await expect(page).toHaveURL(/.*profile/, { timeout: 8000 });
  99  |       await expect(page.locator('text="Información Personal"')).toBeVisible({ timeout: 8000 });
  100 |     });
  101 |   });
  102 | });
  103 | 
```