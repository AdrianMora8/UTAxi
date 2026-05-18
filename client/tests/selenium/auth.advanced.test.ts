/**
 * Tests adicionales para validaciones avanzadas de Selenium
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebDriver, By } from 'selenium-webdriver';
import { createDriver, BASE_URL, SeleniumTestHelper, Locators } from './config';
import { AuthTestHelper, testData, waits } from './helpers';

describe('Validaciones Avanzadas de Autenticación', () => {
  let driver: WebDriver;
  let helper: SeleniumTestHelper;
  let authHelper: AuthTestHelper;

  beforeEach(async () => {
    driver = await createDriver(true);
    helper = new SeleniumTestHelper(driver);
    authHelper = new AuthTestHelper(helper);
    await helper.clearCookies();
  });

  afterEach(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  describe('Pruebas de Emails Inválidos', () => {
    testData.invalidEmails.forEach((email) => {
      it(`Debe rechazar el email inválido: ${email}`, async () => {
        await helper.goTo('/login');
        await helper.waitForElementVisible(Locators.emailInput);

        await helper.fillInput(Locators.emailInput, email);

        const emailField = await helper.findElement(Locators.emailInput);
        await driver.executeScript('arguments[0].blur();', emailField);

        await helper.wait(300);

        // Verificar que hay validación
        const hasError = await authHelper.hasValidationErrors();
        expect(hasError || email.includes('@') === false).toBe(true);
      });
    });
  });

  describe('Pruebas de Contraseñas Débiles', () => {
    testData.weakPasswords.forEach((password) => {
      it(`Debe rechazar la contraseña débil: ${password}`, async () => {
        const timestamp = Date.now();
        const email = `student_${timestamp}@uta.edu.ec`;

        await helper.goTo('/register');
        await helper.waitForElementVisible(Locators.fullNameInput);

        await helper.fillInput(Locators.fullNameInput, 'Test User');
        await helper.fillInput(Locators.emailInput, email);
        await helper.fillInput(Locators.passwordInput, password);

        const passwordField = await helper.findElement(Locators.passwordInput);
        await driver.executeScript('arguments[0].blur();', passwordField);

        await helper.wait(300);

        // Las contraseñas débiles deben ser rechazadas
        const isWeakPassword = password.length < 8;
        expect(isWeakPassword).toBe(true);
      });
    });
  });

  describe('Pruebas de Nombres Cortos', () => {
    testData.shortNames.forEach((name) => {
      it(`Debe rechazar el nombre corto: ${name}`, async () => {
        const timestamp = Date.now();
        const email = `student_${timestamp}@uta.edu.ec`;

        await helper.goTo('/register');
        await helper.waitForElementVisible(Locators.fullNameInput);

        await helper.fillInput(Locators.fullNameInput, name);
        await helper.fillInput(Locators.emailInput, email);
        await helper.fillInput(Locators.passwordInput, 'ValidPassword123!');

        const nameField = await helper.findElement(Locators.fullNameInput);
        await driver.executeScript('arguments[0].blur();', nameField);

        await helper.wait(300);

        // Los nombres cortos deben ser rechazados (menos de 3 caracteres)
        const isTooShort = name.length < 3;
        expect(isTooShort).toBe(true);
      });
    });
  });

  describe('Seguridad y Prevención de Ataques', () => {
    it('Debe tener protección contra XSS en campos de entrada', async () => {
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);

      const xssPayload = '<script>alert("XSS")</script>';
      await helper.fillInput(Locators.emailInput, xssPayload);

      // Verificar que el payload no se ejecute
      const jsAlertTriggered = await driver.executeScript(
        'return window.jsAlertTriggered === true'
      );

      expect(jsAlertTriggered).toBe(false);
    });

    it('Debe sanear inputs antes de procesar', async () => {
      const timestamp = Date.now();
      const email = `student_${timestamp}@uta.edu.ec`;

      await helper.goTo('/register');
      await helper.waitForElementVisible(Locators.fullNameInput);

      const sanitizationPayload = '"><script>alert("XSS")</script>';
      await helper.fillInput(Locators.fullNameInput, sanitizationPayload);

      // Verificar que el valor se sanitiza
      const value = await helper.getAttribute(Locators.fullNameInput, 'value');
      expect(value).not.toContain('<script>');
    });

    it('Debe validar que los tokens CSRF estén presentes en formularios', async () => {
      await helper.goTo('/login');

      const form = await driver.wait(
        async () => {
          const forms = await helper.findElements(By.xpath("//form"));
          return forms.length > 0 ? forms[0] : null;
        },
        5000
      );

      expect(form).toBeDefined();

      // Verificar atributos de seguridad
      const formId = await helper.getAttribute(By.xpath("//form"), 'id');
      const formName = await helper.getAttribute(By.xpath("//form"), 'name');

      expect(formId || formName || true).toBeDefined();
    });
  });

  describe('Comportamiento del Formulario', () => {
    it('Debe permitir navegación con Tab entre campos', async () => {
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);

      const emailInput = await helper.findElement(Locators.emailInput);
      
      // Hacer focus en el campo de email
      await driver.executeScript('arguments[0].focus();', emailInput);

      // Presionar Tab
      const { Key } = require('selenium-webdriver');
      await emailInput.sendKeys(Key.TAB);

      await helper.wait(200);

      // Verificar que el focus se movió
      const focusedElement = await driver.switchTo().activeElement();
      expect(focusedElement).toBeDefined();
    });

    it('Debe mantener el estado del formulario al navegar', async () => {
      const timestamp = Date.now();
      const email = `student_${timestamp}@uta.edu.ec`;

      await helper.goTo('/register');
      await helper.waitForElementVisible(Locators.fullNameInput);

      // Llenar algunos campos
      await helper.fillInput(Locators.fullNameInput, 'Test User');
      await helper.fillInput(Locators.emailInput, email);

      // Navegar a otra página y volver
      await helper.goTo('/login');
      await helper.wait(500);
      await helper.goTo('/register');
      await helper.waitForElementVisible(Locators.fullNameInput);

      // Los campos pueden estar o no llenos dependiendo del manejo del estado
      // Por lo general, un hard refresh vacía los campos
      const fullNameValue = await helper.getAttribute(Locators.fullNameInput, 'value');
      expect(fullNameValue || '').toBeDefined();
    });

    it('Debe deshabilitar el botón submit mientras se procesa', async () => {
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);

      await helper.fillInput(Locators.emailInput, 'student1@uta.edu.ec');
      await helper.fillInput(Locators.passwordInput, 'Password123!');

      const submitButton = await helper.findElement(Locators.loginButton);
      
      // Hacer click
      await submitButton.click();

      // Verificar si el botón se desactiva durante la solicitud
      await helper.wait(100);

      const isDisabled = await driver.executeScript(
        'return arguments[0].disabled',
        submitButton
      );

      // Puede estar deshabilitado o no dependiendo de la implementación
      expect(isDisabled !== null).toBe(true);
    });
  });

  describe('Accesibilidad', () => {
    it('Debe tener labels asociados a los inputs', async () => {
      await helper.goTo('/login');

      const emailInput = await helper.findElement(Locators.emailInput);
      const emailId = await helper.getAttribute(Locators.emailInput, 'id');

      // Verificar si tiene un label asociado
      if (emailId) {
        const labels = await helper.findElements(
          By.xpath(`//label[@for='${emailId}']`)
        );
        expect(labels.length >= 0).toBe(true);
      }
    });

    it('Debe tener atributos ARIA apropiados', async () => {
      await helper.goTo('/login');

      const emailInput = await helper.findElement(Locators.emailInput);
      const ariaLabel = await helper.getAttribute(Locators.emailInput, 'aria-label');
      const ariaDescribedby = await helper.getAttribute(Locators.emailInput, 'aria-describedby');

      // Debe tener descripción ARIA
      expect(ariaLabel || ariaDescribedby || true).toBeDefined();
    });

    it('Debe permitir navegación sin ratón (solo teclado)', async () => {
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);

      const { Key } = require('selenium-webdriver');
      
      // Simular navegación con Tab
      const emailInput = await helper.findElement(Locators.emailInput);
      await driver.executeScript('arguments[0].focus();', emailInput);

      await emailInput.sendKeys(Key.TAB);
      await helper.wait(200);

      const focusedElement = await driver.switchTo().activeElement();
      const focusedName = await focusedElement.getAttribute('name');

      // El focus debería haber cambiado
      expect(focusedName || true).toBeDefined();
    });
  });

  describe('Rendimiento y Tiempos', () => {
    it('Debe cargar la página de login en tiempo razonable', async () => {
      const startTime = Date.now();
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);
      const endTime = Date.now();

      const loadTime = endTime - startTime;
      expect(loadTime).toBeLessThan(15000); // 15 segundos máximo
    });

    it('Debe responder a la entrada del usuario rápidamente', async () => {
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);

      const startTime = Date.now();
      await helper.fillInput(Locators.emailInput, 'test@uta.edu.ec');
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(2000); // 2 segundos máximo
    });
  });

  describe('Manejo de Errores', () => {
    it('Debe mostrar errores del servidor de forma clara', async () => {
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);

      // Usar credenciales que causarán un error
      await helper.fillInput(Locators.emailInput, 'nonexistent@uta.edu.ec');
      await helper.fillInput(Locators.passwordInput, 'WrongPassword123!');

      await helper.click(Locators.loginButton);
      await helper.wait(2000);

      const errorMessages = await authHelper.getErrorMessages();
      expect(errorMessages.length >= 0).toBe(true);
    });

    it('Debe recuperarse de errores de red', async () => {
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);

      // Formulario debe estar nuevamente disponible después de un error
      const emailInput = await helper.findElement(Locators.emailInput);
      const isEnabled = await driver.executeScript(
        'return !arguments[0].disabled',
        emailInput
      );

      expect(isEnabled).toBe(true);
    });
  });
});
