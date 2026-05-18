import { Builder, WebDriver, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

/**
 * Configuración global de Selenium WebDriver
 */

export const BASE_URL = process.env.BASE_URL || 'http://localhost:4278';

/**
 * Opciones de Chrome para las pruebas
 */
export function getChromeOptions(headless: boolean = true) {
  const options = new chrome.Options();
  
  if (headless) {
    options.addArguments('--headless=new');
  }
  
  options.addArguments(
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--start-maximized',
    '--window-size=1920,1080'
  );
  
  return options;
}

/**
 * Crea una instancia del WebDriver
 */
export async function createDriver(headless: boolean = true): Promise<WebDriver> {
  const options = getChromeOptions(headless);
  const service = new chrome.ServiceBuilder();
  
  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .setChromeService(service)
    .build();
}

/**
 * Utilidades para ayudar con las pruebas
 */
export class SeleniumTestHelper {
  constructor(private driver: WebDriver) {}

  /**
   * Navega a una URL relativa
   */
  async goTo(path: string = ''): Promise<void> {
    await this.driver.get(`${BASE_URL}${path}`);
  }

  /**
   * Espera a que un elemento esté presente en el DOM
   */
  async waitForElement(locator: By, timeout: number = 10000): Promise<void> {
    await this.driver.wait(until.elementLocated(locator), timeout);
  }

  /**
   * Espera a que un elemento sea visible
   */
  async waitForElementVisible(locator: By, timeout: number = 10000): Promise<void> {
    const element = await this.driver.wait(until.elementLocated(locator), timeout);
    await this.driver.wait(until.elementIsVisible(element), timeout);
  }

  /**
   * Espera a que un elemento sea clickeable
   */
  async waitForElementClickable(locator: By, timeout: number = 10000): Promise<void> {
    const element = await this.driver.wait(until.elementLocated(locator), timeout);
    await this.driver.wait(until.elementIsEnabled(element), timeout);
  }

  /**
   * Encuentra un elemento
   */
  async findElement(locator: By) {
    return await this.driver.findElement(locator);
  }

  /**
   * Encuentra múltiples elementos
   */
  async findElements(locator: By) {
    return await this.driver.findElements(locator);
  }

  /**
   * Llena un campo de input
   */
  async fillInput(locator: By, value: string): Promise<void> {
    const element = await this.findElement(locator);
    await element.clear();
    await element.sendKeys(value);
  }

  /**
   * Hace click en un elemento
   */
  async click(locator: By): Promise<void> {
    const element = await this.findElement(locator);
    await element.click();
  }

  /**
   * Obtiene el texto de un elemento
   */
  async getText(locator: By): Promise<string> {
    const element = await this.findElement(locator);
    return await element.getText();
  }

  /**
   * Obtiene el atributo de un elemento
   */
  async getAttribute(locator: By, attribute: string): Promise<string | null> {
    const element = await this.findElement(locator);
    return await element.getAttribute(attribute);
  }

  /**
   * Espera a que la URL cambie a un patrón específico
   */
  async waitForUrlMatch(pattern: string | RegExp, timeout: number = 10000): Promise<void> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    await this.driver.wait(
      async () => {
        const currentUrl = await this.driver.getCurrentUrl();
        return regex.test(currentUrl);
      },
      timeout
    );
  }

  /**
   * Obtiene la URL actual
   */
  async getCurrentUrl(): Promise<string> {
    return await this.driver.getCurrentUrl();
  }

  /**
   * Verifica si un elemento está presente
   */
  async isElementPresent(locator: By): Promise<boolean> {
    try {
      await this.driver.wait(until.elementLocated(locator), 3000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica si un elemento es visible
   */
  async isElementVisible(locator: By): Promise<boolean> {
    try {
      const element = await this.findElement(locator);
      return await element.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Ejecuta JavaScript en el contexto del navegador
   */
  async executeScript(script: string, ...args: any[]): Promise<any> {
    return await this.driver.executeScript(script, ...args);
  }

  /**
   * Espera (no es recomendable, solo para casos especiales)
   */
  async wait(ms: number): Promise<void> {
    await this.driver.sleep(ms);
  }

  /**
   * Limpia todas las cookies
   */
  async clearCookies(): Promise<void> {
    await this.driver.manage().deleteAllCookies();
  }

  /**
   * Obtiene una cookie
   */
  async getCookie(name: string) {
    return await this.driver.manage().getCookie(name);
  }
}

/**
 * Localizadores comunes para las pruebas
 */
export const Locators = {
  // Inputs
  emailInput: By.name('email'),
  passwordInput: By.name('password'),
  fullNameInput: By.name('fullName'),
  careerSelect: By.name('career'),
  confirmPasswordInput: By.name('confirmPassword'),

  // Botones
  loginButton: By.xpath("//button[contains(text(), 'Login') or contains(text(), 'Iniciar sesión')]"),
  registerButton: By.xpath("//button[contains(text(), 'Register') or contains(text(), 'Registrarse')]"),
  submitButton: By.xpath("//button[@type='submit']"),
  signUpLink: By.xpath("//a[contains(text(), 'Sign Up')] | //button[contains(text(), 'Sign Up')]"),
  loginLink: By.xpath("//a[contains(text(), 'Login')] | //a[contains(text(), 'Iniciar sesión')]"),

  // Mensajes de error
  errorMessage: By.xpath("//*[contains(@class, 'error') or contains(@class, 'text-red')]"),
  serverError: By.xpath("//*[contains(text(), 'Credenciales incorrectas') or contains(text(), 'Error')]"),

  // Textos de éxito
  successMessage: By.xpath("//*[contains(text(), 'success') or contains(text(), 'Success')]"),

  // Elementos de verificación
  verifyButton: By.xpath("//button[contains(text(), 'Verify')]"),
  otpInput: By.name('code'),
};
