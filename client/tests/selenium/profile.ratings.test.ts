import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { WebDriver, By, until } from 'selenium-webdriver';
import { createDriver, SeleniumTestHelper, Locators } from './config';
import { PrismaClient } from '@prisma/client';

describe('Perfil y Calificaciones - Pruebas de Sistema Selenium', () => {
  let driver: WebDriver;
  let helper: SeleniumTestHelper;
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    driver = await createDriver(true);
    helper = new SeleniumTestHelper(driver);
    await helper.clearCookies();
  });

  afterEach(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  async function setupUserWithRating(email: string, score: number) {
    // Registrar
    await helper.goTo('/register');
    await helper.fillInput(Locators.fullNameInput, `User Score ${score}`);
    await helper.fillInput(Locators.emailInput, email);
    
    const careerSelect = await helper.findElement(Locators.careerSelect);
    await careerSelect.click();
    await driver.wait(until.elementLocated(By.xpath("//select[@name='career']/option[2]")), 5000);
    const option = await helper.findElement(By.xpath("//select[@name='career']/option[2]"));
    await option.click();
    
    await helper.fillInput(Locators.passwordInput, 'SecurePass123!');
    await helper.click(Locators.registerButton);
    await helper.waitForUrlMatch(/verify-email|success/, 10000);

    // Activar y poner score en BD (simulando que ya ha sido calificado)
    const user = await prisma.user.update({
      where: { email },
      data: { 
        emailVerified: true, 
        reputationScore: score 
      }
    });

    return user;
  }

  it('Debe mostrar la reputación correcta en el perfil del usuario', async () => {
    const timestamp = Date.now();
    const email = `profile_${timestamp}@uta.edu.ec`;
    const targetScore = 4.5;

    await setupUserWithRating(email, targetScore);

    // Login
    await helper.goTo('/login');
    await helper.fillInput(Locators.emailInput, email);
    await helper.fillInput(Locators.passwordInput, 'SecurePass123!');
    await helper.click(Locators.loginButton);
    await helper.waitForUrlMatch(/\//, 10000);

    // Ir al perfil
    await helper.goTo('/profile');
    
    // Verificar que el score se muestra
    await helper.waitForElementVisible(By.xpath(`//*[contains(text(), '${targetScore.toFixed(1)}')]`));
    const scoreText = await helper.getText(By.xpath(`//*[contains(text(), '${targetScore.toFixed(1)}')]`));
    expect(scoreText).toContain(targetScore.toFixed(1));
    
    console.log(`✅ Reputación de ${targetScore} verificada en el perfil`);
  });

  it('Debe permitir ver las estadísticas del usuario en el dashboard', async () => {
    const timestamp = Date.now();
    const email = `stats_${timestamp}@uta.edu.ec`;
    await setupUserWithRating(email, 5.0);

    await helper.goTo('/login');
    await helper.fillInput(Locators.emailInput, email);
    await helper.fillInput(Locators.passwordInput, 'SecurePass123!');
    await helper.click(Locators.loginButton);

    // En el home/dashboard usualmente hay un resumen
    await helper.waitForElementVisible(By.xpath("//*[contains(text(), '5.0')]"));
    const dashboardScore = await helper.isElementVisible(By.xpath("//*[contains(text(), '5.0')]"));
    expect(dashboardScore).toBe(true);
    
    console.log('✅ Estadísticas básicas visibles en el dashboard');
  });
});
