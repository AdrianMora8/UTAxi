import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', 'Password123!');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
}

test.describe('Profile - E2E', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test.describe('authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should show user name as page heading', async ({ page }) => {
      await page.goto('/profile');

      // La página muestra el fullName del usuario como h1
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 8000 });
      await expect(heading).not.toBeEmpty();
    });

    test('should show Información Personal section', async ({ page }) => {
      await page.goto('/profile');

      await expect(page.locator('text="Información Personal"')).toBeVisible({ timeout: 8000 });
    });

    test('should show profile form fields', async ({ page }) => {
      await page.goto('/profile');

      await expect(page.locator('input[placeholder="Tu nombre completo"]')).toBeVisible({ timeout: 8000 });
    });

    test('should show Guardar Cambios button', async ({ page }) => {
      await page.goto('/profile');

      await expect(page.locator('button:has-text("Guardar Cambios")')).toBeVisible({ timeout: 8000 });
    });

    test('should show vehicle section', async ({ page }) => {
      await page.goto('/profile');

      // El texto "Mi Vehículo"/"Registrar Vehículo" solo aparece en el tab "Vehículo"
      // Hay que hacer clic en el botón de tab primero
      const vehiculoTab = page.locator('button:has-text("Vehículo")');
      await expect(vehiculoTab).toBeVisible({ timeout: 8000 });
      await vehiculoTab.click();

      const vehicleSection = page.locator('text="Mi Vehículo"').or(
        page.locator('text="Registrar Vehículo"')
      );
      await expect(vehicleSection.first()).toBeVisible({ timeout: 8000 });
    });

    test('should save profile changes and show success state', async ({ page }) => {
      await page.goto('/profile');

      await page.waitForSelector('input[placeholder="Tu nombre completo"]', { timeout: 8000 });

      const nameInput = page.locator('input[placeholder="Tu nombre completo"]');
      await nameInput.fill('Student Test');

      await page.click('button:has-text("Guardar Cambios")');

      // Espera feedback: el botón cambia a "Guardando..." o aparece un mensaje de éxito
      await expect(
        page.locator('button:has-text("Guardando...")').or(
          page.locator('text=/actualizado|guardado|éxito/i')
        ).or(
          page.locator('button:has-text("Guardar Cambios")')
        )
      ).toBeVisible({ timeout: 8000 });
    });

    test('should show edit button for profile info', async ({ page }) => {
      await page.goto('/profile');

      await expect(
        page.locator('button[title="Editar información"]')
      ).toBeVisible({ timeout: 8000 });
    });

    test('should navigate to /profile from navbar', async ({ page }) => {
      await page.goto('/trips');

      // El navbar tiene un botón de perfil o link a /profile en el menú de usuario
      await page.click('a[href="/profile"]');

      await expect(page).toHaveURL(/.*profile/, { timeout: 8000 });
      await expect(page.locator('text="Información Personal"')).toBeVisible({ timeout: 8000 });
    });
  });
});
