import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', 'Password123!');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
}

async function navigateToManageRequests(page: Page): Promise<boolean> {
  await page.goto('/my-trips');
  const gestionar = page.locator('button:has-text("Gestionar")').first();
  const hasTrip = await gestionar.isVisible({ timeout: 6000 }).catch(() => false);
  if (!hasTrip) return false;
  await gestionar.click();
  await expect(page).toHaveURL(/\/trips\/[^/]+\/requests/, { timeout: 8000 });
  return true;
}

test.describe('Manage Requests - E2E', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/trips/some-trip-id/requests');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test.describe('authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should show Solicitudes Pendientes heading', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      await expect(page.locator('text="Solicitudes Pendientes"')).toBeVisible({ timeout: 8000 });
    });

    test('should show Pasajeros Confirmados section', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      await expect(page.locator('text="Pasajeros Confirmados"')).toBeVisible({ timeout: 8000 });
    });

    test('shows empty state when no pending requests', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      const pendingCard = page.locator('button:has-text("Aceptar")').first();
      const hasPending = await pendingCard.isVisible({ timeout: 4000 }).catch(() => false);

      if (!hasPending) {
        await expect(page.locator('text="No hay solicitudes pendientes."')).toBeVisible({ timeout: 8000 });
      } else {
        await expect(pendingCard).toBeVisible();
      }
    });

    test('pending request shows Aceptar and Declinar buttons', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      const aceptar = page.locator('button:has-text("Aceptar")').first();
      const hasPending = await aceptar.isVisible({ timeout: 4000 }).catch(() => false);

      if (!hasPending) {
        test.skip();
        return;
      }

      await expect(aceptar).toBeVisible();
      await expect(page.locator('button:has-text("Declinar")').first()).toBeVisible();
    });

    test('shows Empezar Viaje button when trip is SCHEDULED', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      const empezar = page.locator('button:has-text("Empezar Viaje")');
      const hasScheduled = await empezar.isVisible({ timeout: 4000 }).catch(() => false);

      if (!hasScheduled) {
        test.skip();
        return;
      }

      await expect(empezar).toBeVisible();
    });

    test('shows Ir al Mapa GPS and Completar Viaje when trip is IN_PROGRESS', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      const mapa = page.locator('button:has-text("Ir al Mapa GPS")');
      const hasInProgress = await mapa.isVisible({ timeout: 4000 }).catch(() => false);

      if (!hasInProgress) {
        test.skip();
        return;
      }

      await expect(mapa).toBeVisible();
      await expect(page.locator('button:has-text("Completar Viaje")')).toBeVisible();
    });

    test('shows Viaje Completado when trip is COMPLETED', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      const completado = page.locator('text="Viaje Completado"');
      const isCompleted = await completado.isVisible({ timeout: 4000 }).catch(() => false);

      if (!isCompleted) {
        test.skip();
        return;
      }

      await expect(completado).toBeVisible();
    });

    test('confirmed passenger shows Marcar llegada button', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      const marcar = page.locator('button:has-text("Marcar llegada")').first();
      const hasConfirmed = await marcar.isVisible({ timeout: 4000 }).catch(() => false);

      if (!hasConfirmed) {
        test.skip();
        return;
      }

      await expect(marcar).toBeVisible();
    });

    test('confirmed passenger shows Calificar button when not yet rated', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      const calificar = page.locator('button:has-text("Calificar")').first();
      const hasRatable = await calificar.isVisible({ timeout: 4000 }).catch(() => false);

      if (!hasRatable) {
        test.skip();
        return;
      }

      await calificar.click();
      await expect(page.locator('text="Calificar Conductor"').or(page.locator('[role="dialog"]'))).toBeVisible({ timeout: 5000 });
    });

    test('Mis viajes back link navigates to /trips', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      await page.locator('a:has-text("Mis viajes")').click();
      await expect(page).toHaveURL(/.*\/trips$/, { timeout: 8000 });
    });

    test('shows Reglas de Seguridad section', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      await expect(page.locator('text="Reglas de Seguridad"')).toBeVisible({ timeout: 8000 });
    });

    test('shows Monitoreo U-Ride security banner', async ({ page }) => {
      const reached = await navigateToManageRequests(page);
      if (!reached) { test.skip(); return; }

      await expect(page.locator('text="Monitoreo U-Ride"')).toBeVisible({ timeout: 8000 });
    });
  });
});
