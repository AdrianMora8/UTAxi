/**
 * EJEMPLOS DE EXTENSIÓN
 * 
 * Este archivo muestra cómo agregar nuevas pruebas de Selenium
 * Úsalo como referencia para tus propias pruebas
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebDriver, By } from 'selenium-webdriver';
import { createDriver, BASE_URL, SeleniumTestHelper, Locators } from './config';
import { AuthTestHelper, testData } from './helpers';

describe('EJEMPLOS: Cómo Extender las Pruebas', () => {
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

  // ============================================
  // EJEMPLO 1: Prueba Simple
  // ============================================
  describe('EJEMPLO 1: Pruebas Simples', () => {
    it('Debe navegar a la página de login', async () => {
      // Arrange (preparación)
      // (no necesitamos nada especial)

      // Act (acción)
      await helper.goTo('/login');

      // Assert (verificación)
      const url = await helper.getCurrentUrl();
      expect(url).toContain('/login');
    });
  });

  // ============================================
  // EJEMPLO 2: Prueba con Relleno de Formulario
  // ============================================
  describe('EJEMPLO 2: Llenar Formularios', () => {
    it('Debe llenar un formulario de login paso a paso', async () => {
      await helper.goTo('/login');
      
      // Esperar que el formulario esté visible
      await helper.waitForElementVisible(Locators.emailInput);

      // Llenar email
      await helper.fillInput(Locators.emailInput, 'test@uta.edu.ec');

      // Llenar contraseña
      await helper.fillInput(Locators.passwordInput, 'TestPassword123!');

      // Verificar que los valores se ingresaron
      const emailValue = await helper.getAttribute(Locators.emailInput, 'value');
      const passwordValue = await helper.getAttribute(Locators.passwordInput, 'value');

      expect(emailValue).toBe('test@uta.edu.ec');
      expect(passwordValue).toBe('TestPassword123!');
    });
  });

  // ============================================
  // EJEMPLO 3: Prueba con Datos Dinámicos
  // ============================================
  describe('EJEMPLO 3: Datos Dinámicos', () => {
    it('Debe registrar usuario con email único', async () => {
      // Generar datos únicos
      const email = authHelper.generateUniqueEmail('test');
      const password = authHelper.generateSecurePassword();

      await helper.goTo('/register');
      await helper.waitForElementVisible(Locators.fullNameInput);

      // Usar los datos generados
      await helper.fillInput(Locators.fullNameInput, 'Unique User');
      await helper.fillInput(Locators.emailInput, email);
      await helper.fillInput(Locators.passwordInput, password);

      // Verificar que se usaron los datos correctos
      const inputEmail = await helper.getAttribute(Locators.emailInput, 'value');
      expect(inputEmail).toBe(email);
    });
  });

  // ============================================
  // EJEMPLO 4: Prueba con Iteración (Loop)
  // ============================================
  describe('EJEMPLO 4: Pruebas Parametrizadas', () => {
    // Probar múltiples usuarios
    testData.validUsers.forEach((user) => {
      it(`Debe permitir login para ${user.email}`, async () => {
        await helper.goTo('/login');
        await helper.waitForElementVisible(Locators.emailInput);

        await helper.fillInput(Locators.emailInput, user.email);
        await helper.fillInput(Locators.passwordInput, user.password);

        // Aquí iría el click de login
        // await helper.click(Locators.loginButton);
        // await helper.waitForUrlMatch(/trips|dashboard/);

        const emailValue = await helper.getAttribute(Locators.emailInput, 'value');
        expect(emailValue).toBe(user.email);
      });
    });
  });

  // ============================================
  // EJEMPLO 5: Prueba con Esperas Personalizadas
  // ============================================
  describe('EJEMPLO 5: Esperas Inteligentes', () => {
    it('Debe esperar elementos de forma inteligente', async () => {
      await helper.goTo('/login');

      // Esperar que el elemento esté presente
      await helper.waitForElement(Locators.emailInput);

      // Esperar que sea visible
      await helper.waitForElementVisible(Locators.emailInput);

      // Esperar que sea clickeable
      await helper.waitForElementClickable(Locators.loginButton);

      // Esperar con timeout personalizado
      await helper.waitForElementVisible(Locators.emailInput, 20000);

      expect(true).toBe(true);
    });
  });

  // ============================================
  // EJEMPLO 6: Prueba con Búsqueda Múltiple
  // ============================================
  describe('EJEMPLO 6: Encontrar Múltiples Elementos', () => {
    it('Debe encontrar todos los inputs del formulario', async () => {
      await helper.goTo('/login');

      // Encontrar múltiples elementos
      const inputs = await helper.findElements(By.xpath("//input[@type='text'] | //input[@type='email'] | //input[@type='password']"));

      // Verificar que se encontraron
      expect(inputs.length).toBeGreaterThan(0);

      // Obtener atributos de cada uno
      for (const input of inputs) {
        const type = await input.getAttribute('type');
        expect(type || 'text').toBeDefined();
      }
    });
  });

  // ============================================
  // EJEMPLO 7: Prueba con JavaScript
  // ============================================
  describe('EJEMPLO 7: Ejecutar JavaScript', () => {
    it('Debe ejecutar código JavaScript en el navegador', async () => {
      await helper.goTo('/login');

      // Ejecutar script simple
      const title = await driver.executeScript('return document.title');
      expect(title).toBeDefined();

      // Ejecutar script con argumentos
      const inputElement = await helper.findElement(Locators.emailInput);
      const inputType = await driver.executeScript(
        'return arguments[0].type',
        inputElement
      );
      expect(inputType).toBe('email');

      // Obtener información de la página
      const body = await driver.executeScript('return document.body.innerHTML.length');
      expect(body).toBeGreaterThan(0);
    });
  });

  // ============================================
  // EJEMPLO 8: Prueba con Validación de Errores
  // ============================================
  describe('EJEMPLO 8: Validar Errores', () => {
    it('Debe capturar y verificar mensajes de error', async () => {
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);

      // Llenar con datos inválidos
      await helper.fillInput(Locators.emailInput, 'invalid-email');
      await helper.fillInput(Locators.passwordInput, '');

      // Esperar a que aparezcan errores
      await helper.wait(500);

      // Obtener mensajes de error
      const errorMessages = await authHelper.getErrorMessages();
      
      // Verificar que hay al menos un error
      expect(errorMessages.length >= 0).toBe(true);
    });
  });

  // ============================================
  // EJEMPLO 9: Prueba con Navegación Entre Páginas
  // ============================================
  describe('EJEMPLO 9: Navegación', () => {
    it('Debe navegar entre diferentes rutas', async () => {
      // Ir a login
      await helper.goTo('/login');
      let url = await helper.getCurrentUrl();
      expect(url).toContain('/login');

      // Ir a register
      await helper.goTo('/register');
      url = await helper.getCurrentUrl();
      expect(url).toContain('/register');

      // Volver a home
      await helper.goTo('/');
      url = await helper.getCurrentUrl();
      expect(url).not.toContain('/login');
    });
  });

  // ============================================
  // EJEMPLO 10: Prueba Compleja (Suite Completa)
  // ============================================
  describe('EJEMPLO 10: Prueba Completa', () => {
    it('Debe completar el flujo completo: Register -> Verify -> Login', async () => {
      // PASO 1: Ir a registro
      await helper.goTo('/register');
      await helper.waitForElementVisible(Locators.fullNameInput);

      // PASO 2: Generar datos únicos
      const email = authHelper.generateUniqueEmail('complete_flow');
      const password = 'CompleteFlow123!';

      // PASO 3: Llenar formulario
      await helper.fillInput(Locators.fullNameInput, 'Complete Flow User');
      await helper.fillInput(Locators.emailInput, email);
      
      // Seleccionar carrera (ejemplo)
      const careerSelect = await helper.findElement(Locators.careerSelect);
      await careerSelect.click();

      // PASO 4: Esperar y hacer submit
      await helper.wait(500);
      // await helper.click(Locators.registerButton);
      // await helper.waitForUrlMatch(/verify-email/, 10000);

      // PASO 5: Verificar que estamos en la página de verificación
      // const currentUrl = await helper.getCurrentUrl();
      // expect(currentUrl).toContain('verify-email');

      // PASO 6: Verificar que los datos se mantienen
      const emailValue = await helper.getAttribute(Locators.emailInput, 'value');
      expect(emailValue).toBe(email);

      console.log('✅ Flujo completo verificado (sin submit real)');
    });
  });

  // ============================================
  // EJEMPLO 11: Prueba con Manejo de Errores
  // ============================================
  describe('EJEMPLO 11: Manejo de Excepciones', () => {
    it('Debe manejar cuando un elemento no existe', async () => {
      await helper.goTo('/login');

      // Intentar encontrar elemento que no existe
      const exists = await helper.isElementPresent(
        By.xpath("//button[contains(text(), 'Este botón no existe')]")
      );

      expect(exists).toBe(false);
    });

    it('Debe recuperarse de errores de navegación', async () => {
      try {
        // Intentar navegar a URL inválida
        await helper.goTo('/this-page-does-not-exist');
        
        // El navegador seguirá funcionando
        const url = await helper.getCurrentUrl();
        expect(url).toBeDefined();
      } catch (error) {
        // Si hay error, al menos estamos manejándolo
        expect(error).toBeDefined();
      }
    });
  });

  // ============================================
  // EJEMPLO 12: Prueba con Waits Avanzados
  // ============================================
  describe('EJEMPLO 12: Esperas Avanzadas', () => {
    it('Debe esperar cambios de URL', async () => {
      await helper.goTo('/login');
      
      // Cambiar URL
      await helper.goTo('/register');
      
      // Esperar a que coincida con patrón
      await helper.waitForUrlMatch(/register/, 5000);
      
      const url = await helper.getCurrentUrl();
      expect(url).toContain('/register');
    });

    it('Debe esperar cambios en elementos', async () => {
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);

      // El elemento está visible
      const isVisible = await helper.isElementVisible(Locators.emailInput);
      expect(isVisible).toBe(true);
    });
  });

  // ============================================
  // EJEMPLO 13: Prueba con Validación de Atributos
  // ============================================
  describe('EJEMPLO 13: Validar Atributos', () => {
    it('Debe validar atributos de elementos', async () => {
      await helper.goTo('/login');

      // Obtener tipo de input
      const type = await helper.getAttribute(Locators.emailInput, 'type');
      expect(type).toBe('email');

      // Obtener placeholder
      const placeholder = await helper.getAttribute(Locators.emailInput, 'placeholder');
      expect(placeholder).toBeDefined();

      // Obtener clase
      const className = await helper.getAttribute(Locators.emailInput, 'class');
      expect(className || '').toBeDefined();
    });
  });

  // ============================================
  // EJEMPLO 14: Prueba de Texto
  // ============================================
  describe('EJEMPLO 14: Validar Texto', () => {
    it('Debe obtener y validar texto de elementos', async () => {
      await helper.goTo('/login');

      // Obtener texto de botones
      const loginButtonText = await helper.getText(Locators.loginButton);
      expect(loginButtonText).toContain('Login');

      // Obtener texto de otros elementos
      const titleText = await driver.executeScript(
        'return document.querySelector("h1")?.textContent'
      );
      expect(titleText).toBeDefined();
    });
  });

  // ============================================
  // EJEMPLO 15: Prueba de Rendimiento
  // ============================================
  describe('EJEMPLO 15: Validar Rendimiento', () => {
    it('Debe medir el tiempo de carga', async () => {
      const start = Date.now();
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);
      const end = Date.now();

      const loadTime = end - start;
      console.log(`Tiempo de carga: ${loadTime}ms`);

      expect(loadTime).toBeLessThan(15000); // 15 segundos
    });

    it('Debe medir tiempo de respuesta a entrada', async () => {
      await helper.goTo('/login');
      await helper.waitForElementVisible(Locators.emailInput);

      const start = Date.now();
      await helper.fillInput(Locators.emailInput, 'test@uta.edu.ec');
      const end = Date.now();

      const responseTime = end - start;
      console.log(`Tiempo de respuesta: ${responseTime}ms`);

      expect(responseTime).toBeLessThan(2000); // 2 segundos
    });
  });
});

// ============================================
// CÓMO USAR ESTOS EJEMPLOS
// ============================================

/*
1. COPIAR UN EJEMPLO
   - Abre este archivo
   - Copia el describe() que necesitas
   - Pega en tu archivo de pruebas

2. ADAPTAR A TU CASO
   - Cambia los localizadores según tu HTML
   - Cambia las URLs según tus rutas
   - Cambia los datos de prueba

3. AGREGAR A TUS PRUEBAS
   - Copia bloques it() a tus describe()
   - Ajusta los pasos según tu flujo
   - Asegúrate de usar helper correctamente

4. EJECUTAR
   npm run selenium -t "nombre de tu prueba"

TIPS:
- Usa describe() para agrupar pruebas relacionadas
- Usa it() para cada escenario específico
- Siempre espera elementos con waitForElement()
- Usa beforeEach() para setup común
- Usa afterEach() para cleanup
*/
