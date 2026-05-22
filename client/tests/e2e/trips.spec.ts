import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  await page.fill('input[placeholder="••••••••"]', 'Password123!');
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
}

test.describe('Trips Flow - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show trips list with heading', async ({ page }) => {
    await page.goto('/trips');

    await expect(page.locator('h2:has-text("Viajes Disponibles")')).toBeVisible();
  });

  test('should show sort buttons on trips list', async ({ page }) => {
    await page.goto('/trips');

    await expect(page.locator('button:has-text("MÁS RECIENTES")')).toBeVisible();
    await expect(page.locator('button:has-text("MEJOR CALIFICADOS")')).toBeVisible();
  });

  test('should navigate to trip detail on card click', async ({ page }) => {
    await page.goto('/trips');

    // Wait for at least one trip card to appear (Link to /trips/:id)
    const firstCard = page.locator('a[href^="/trips/"]:not([href="/trips/new"])').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    await expect(page).toHaveURL(/\/trips\/[^/]+$/, { timeout: 8000 });
    await expect(page.locator('text="Itinerario del Viaje"')).toBeVisible();
  });

  test('should show Solicitar Unirse button on a trip not owned by user', async ({ page }) => {
    await page.goto('/trips');

    const firstCard = page.locator('a[href^="/trips/"]:not([href="/trips/new"])').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    // Could be "Solicitar Unirse", "Gestionar Solicitudes" (if driver), or "¡Solicitud enviada!"
    const actionPanel = page.locator('button:has-text("Solicitar Unirse"), button:has-text("Gestionar Solicitudes"), div:has-text("¡Solicitud enviada!")');
    await expect(actionPanel).toBeVisible({ timeout: 8000 });
  });

  test('should filter trips by origin zone', async ({ page }) => {
    await page.goto('/trips');

    await page.fill('input[placeholder="¿De dónde sales?"]', 'Campus');
    await page.click('button:has-text("Encontrar Viaje")');

    // Either shows results with "Campus" or empty state message
    const results = page.locator('text=/Campus|No hay viajes disponibles/i');
    await expect(results).toBeVisible({ timeout: 8000 });
  });

  test('should filter trips by destination zone', async ({ page }) => {
    await page.goto('/trips');

    await page.fill('input[placeholder="¿A dónde vas?"]', 'Huachi');
    await page.click('button:has-text("Encontrar Viaje")');

    const results = page.locator('text=/Huachi|No hay viajes disponibles/i');
    await expect(results).toBeVisible({ timeout: 8000 });
  });

  test('should show empty state when no trips match filter', async ({ page }) => {
    await page.goto('/trips');

    await page.fill('input[placeholder="¿A dónde vas?"]', 'ZonaInexistente99999');
    await page.click('button:has-text("Encontrar Viaje")');

    await expect(page.locator('text="No hay viajes disponibles con esos filtros."')).toBeVisible({ timeout: 8000 });
  });

  test('should clear filters and show all trips again', async ({ page }) => {
    await page.goto('/trips');

    await page.fill('input[placeholder="¿A dónde vas?"]', 'ZonaInexistente99999');
    await page.click('button:has-text("Encontrar Viaje")');
    await expect(page.locator('text="No hay viajes disponibles con esos filtros."')).toBeVisible({ timeout: 8000 });

    await page.click('button:has-text("Limpiar filtros")');

    await expect(page.locator('h2:has-text("Viajes Disponibles")')).toBeVisible();
  });
});
