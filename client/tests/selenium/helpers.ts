/**
 * Configuración y utilidades para las pruebas de Selenium
 */

import { WebDriver, By } from 'selenium-webdriver';

/**
 * Clase con utilidades avanzadas para las pruebas
 */
export class AuthTestHelper {
  constructor(private helper: any) {}

  /**
   * Completa el formulario de registro
   */
  async fillRegisterForm(
    fullName: string,
    email: string,
    career: string,
    password: string
  ): Promise<void> {
    const Locators = {
      fullNameInput: By.name('fullName'),
      emailInput: By.name('email'),
      careerSelect: By.name('career'),
      passwordInput: By.name('password'),
    };

    await this.helper.fillInput(Locators.fullNameInput, fullName);
    await this.helper.fillInput(Locators.emailInput, email);

    // Seleccionar carrera
    const careerSelect = await this.helper.findElement(Locators.careerSelect);
    await careerSelect.click();

    // Seleccionar opción de carrera
    const options = await this.helper.findElements(
      By.xpath(`//select[@name='career']/option[contains(text(), '${career}')]`)
    );

    if (options.length > 0) {
      await options[0].click();
    }

    await this.helper.fillInput(Locators.passwordInput, password);
  }

  /**
   * Completa el formulario de login
   */
  async fillLoginForm(email: string, password: string): Promise<void> {
    const Locators = {
      emailInput: By.name('email'),
      passwordInput: By.name('password'),
    };

    await this.helper.fillInput(Locators.emailInput, email);
    await this.helper.fillInput(Locators.passwordInput, password);
  }

  /**
   * Verifica que se muestren errores de validación
   */
  async hasValidationErrors(): Promise<boolean> {
    const errorElements = await this.helper.findElements(
      By.xpath("//*[contains(@class, 'error') or contains(@class, 'text-red')]")
    );
    return errorElements.length > 0;
  }

  /**
   * Obtiene los mensajes de error
   */
  async getErrorMessages(): Promise<string[]> {
    const errorElements = await this.helper.findElements(
      By.xpath("//*[contains(@class, 'error') or contains(@class, 'text-red')]")
    );

    const messages: string[] = [];
    for (const element of errorElements) {
      const text = await element.getText();
      if (text) {
        messages.push(text);
      }
    }

    return messages;
  }

  /**
   * Genera un email único para pruebas
   */
  generateUniqueEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}_${timestamp}_${random}@uta.edu.ec`;
  }

  /**
   * Genera una contraseña segura
   */
  generateSecurePassword(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return password;
  }

  /**
   * Completa un campo de forma segura (limpia y llena)
   */
  async fillFieldSecurely(locator: By, value: string): Promise<void> {
    const element = await this.helper.findElement(locator);
    
    // Triple click para seleccionar todo
    await element.click();
    await element.click();
    await element.click();
    
    // Enviar Keys
    const { Key } = require('selenium-webdriver');
    await element.sendKeys(Key.CONTROL, 'a');
    await element.sendKeys(value);
  }

  /**
   * Espera y verifica que la URL sea exacta
   */
  async verifyExactUrl(expectedUrl: string, timeout: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const currentUrl = await this.helper.getCurrentUrl();
      if (currentUrl.includes(expectedUrl)) {
        return true;
      }
      await this.helper.wait(500);
    }
    return false;
  }

  /**
   * Verifica la visibilidad de múltiples elementos
   */
  async areElementsVisible(locators: By[]): Promise<boolean[]> {
    const results: boolean[] = [];
    for (const locator of locators) {
      const isVisible = await this.helper.isElementVisible(locator);
      results.push(isVisible);
    }
    return results;
  }
}

/**
 * Datos de prueba para el sistema de autenticación
 */
export const testData = {
  // Usuarios válidos para pruebas
  validUsers: [
    {
      email: 'student1@uta.edu.ec',
      password: 'Password123!',
      fullName: 'Student One',
    },
    {
      email: 'student2@uta.edu.ec',
      password: 'Password456!',
      fullName: 'Student Two',
    },
  ],

  // Datos inválidos para pruebas negativas
  invalidEmails: [
    'notanemail',
    'user@gmail.com',
    'student@example.com',
    'user@',
    '@uta.edu.ec',
    'user@uta.edu.ec.com',
  ],

  weakPasswords: [
    '123',
    'pass',
    '12345',
    'password',
    'qwerty',
    'abc123',
  ],

  shortNames: [
    'a',
    'ab',
    'Jo',
    'X',
  ],

  // Datos válidos para registro
  validRegistrations: [
    {
      fullName: 'John Doe',
      email: 'john.doe@uta.edu.ec',
      career: 'fise',
      password: 'SecurePassword123!',
    },
    {
      fullName: 'Jane Smith',
      email: 'jane.smith@uta.edu.ec',
      career: 'fca',
      password: 'AnotherSecure456!',
    },
  ],
};

/**
 * Utilidades de espera y sincronización
 */
export const waits = {
  /**
   * Espera a que el DOM esté listo
   */
  async forDomReady(driver: WebDriver, timeout: number = 10000): Promise<void> {
    await driver.wait(async () => {
      return await driver.executeScript('return document.readyState === "complete"');
    }, timeout);
  },

  /**
   * Espera a que no haya elementos con clase loading
   */
  async forLoadingComplete(driver: WebDriver, timeout: number = 10000): Promise<void> {
    await driver.wait(async () => {
      const loadingElements = await driver.findElements(By.xpath("//*[contains(@class, 'loading')]"));
      return loadingElements.length === 0;
    }, timeout);
  },

  /**
   * Espera a que los spinners desaparezcan
   */
  async forSpinnersGone(driver: WebDriver, timeout: number = 10000): Promise<void> {
    await driver.wait(async () => {
      const spinners = await driver.findElements(
        By.xpath("//*[contains(@class, 'spinner')] | //*[contains(@class, 'loader')]")
      );
      return spinners.length === 0;
    }, timeout);
  },
};
