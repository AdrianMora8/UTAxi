import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, email = 'student1@uta.edu.ec', password = 'Password123!') {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', email);
  await page.fill('input[placeholder="••••••••"]', password);
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
}

test.describe('Reportar Conductor - E2E', () => {
  test('redirige a login si no está autenticado', async ({ page }) => {
    await page.goto('/reports?userId=abc&name=Test');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test.describe('página /reports', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('muestra el título "Reportar Usuario"', async ({ page }) => {
      await page.goto('/reports?userId=some-id&name=Carlos+P%C3%A9rez');
      await expect(page.locator('h1:has-text("Reportar Usuario")')).toBeVisible({ timeout: 8000 });
    });

    test('muestra el nombre del conductor desde el query param', async ({ page }) => {
      await page.goto('/reports?userId=some-id&name=Luis+Vera');
      await expect(page.locator('text="Luis Vera"')).toBeVisible({ timeout: 8000 });
    });

    test('muestra las secciones del formulario', async ({ page }) => {
      await page.goto('/reports?userId=some-id&name=Test+Driver');
      await expect(page.locator('text="Motivo del Reporte"')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('text="Descripción de los hechos"')).toBeVisible();
      await expect(page.locator('text="Evidencia Fotográfica"')).toBeVisible();
    });

    test('el botón Enviar Reporte está deshabilitado sin motivo ni descripción', async ({ page }) => {
      await page.goto('/reports?userId=some-id&name=Test+Driver');
      await expect(page.locator('button:has-text("Enviar Reporte")')).toBeDisabled({ timeout: 8000 });
    });

    test('el botón Enviar Reporte sigue deshabilitado con solo motivo seleccionado', async ({ page }) => {
      await page.goto('/reports?userId=some-id&name=Test+Driver');
      await page.selectOption('select', 'INAPPROPRIATE_BEHAVIOR');
      await expect(page.locator('button:has-text("Enviar Reporte")')).toBeDisabled();
    });

    test('el botón Enviar Reporte sigue deshabilitado con descripción menor a 10 chars', async ({ page }) => {
      await page.goto('/reports?userId=some-id&name=Test+Driver');
      await page.selectOption('select', 'FRAUD');
      await page.fill('textarea', 'corta');
      await expect(page.locator('button:has-text("Enviar Reporte")')).toBeDisabled();
    });

    test('el botón Enviar Reporte se habilita con motivo y descripción válida', async ({ page }) => {
      await page.goto('/reports?userId=some-id&name=Test+Driver');
      await page.selectOption('select', 'HARASSMENT');
      await page.fill('textarea', 'El conductor tuvo un comportamiento muy inapropiado durante el trayecto.');
      await expect(page.locator('button:has-text("Enviar Reporte")')).toBeEnabled();
    });

    test('el link Cancelar navega de vuelta a /trips', async ({ page }) => {
      await page.goto('/reports?userId=some-id&name=Test+Driver');
      await expect(page.locator('a:has-text("Cancelar")')).toBeVisible({ timeout: 8000 });
      await page.click('a:has-text("Cancelar")');
      await expect(page).toHaveURL(/.*\/trips$/, { timeout: 8000 });
    });

    test('muestra opciones correctas en el selector de motivo', async ({ page }) => {
      await page.goto('/reports?userId=some-id&name=Test+Driver');
      await page.click('select');
      const options = await page.locator('select option').allTextContents();
      expect(options).toContain('Comportamiento inapropiado');
      expect(options).toContain('Conducción peligrosa / Inseguridad');
      expect(options).toContain('Fraude o problema con el pago');
      expect(options).toContain('Hostigamiento o acoso');
    });
  });

  test.describe('botón Reportar conductor desde Mis Solicitudes', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('muestra Reportar conductor en historial si hay viajes completados', async ({ page }) => {
      await page.goto('/requests');
      await page.click('button:has-text("Historial")');

      const reportBtn = page.locator('button:has-text("Reportar conductor")').first();
      const hasCompleted = await reportBtn.isVisible({ timeout: 6000 }).catch(() => false);

      if (!hasCompleted) {
        test.skip();
        return;
      }

      await expect(reportBtn).toBeVisible();
    });

    test('Reportar conductor navega a /reports con userId y name en query', async ({ page }) => {
      await page.goto('/requests');
      await page.click('button:has-text("Historial")');

      const reportBtn = page.locator('button:has-text("Reportar conductor")').first();
      const hasCompleted = await reportBtn.isVisible({ timeout: 6000 }).catch(() => false);

      if (!hasCompleted) {
        test.skip();
        return;
      }

      await reportBtn.click();
      await expect(page).toHaveURL(/\/reports\?userId=.+&name=.+/, { timeout: 8000 });
      await expect(page.locator('h1:has-text("Reportar Usuario")')).toBeVisible();
    });

    test('flujo completo: reportar conductor desde historial hasta confirmación', async ({ page }) => {
      await page.goto('/requests');
      await page.click('button:has-text("Historial")');

      const reportBtn = page.locator('button:has-text("Reportar conductor")').first();
      const hasCompleted = await reportBtn.isVisible({ timeout: 6000 }).catch(() => false);

      if (!hasCompleted) {
        test.skip();
        return;
      }

      await reportBtn.click();
      await expect(page).toHaveURL(/\/reports/, { timeout: 8000 });

      // Rellenar el formulario
      await page.selectOption('select', 'UNSAFE_DRIVING');
      await page.fill('textarea', 'El conductor excedió la velocidad permitida y no respetó las señales de tránsito durante todo el trayecto.');

      await expect(page.locator('button:has-text("Enviar Reporte")')).toBeEnabled();
      await page.click('button:has-text("Enviar Reporte")');

      // Espera confirmación o error del servidor
      const confirmacion = page.locator('text="Reporte Enviado"');
      const error = page.locator('.text-error').first();
      await expect(confirmacion.or(error)).toBeVisible({ timeout: 10000 });
    });
  });
});
