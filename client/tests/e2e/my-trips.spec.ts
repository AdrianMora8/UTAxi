import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', 'Password123!');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
}

test.describe('My Trips - E2E', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/my-trips');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test.describe('authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should show Mis Viajes heading and Panel del Conductor', async ({ page }) => {
      await page.goto('/my-trips');

      await expect(page.locator('text="Mis Viajes"').first()).toBeVisible({ timeout: 8000 });
      await expect(page.locator('text="Panel del Conductor"')).toBeVisible();
    });

    test('should show Activos and Completados tab buttons', async ({ page }) => {
      await page.goto('/my-trips');

      await expect(page.locator('button:has-text("Activos")')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('button:has-text("Completados")')).toBeVisible();
    });

    test('should show Publicar Viaje link in header', async ({ page }) => {
      await page.goto('/my-trips');

      await expect(
        page.locator('a[href="/trips/new"]:has-text("Publicar")')
      ).toBeVisible({ timeout: 8000 });
    });

    test('Activos tab: shows trips or empty state "Sin viajes activos"', async ({ page }) => {
      await page.goto('/my-trips');

      await page.click('button:has-text("Activos")');

      const content = page.locator('text="Sin viajes activos"').or(
        page.locator('text="Origen"')
      );
      await expect(content.first()).toBeVisible({ timeout: 10000 });
    });

    test('Completados tab: shows "Sin viajes completados" or completed trips', async ({ page }) => {
      await page.goto('/my-trips');

      await page.click('button:has-text("Completados")');

      const content = page.locator('text="Sin viajes completados"').or(
        page.locator('text="COMPLETADO"')
      );
      await expect(content.first()).toBeVisible({ timeout: 8000 });
    });

    test('empty state Activos shows Publicar Viaje link', async ({ page }) => {
      await page.goto('/my-trips');
      await page.click('button:has-text("Activos")');

      const emptyState = page.locator('text="Sin viajes activos"');
      const hasTripCards = await page.locator('text="Origen"').count();

      if (hasTripCards === 0) {
        await expect(emptyState).toBeVisible({ timeout: 8000 });
        await expect(page.locator('a[href="/trips/new"]:has-text("Publicar Viaje")').last()).toBeVisible();
      } else {
        // hay viajes activos — solo verificamos que cargaron
        await expect(page.locator('text="Origen"').first()).toBeVisible();
      }
    });

    test('clicking Gestionar in a trip row navigates to requests page', async ({ page }) => {
      await page.goto('/my-trips');

      const gestionar = page.locator('button:has-text("Gestionar")').first();
      const hasTrips = await gestionar.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasTrips) {
        await gestionar.click();
        await expect(page).toHaveURL(/\/trips\/[^/]+\/requests/, { timeout: 8000 });
        await expect(page.locator('text="Solicitudes Pendientes"')).toBeVisible({ timeout: 8000 });
      } else {
        test.skip();
      }
    });
  });
});
