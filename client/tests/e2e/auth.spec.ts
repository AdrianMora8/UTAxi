import { test, expect } from '@playwright/test';

test.describe('Forgot Password / Reset Password Flow - E2E', () => {
  test('should show forgot-password form with email input', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.locator('input[placeholder="usuario@uta.edu.ec"]')).toBeVisible();
    await expect(page.locator('button:has-text("Enviar código")')).toBeVisible();
  });

  test('should navigate to forgot-password via login page link', async ({ page }) => {
    await page.goto('/login');

    await page.click('a[href="/forgot-password"]');

    await expect(page).toHaveURL(/.*forgot-password/);
    await expect(page.locator('button:has-text("Enviar código")')).toBeVisible();
  });

  test('should show reset-password form with email, code and password fields', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.locator('text="Restablecer contraseña"').first()).toBeVisible();
    await expect(page.locator('input[placeholder="usuario@uta.edu.ec"]')).toBeVisible();
    await expect(page.locator('input[placeholder="000000"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Mínimo 8 caracteres"]')).toBeVisible();
    await expect(page.locator('button:has-text("Restablecer contraseña")')).toBeVisible();
  });

  test('should show error when reset code is invalid', async ({ page }) => {
    await page.goto('/reset-password');

    await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
    await page.fill('input[placeholder="000000"]', '000000');
    await page.fill('input[placeholder="Mínimo 8 caracteres"]', 'NewPass123!');
    await page.click('button:has-text("Restablecer contraseña")');

    await expect(
      page.locator('text=/código|inválido|expirado|error/i')
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Authentication Flow - E2E', () => {
  test('should register a new user and redirect to verify-email', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[placeholder="Ej. Alex Maldonado"]', 'Test E2E User');
    await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'e2etest@uta.edu.ec');
    await page.selectOption('select', { label: 'Ingeniería en Sistemas' });
    await page.fill('input[placeholder="••••••••"]', 'SecurePass123!');

    await page.click('button:has-text("Crear Cuenta Institucional")');

    await expect(page).toHaveURL(/.*verify-email/, { timeout: 10000 });
  });

  test('should show verify-email form with code input', async ({ page }) => {
    await page.goto('/verify-email?email=e2etest@uta.edu.ec');

    await expect(page.locator('input[placeholder="000000"]')).toBeVisible();
    await expect(page.locator('button:has-text("Verificar Código")')).toBeVisible();
  });

  test('should show error on invalid OTP code', async ({ page }) => {
    await page.goto('/verify-email?email=e2etest@uta.edu.ec');

    await page.fill('input[placeholder="000000"]', '000000');
    await page.click('button:has-text("Verificar Código")');

    await expect(page.locator('text=/Código inválido|expirado|inválido/i')).toBeVisible({ timeout: 8000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
    await page.fill('input[placeholder="••••••••"]', 'Password123!');
    await page.click('button:has-text("Iniciar Sesión")');

    await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
  });

  test('should reject login with incorrect password', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
    await page.fill('input[placeholder="••••••••"]', 'WrongPassword123!');
    await page.click('button:has-text("Iniciar Sesión")');

    await expect(page.locator('text=/Credenciales incorrectas|credenciales/i')).toBeVisible({ timeout: 8000 });
  });

  test('should show inline validation error for invalid email', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'not-an-email');
    await page.fill('input[placeholder="••••••••"]', 'Password123!');
    await page.click('button:has-text("Iniciar Sesión")');

    await expect(page.locator('text="Email inválido"')).toBeVisible();
  });

  test('should navigate to register page from login link', async ({ page }) => {
    await page.goto('/login');

    await page.click('a:has-text("Registrarse como Estudiante")');

    await expect(page).toHaveURL(/.*register/);
  });

  test('should redirect unauthenticated user from protected route', async ({ page }) => {
    await page.goto('/trips/new');

    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });
});
