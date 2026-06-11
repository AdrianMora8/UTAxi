import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'admin@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', '123456');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*\/admin/, { timeout: 50000 });
}

async function loginAsStudent(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', 'Password123!');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 50000 });
}

test.describe('Admin — Gestión de Reportes - E2E', () => {
  test('redirige a login si no está autenticado', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test('bloquea acceso a un usuario no-admin', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/admin');
    // debe redirigir o mostrar error de acceso
    await expect(page).not.toHaveURL(/.*\/admin$/, { timeout: 5000 });
  });

  test.describe('panel admin autenticado', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('muestra el Dashboard Admin con sidebar', async ({ page }) => {
      await expect(page.locator('text="Dashboard"')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('text="Admin Panel"')).toBeVisible();
    });

    test('muestra los 4 tabs de navegación en el sidebar', async ({ page }) => {
      await expect(page.locator('button:has-text("Reportes")')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('button:has-text("Usuarios")')).toBeVisible();
      await expect(page.locator('button:has-text("Viajes")')).toBeVisible();
      await expect(page.locator('button:has-text("Trazabilidad")')).toBeVisible();
    });

    test('muestra las 4 stat cards', async ({ page }) => {
      await expect(page.locator('text="Reportes Abiertos"')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('text="Usuarios Activos"')).toBeVisible();
      await expect(page.locator('text="Viajes Completados"')).toBeVisible();
      await expect(page.locator('text="Reputación Promedio"')).toBeVisible();
    });

    // ── Tab Reportes ────────────────────────────────────────────────

    test('tab Reportes está activo por defecto y muestra "Gestión de Reportes"', async ({ page }) => {
      await expect(page.locator('text="Gestión de Reportes"')).toBeVisible({ timeout: 8000 });
    });

    test('muestra el dropdown de filtro de estado en el header', async ({ page }) => {
      const select = page.locator('select').first();
      await expect(select).toBeVisible({ timeout: 8000 });

      const options = await select.locator('option').allTextContents();
      expect(options).toContain('Todos los reportes');
      expect(options).toContain('Abiertos');
      expect(options).toContain('Revisados');
      expect(options).toContain('Resueltos');
    });

    test('muestra la lista de reportes o estado vacío', async ({ page }) => {
      const content = page
        .locator('text="No hay reportes pendientes."')
        .or(page.locator('button:has-text("Review")').first());
      await expect(content.first()).toBeVisible({ timeout: 20000 });
    });

    test('filtrar por Abiertos recarga la lista de reportes', async ({ page }) => {
      await page.waitForTimeout(500); // espera que cargue la lista inicial
      const select = page.locator('select').first();
      await select.selectOption('OPEN');
      // el texto de reportes en total se actualiza
      await expect(page.locator('text=/reportes en total/')).toBeVisible({ timeout: 8000 });
    });

    test('filtrar por Resueltos recarga la lista', async ({ page }) => {
      const select = page.locator('select').first();
      await select.selectOption('RESOLVED');
      await expect(page.locator('text=/reportes en total/')).toBeVisible({ timeout: 8000 });
    });

    test('muestra el modal de revisión al hacer clic en Review', async ({ page }) => {
      const reviewBtn = page.locator('button:has-text("Review")').first();
      const hasReports = await reviewBtn.isVisible({ timeout: 8000 }).catch(() => false);

      if (!hasReports) {
        test.skip();
        return;
      }

      await reviewBtn.click();
      await expect(page.locator('text="Revisar Reporte"')).toBeVisible({ timeout: 5000 });
    });

    test('ReviewModal muestra las 3 acciones disponibles', async ({ page }) => {
      const reviewBtn = page.locator('button:has-text("Review")').first();
      const hasReports = await reviewBtn.isVisible({ timeout: 8000 }).catch(() => false);

      if (!hasReports) {
        test.skip();
        return;
      }

      await reviewBtn.click();
      await expect(page.locator('text="Revisar Reporte"')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('button:has-text("Advertir")')).toBeVisible();
      await expect(page.locator('button:has-text("Suspender")')).toBeVisible();
      await expect(page.locator('button:has-text("Desestimar")')).toBeVisible();
    });

    test('ReviewModal se cierra al hacer clic en el backdrop', async ({ page }) => {
      const reviewBtn = page.locator('button:has-text("Review")').first();
      const hasReports = await reviewBtn.isVisible({ timeout: 8000 }).catch(() => false);

      if (!hasReports) {
        test.skip();
        return;
      }

      await reviewBtn.click();
      await expect(page.locator('text="Revisar Reporte"')).toBeVisible({ timeout: 5000 });

      // clic en el backdrop (fuera del panel)
      await page.mouse.click(10, 300);
      await expect(page.locator('text="Revisar Reporte"')).not.toBeVisible({ timeout: 5000 });
    });

    test('flujo completo: revisar un reporte con acción DISMISSED', async ({ page }) => {
      const reviewBtn = page.locator('button:has-text("Review")').first();
      const hasReports = await reviewBtn.isVisible({ timeout: 8000 }).catch(() => false);

      if (!hasReports) {
        test.skip();
        return;
      }

      await reviewBtn.click();
      await expect(page.locator('text="Revisar Reporte"')).toBeVisible({ timeout: 5000 });

      await page.click('button:has-text("Desestimar")');
      await page.click('button:has-text("Confirmar Acción")');

      // el modal se cierra tras confirmación
      await expect(page.locator('text="Revisar Reporte"')).not.toBeVisible({ timeout: 8000 });
    });

    // ── Tab Usuarios ────────────────────────────────────────────────

    test('tab Usuarios carga la lista de usuarios', async ({ page }) => {
      await page.click('button:has-text("Usuarios")');
      await expect(page.locator('input[placeholder="Buscar usuario..."]')).toBeVisible({ timeout: 8000 });
    });

    test('búsqueda de usuario filtra la lista', async ({ page }) => {
      await page.click('button:has-text("Usuarios")');
      await page.fill('input[placeholder="Buscar usuario..."]', 'admin');
      // espera que la query se actualice
      await page.waitForTimeout(600);
      const contenido = page.locator('text="Administrador UTAxi"').or(
        page.locator('text=/0 usuarios encontrados/')
      );
      await expect(contenido.first()).toBeVisible({ timeout: 8000 });
    });

    // ── Tab Trazabilidad ────────────────────────────────────────────

    test('tab Trazabilidad muestra eventos del sistema', async ({ page }) => {
      await page.click('button:has-text("Trazabilidad")');
      const contenido = page.locator('text=/eventos en total/').or(
        page.locator('text=/No hay eventos/')
      );
      await expect(contenido.first()).toBeVisible({ timeout: 10000 });
    });

    // ── Cerrar sesión ───────────────────────────────────────────────

    test('Cerrar Sesión redirige al login', async ({ page }) => {
      await page.click('button:has-text("Cerrar Sesión")');
      await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
    });
  });
});
