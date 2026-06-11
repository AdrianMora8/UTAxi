import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', 'Password123!');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
}

test.describe('Create Trip - E2E', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/trips/new');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test.describe('authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should show the create trip form heading', async ({ page }) => {
      await page.goto('/trips/new');

      await expect(page.locator('text=/PLANEA TU/i')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('button:has-text("Publicar Viaje")')).toBeVisible();
    });

    test('should show campus picker with UTA campus options', async ({ page }) => {
      await page.goto('/trips/new');

      await expect(page.locator('button:has-text("Campus Huachi")')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('button:has-text("Campus Ingahurco")')).toBeVisible();
      await expect(page.locator('button:has-text("Campus Querochamba")')).toBeVisible();
    });

    test('should show destination field with search input', async ({ page }) => {
      await page.goto('/trips/new');

      await expect(
        page.locator('input[placeholder="Buscar calle, barrio, sector..."]')
      ).toBeVisible({ timeout: 8000 });
    });

    test('should show date, time, seats and price fields', async ({ page }) => {
      await page.goto('/trips/new');

      await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('input[type="time"]')).toBeVisible();
      await expect(page.locator('input[type="number"]').first()).toBeVisible();
    });

    test('should show campus validation error when submitting without campus', async ({ page }) => {
      await page.goto('/trips/new');

      // Llenar fecha y hora para que pase la validación Zod
      await page.locator('input[type="date"]').fill('2026-12-01');
      await page.locator('input[type="time"]').fill('08:00');
      await page.click('button:has-text("Publicar Viaje")');

      await expect(
        page.locator('text="Selecciona el campus de origen"')
      ).toBeVisible({ timeout: 8000 });
    });

    test('should show destination validation error when campus selected but no destination', async ({ page }) => {
      await page.goto('/trips/new');

      await page.click('button:has-text("Campus Huachi")');
      await page.locator('input[type="date"]').fill('2026-12-01');
      await page.locator('input[type="time"]').fill('08:00');
      await page.click('button:has-text("Publicar Viaje")');

      await expect(
        page.locator('text="Elige el destino en el mapa"')
      ).toBeVisible({ timeout: 8000 });
    });

    test('should show date validation error when date is empty', async ({ page }) => {
      await page.goto('/trips/new');

      await page.click('button:has-text("Campus Huachi")');
      await page.click('button:has-text("Publicar Viaje")');

      await expect(
        page.locator('text="Selecciona una fecha"')
      ).toBeVisible({ timeout: 8000 });
    });

    test('Cancelar button navigates back to /trips', async ({ page }) => {
      await page.goto('/trips/new');

      await page.click('button:has-text("Cancelar")');

      await expect(page).toHaveURL(/.*\/trips$/, { timeout: 8000 });
    });

    test('selecting a campus highlights it visually', async ({ page }) => {
      await page.goto('/trips/new');

      await page.click('button:has-text("Campus Huachi")');

      // El campus seleccionado muestra un check icon (material-symbols-outlined "check")
      const campusBtn = page.locator('button:has-text("Campus Huachi")');
      await expect(campusBtn).toBeVisible();
      // Verificar que el botón cambia estado (contiene el ícono check)
      await expect(campusBtn.locator('text="check"')).toBeVisible();
    });
  });
});
