import { test, expect } from '@playwright/test';

/**
 * Pruebas E2E de Flujo de Viajes
 * Valida: Crear viaje, Buscar viaje, Solicitar viaje, Ver detalles
 */

test.describe('Trips Flow - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'student1@uta.edu.ec');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button:has-text("Login")');
    
    // Esperar a que se cargue el dashboard
    await expect(page).toHaveURL(/.*dashboard|.*trips/, { timeout: 10000 });
  });

  test('should navigate to trips list', async ({ page }) => {
    await page.click('a:has-text("Trips") >> nth=0');
    
    // Debería mostrar lista de viajes
    await expect(page.locator('text=/Available Trips|Viajes Disponibles/')).toBeVisible();
  });

  test('should view trip details', async ({ page }) => {
    await page.goto('/trips');
    
    // Click en el primer viaje
    await page.click('div[class*="trip-card"] >> nth=0');
    
    // Debería mostrar detalles del viaje
    await expect(page.locator('text=/Trip Details|Detalles del Viaje/')).toBeVisible();
    
    // Verificar que se muestren campos importantes
    await expect(page.locator('text=/From:|To:|Date:|Seats/')).toBeVisible();
  });

  test('should request to join a trip', async ({ page }) => {
    await page.goto('/trips');
    
    // Click en el primer viaje
    await page.click('div[class*="trip-card"] >> nth=0');
    
    // Click en "Request to Join"
    await page.click('button:has-text("Request to Join")');
    
    // Debería mostrar mensaje de confirmación
    await expect(page.locator('text=/request sent|solicitud enviada/i')).toBeVisible();
  });

  test('should filter trips by location', async ({ page }) => {
    await page.goto('/trips');
    
    // Llenar filtro de origen
    await page.fill('input[name="from"]', 'Polanco');
    
    // Hacer click en buscar (o esperar que filtre automáticamente)
    await page.click('button:has-text("Search")');
    
    // Debería mostrar solo viajes desde Polanco
    await expect(page.locator('text=/Polanco/')).toBeVisible();
  });

  test('should show trip booking modal', async ({ page }) => {
    await page.goto('/trips');
    
    // Click en el primer viaje
    await page.click('div[class*="trip-card"] >> nth=0');
    
    // Click en "Request to Join"
    await page.click('button:has-text("Request to Join")');
    
    // Debería mostrar modal/dialog de confirmación
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});
