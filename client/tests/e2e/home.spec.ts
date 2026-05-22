import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', 'Password123!');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
}

test.describe('Home / - E2E', () => {
  test('unauthenticated: / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test('authenticated: / redirects to /trips', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await expect(page).toHaveURL(/.*trips/, { timeout: 8000 });
  });

  test('unknown route redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/ruta-inexistente');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });
});
