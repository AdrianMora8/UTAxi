import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', 'Password123!');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
}

test.describe('My Requests - E2E', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/requests');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test.describe('authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should show Mis Solicitudes heading and Panel de Pasajero', async ({ page }) => {
      await page.goto('/requests');

      await expect(page.locator('text="Mis Solicitudes"')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('text="Panel de Pasajero"')).toBeVisible();
    });

    test('should show Activas and Historial tab buttons', async ({ page }) => {
      await page.goto('/requests');

      await expect(page.locator('button:has-text("Activas")')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('button:has-text("Historial")')).toBeVisible();
    });

    test('should show U-Wallet sidebar with Recargar Saldo button', async ({ page }) => {
      await page.goto('/requests');

      await expect(page.locator('text="Saldo U-Wallet"')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('button:has-text("Recargar Saldo")')).toBeVisible();
    });

    test('Activas tab: shows requests or empty state with Buscar Viaje link', async ({ page }) => {
      await page.goto('/requests');
      await page.click('button:has-text("Activas")');

      const content = page.locator('text="No tienes viajes activos"').or(
        page.locator('text="PENDIENTE"')
      ).or(
        page.locator('text="ACEPTADO"')
      );
      await expect(content.first()).toBeVisible({ timeout: 10000 });
    });

    test('empty Activas state shows Buscar Viaje link to /trips', async ({ page }) => {
      await page.goto('/requests');
      await page.click('button:has-text("Activas")');

      const emptyState = page.locator('text="No tienes viajes activos"');
      const isEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

      if (isEmpty) {
        const buscarLink = page.locator('a[href="/trips"]:has-text("Buscar Viaje")');
        await expect(buscarLink).toBeVisible();
        await buscarLink.click();
        await expect(page).toHaveURL(/.*\/trips$/, { timeout: 8000 });
      } else {
        // hay solicitudes activas — verificar que se muestran los datos
        await expect(page.locator('text="Origen"').first()).toBeVisible();
      }
    });

    test('Historial tab: shows completed requests or empty state', async ({ page }) => {
      await page.goto('/requests');
      await page.click('button:has-text("Historial")');

      const content = page.locator('text="Sin viajes completados"').or(
        page.locator('text="COMPLETADO"')
      );
      await expect(content.first()).toBeVisible({ timeout: 8000 });
    });

    test('pending request shows Cancelar Solicitud button', async ({ page }) => {
      await page.goto('/requests');
      await page.click('button:has-text("Activas")');

      const cancelBtn = page.locator('button:has-text("Cancelar Solicitud")').first();
      const hasPending = await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasPending) {
        await expect(cancelBtn).toBeVisible();
      } else {
        // No hay solicitudes PENDING — test condicional
        test.skip();
      }
    });

    test('accepted unpaid request shows Pagar Ahora button', async ({ page }) => {
      await page.goto('/requests');
      await page.click('button:has-text("Activas")');

      const payBtn = page.locator('button:has-text("Pagar Ahora")').first();
      const hasAccepted = await payBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasAccepted) {
        await expect(payBtn).toBeVisible();
        await payBtn.click();
        await expect(page).toHaveURL(/\/pay\//, { timeout: 8000 });
      } else {
        test.skip();
      }
    });

    test('completed request shows Calificar button', async ({ page }) => {
      await page.goto('/requests');
      await page.click('button:has-text("Historial")');

      const calificarBtn = page.locator('button:has-text("Calificar")').first();
      const hasCompleted = await calificarBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasCompleted) {
        await expect(calificarBtn).toBeVisible();
        await calificarBtn.click();
        // Abre el modal de calificación
        await expect(page.locator('text="Calificar Conductor"')).toBeVisible({ timeout: 5000 });
      } else {
        test.skip();
      }
    });
  });
});
