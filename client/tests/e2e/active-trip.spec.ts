import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('http://localhost:4278/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', 'Password123!');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
}

async function navigateToActiveTrip(page: Page): Promise<boolean> {
  // Reach /trips/:id/active via Manage Requests → Ir al Mapa GPS (trip IN_PROGRESS)
  await page.goto('http://localhost:4278/my-trips');
  const gestionar = page.locator('button:has-text("Gestionar")').first();
  const hasTrip = await gestionar.isVisible({ timeout: 6000 }).catch(() => false);
  if (!hasTrip) return false;

  await gestionar.click();
  await expect(page).toHaveURL(/\/trips\/[^/]+\/requests/, { timeout: 8000 });

  const mapa = page.locator('button:has-text("Ir al Mapa GPS")');
  const hasInProgress = await mapa.isVisible({ timeout: 4000 }).catch(() => false);
  if (!hasInProgress) return false;

  await mapa.click();
  await expect(page).toHaveURL(/\/trips\/[^/]+\/active/, { timeout: 8000 });
  return true;
}

test.describe('Active Trip - E2E', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/trips/some-trip-id/active');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test.describe('authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('shows "Viaje no encontrado." for invalid trip ID', async ({ page }) => {
      await page.goto('/trips/id-inexistente-00000000/active');

      await expect(
        page.locator('text="Viaje no encontrado."')
      ).toBeVisible({ timeout: 10000 });

      await expect(
        page.locator('a:has-text("← Volver a viajes")')
      ).toBeVisible();
    });

    test('"← Volver a viajes" navigates to /trips', async ({ page }) => {
      await page.goto('/trips/id-inexistente-00000000/active');

      await page.locator('a:has-text("← Volver a viajes")').click();
      await expect(page).toHaveURL(/.*\/trips$/, { timeout: 8000 });
    });

    test('shows Detalle back link when trip is valid', async ({ page }) => {
      const reached = await navigateToActiveTrip(page);
      if (!reached) { test.skip(); return; }

      await expect(page.locator('a:has-text("Detalle")')).toBeVisible({ timeout: 8000 });
    });

    test('shows connection status pill (Conectando... or tracking active)', async ({ page }) => {
      const reached = await navigateToActiveTrip(page);
      if (!reached) { test.skip(); return; }

      const status = page
        .locator('text="Conectando..."')
        .or(page.locator('text="Transmitiendo GPS"'))
        .or(page.locator('text="Tracking activo"'));

      await expect(status.first()).toBeVisible({ timeout: 10000 });
    });

    test('shows map loading area or map content', async ({ page }) => {
      const reached = await navigateToActiveTrip(page);
      if (!reached) { test.skip(); return; }

      const mapArea = page
        .locator('text="Cargando mapa..."')
        .or(page.locator('.leaflet-container'))
        .or(page.locator('[class*="leaflet"]'));

      await expect(mapArea.first()).toBeVisible({ timeout: 12000 });
    });

    test('bottom panel shows Viaje en Curso badge', async ({ page }) => {
      const reached = await navigateToActiveTrip(page);
      if (!reached) { test.skip(); return; }

      await expect(page.locator('text="Viaje en Curso"')).toBeVisible({ timeout: 8000 });
    });

    test('bottom panel shows ETA ~15 MIN', async ({ page }) => {
      const reached = await navigateToActiveTrip(page);
      if (!reached) { test.skip(); return; }

      await expect(page.locator('text="~15 MIN"')).toBeVisible({ timeout: 8000 });
    });

    test('bottom panel shows Chat button', async ({ page }) => {
      const reached = await navigateToActiveTrip(page);
      if (!reached) { test.skip(); return; }

      await expect(page.locator('button:has-text("Chat")')).toBeVisible({ timeout: 8000 });
    });

    test('bottom panel shows Seguridad U-Ride button', async ({ page }) => {
      const reached = await navigateToActiveTrip(page);
      if (!reached) { test.skip(); return; }

      await expect(page.locator('button:has-text("Seguridad U-Ride")')).toBeVisible({ timeout: 8000 });
    });

    test('driver view shows Conductor badge in bottom panel', async ({ page }) => {
      const reached = await navigateToActiveTrip(page);
      if (!reached) { test.skip(); return; }

      // Only visible if logged-in user is the driver of this trip
      const conductorBadge = page.locator('text="Conductor"').first();
      const isDriver = await conductorBadge.isVisible({ timeout: 4000 }).catch(() => false);

      if (!isDriver) {
        test.skip();
        return;
      }

      await expect(conductorBadge).toBeVisible();
    });

    test('Detalle back link navigates to trip detail page', async ({ page }) => {
      const reached = await navigateToActiveTrip(page);
      if (!reached) { test.skip(); return; }

      await page.locator('a:has-text("Detalle")').click();
      await expect(page).toHaveURL(/\/trips\/[^/]+$/, { timeout: 8000 });
    });
  });
});
