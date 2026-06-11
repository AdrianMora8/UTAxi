import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', 'Password123!');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
}

test.describe('Payment - E2E', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/pay/some-request-id');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test.describe('authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('shows "Solicitud no encontrada" for invalid request ID', async ({ page }) => {
      await page.goto('/pay/id-inexistente-00000000');

      await expect(
        page.locator('text="Solicitud no encontrada."')
      ).toBeVisible({ timeout: 10000 });

      await expect(
        page.locator('a:has-text("← Volver a mis solicitudes")')
      ).toBeVisible();
    });

    test('"Volver a mis solicitudes" link navigates to /requests', async ({ page }) => {
      await page.goto('/pay/id-inexistente-00000000');

      await page.locator('a:has-text("← Volver a mis solicitudes")').click();

      await expect(page).toHaveURL(/.*requests/, { timeout: 8000 });
    });

    test('payment page shows Confirmar Pago heading and card form', async ({ page }) => {
      // Navegar desde /requests si hay un request ACCEPTED sin pagar
      await page.goto('/requests');
      const payBtn = page.locator('button:has-text("Pagar Ahora")').first();
      const hasPayButton = await payBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasPayButton) {
        test.skip();
        return;
      }

      await payBtn.click();
      await expect(page).toHaveURL(/\/pay\//, { timeout: 8000 });

      await expect(page.locator('h1:has-text("Confirmar Pago")')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('text="Número de Tarjeta"')).toBeVisible();
      await expect(page.locator('text="Titular de la Tarjeta"')).toBeVisible();
      await expect(page.locator('text="Vencimiento"')).toBeVisible();
      await expect(page.locator('text="CVV"')).toBeVisible();
    });

    test('payment page shows Confirmar Pago button and Cancelar Transacción link', async ({ page }) => {
      await page.goto('/requests');
      const payBtn = page.locator('button:has-text("Pagar Ahora")').first();
      const hasPayButton = await payBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasPayButton) {
        test.skip();
        return;
      }

      await payBtn.click();
      await expect(page).toHaveURL(/\/pay\//, { timeout: 8000 });

      await expect(page.locator('button:has-text("Confirmar Pago")')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('a:has-text("Cancelar Transacción")')).toBeVisible();
    });

    test('payment page shows demo disclaimer', async ({ page }) => {
      await page.goto('/requests');
      const payBtn = page.locator('button:has-text("Pagar Ahora")').first();
      const hasPayButton = await payBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasPayButton) {
        test.skip();
        return;
      }

      await payBtn.click();
      await expect(page).toHaveURL(/\/pay\//, { timeout: 8000 });

      await expect(
        page.locator('text=/Entorno de demostración/i')
      ).toBeVisible({ timeout: 8000 });
    });

    test('Cancelar Transacción navigates back to /requests', async ({ page }) => {
      await page.goto('/requests');
      const payBtn = page.locator('button:has-text("Pagar Ahora")').first();
      const hasPayButton = await payBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasPayButton) {
        test.skip();
        return;
      }

      await payBtn.click();
      await expect(page).toHaveURL(/\/pay\//, { timeout: 8000 });

      await page.locator('a:has-text("Cancelar Transacción")').click();
      await expect(page).toHaveURL(/.*requests/, { timeout: 8000 });
    });

    test('confirming payment shows ¡Pago Confirmado! and redirects', async ({ page }) => {
      await page.goto('/requests');
      const payBtn = page.locator('button:has-text("Pagar Ahora")').first();
      const hasPayButton = await payBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasPayButton) {
        test.skip();
        return;
      }

      await payBtn.click();
      await expect(page).toHaveURL(/\/pay\//, { timeout: 8000 });
      await expect(page.locator('button:has-text("Confirmar Pago")')).toBeVisible({ timeout: 8000 });

      await page.click('button:has-text("Confirmar Pago")');

      await expect(
        page.locator('h1:has-text("¡Pago Confirmado!")')
      ).toBeVisible({ timeout: 10000 });

      // Redirige automáticamente a /requests tras 3 segundos
      await expect(page).toHaveURL(/.*requests/, { timeout: 8000 });
    });
  });
});
