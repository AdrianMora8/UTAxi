import { test, expect } from '@playwright/test';

/**
 * Pruebas E2E de Flujo de Autenticación
 * Valida el flujo completo: Registro → Verificación → Login
 */

test.describe('Authentication Flow - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should register a new user', async ({ page }) => {
    // Navegar a registro
    await page.click('button:has-text("Sign Up")');
    
    // Esperar que se cargue el formulario de registro
    await expect(page.locator('form')).toBeVisible();

    // Llenar formulario de registro
    await page.fill('input[type="email"]', 'newstudent@uta.edu.ec');
    await page.fill('input[name="fullName"]', 'New Student');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    
    // Hacer click en registro
    await page.click('button:has-text("Register")');
    
    // Esperar mensaje de éxito o redirección a verificación
    await expect(page).toHaveURL(/.*verify|.*success/, { timeout: 10000 });
  });

  test('should verify email with OTP code', async ({ page }) => {
    // Asumir que el usuario se registró y está en página de verificación
    await page.goto('/verify-email');
    
    await page.fill('input[name="email"]', 'newstudent@uta.edu.ec');
    await page.fill('input[name="code"]', '123456'); // Código de prueba
    
    await page.click('button:has-text("Verify")');
    
    // Debería redirigir a login después de verificación exitosa
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test('should login with verified credentials', async ({ page }) => {
    // Navegar a login
    await page.goto('/login');
    
    // Llenar formulario de login
    await page.fill('input[type="email"]', 'student1@uta.edu.ec');
    await page.fill('input[type="password"]', 'Password123!');
    
    // Hacer click en login
    await page.click('button:has-text("Login")');
    
    // Debería redirigir al dashboard después de login exitoso
    await expect(page).toHaveURL(/.*dashboard|.*trips/, { timeout: 10000 });
    
    // Verificar que se muestre la información del usuario
    await expect(page.locator('text=/Dashboard|Mis Viajes/')).toBeVisible();
  });

  test('should reject login with incorrect password', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'student1@uta.edu.ec');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    
    await page.click('button:has-text("Login")');
    
    // Debería mostrar mensaje de error
    await expect(page.locator('text=/Invalid credentials|Wrong password/')).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'Password123!');
    
    // El error debería aparecer sin hacer click
    await expect(page.locator('text=/Invalid email/')).toBeVisible();
  });
});
