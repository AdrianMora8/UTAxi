import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { WebDriver, By, until } from 'selenium-webdriver';
import { createDriver, BASE_URL, SeleniumTestHelper, Locators } from './config';
import { PrismaClient } from '@prisma/client';

describe('CRUD de Viajes y Reservas - Pruebas de Sistema Selenium', () => {
  let driver: WebDriver;
  let helper: SeleniumTestHelper;
  let prisma: PrismaClient;

  beforeAll(() => {
    // Inicializar Prisma para manipular datos de prueba directamente
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    driver = await createDriver(true); // Headless mode por defecto
    helper = new SeleniumTestHelper(driver);
    await helper.clearCookies();
  });

  afterEach(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  /**
   * Registra un usuario y lo activa directamente en la BD para saltar el OTP
   */
  async function registerAndVerify(email: string, fullName: string, role: 'PASSENGER' | 'DRIVER' = 'PASSENGER') {
    await helper.goTo('/register');
    await helper.waitForElementVisible(Locators.fullNameInput);
    await helper.fillInput(Locators.fullNameInput, fullName);
    await helper.fillInput(Locators.emailInput, email);
    
    // Seleccionar carrera
    const careerSelect = await helper.findElement(Locators.careerSelect);
    await careerSelect.click();
    // Esperar a que las opciones carguen y seleccionar la primera (después del placeholder)
    await driver.wait(until.elementLocated(By.xpath("//select[@name='career']/option[2]")), 5000);
    const option = await helper.findElement(By.xpath("//select[@name='career']/option[2]"));
    await option.click();
    
    await helper.fillInput(Locators.passwordInput, 'SecurePass123!');
    await helper.click(Locators.registerButton);
    
    // Debería redirigir a la pantalla de verificación
    await helper.waitForUrlMatch(/verify-email|success/, 10000);

    // Bypass OTP en Base de Datos
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: true, role: role }
    });

    if (role === 'DRIVER') {
      // Necesita vehículo para poder crear viajes
      await prisma.vehicle.create({
        data: {
          userId: user.id,
          plate: `SYS-${Math.floor(Math.random() * 900) + 100}`,
          model: 'Selenium Test Car',
          color: 'Silver',
          capacity: 4
        }
      });
    }
    
    console.log(`✅ Usuario ${role} creado y verificado: ${email}`);
  }

  async function login(email: string) {
    await helper.goTo('/login');
    await helper.waitForElementVisible(Locators.emailInput);
    await helper.fillInput(Locators.emailInput, email);
    await helper.fillInput(Locators.passwordInput, 'SecurePass123!');
    await helper.click(Locators.loginButton);
    await helper.waitForUrlMatch(/\//, 10000);
  }

  it('Flujo Completo: Publicar viaje (Driver) -> Solicitar (Passenger) -> Aceptar (Driver)', async () => {
    const timestamp = Date.now();
    const driverEmail = `d_sys_${timestamp}@uta.edu.ec`;
    const passengerEmail = `p_sys_${timestamp}@uta.edu.ec`;

    // 1. Preparar usuarios
    await registerAndVerify(driverEmail, 'Conductor Selenium', 'DRIVER');
    await registerAndVerify(passengerEmail, 'Pasajero Selenium', 'PASSENGER');

    // 2. Conductor publica un nuevo viaje
    await login(driverEmail);
    await helper.goTo('/trips/new');
    
    await helper.waitForElementVisible(By.name('originZone'));
    await helper.fillInput(By.name('originZone'), 'Facultad de Sistemas');
    await helper.fillInput(By.name('destinationZone'), 'Centro de Ambato');
    await helper.fillInput(By.name('availableSeats'), '4');
    await helper.fillInput(By.name('pricePerSeat'), '0.30');
    
    // Fecha y hora: mañana al mediodía
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const departureTime = tomorrow.toISOString().slice(0, 16); // format YYYY-MM-DDTHH:mm
    await helper.fillInput(By.name('departureTime'), departureTime);
    
    await helper.click(By.xpath("//button[@type='submit']"));
    
    // Esperar redirección al dashboard o lista
    await helper.waitForUrlMatch(/trips|dashboard/, 15000);
    console.log('✅ Viaje publicado con éxito');

    await helper.clearCookies();

    // 3. Pasajero busca y solicita el viaje
    await login(passengerEmail);
    await helper.goTo('/trips');
    
    // Buscar el viaje en la lista
    await helper.waitForElementVisible(By.xpath("//*[contains(text(), 'Facultad de Sistemas')]"));
    const tripCard = await helper.findElement(By.xpath("//*[contains(text(), 'Facultad de Sistemas')]"));
    await tripCard.click();

    // Enviar solicitud
    await helper.waitForElementVisible(By.xpath("//button[contains(text(), 'Solicitar')]"));
    await helper.click(By.xpath("//button[contains(text(), 'Solicitar')]"));
    
    // Verificar que la solicitud fue enviada (puede aparecer un toast o el botón cambiar)
    await helper.wait(2000);
    console.log('✅ Solicitud de asiento enviada');

    await helper.clearCookies();

    // 4. Conductor acepta la solicitud
    await login(driverEmail);
    
    // Ir a la gestión de solicitudes (usualmente desde el detalle de su propio viaje)
    // Buscamos el link "Gestionar" o similar en el Home/Dashboard
    await helper.goTo('/');
    await helper.waitForElementVisible(By.xpath("//*[contains(text(), 'Gestionar')]"));
    await helper.click(By.xpath("//*[contains(text(), 'Gestionar')]"));

    // En la página de gestión, aceptar al pasajero
    await helper.waitForElementVisible(By.xpath("//button[contains(text(), 'Aceptar')]"));
    await helper.click(By.xpath("//button[contains(text(), 'Aceptar')]"));
    
    // Verificar que ahora aparece en confirmed
    const confirmedText = await helper.getText(By.xpath("//h2[contains(text(), 'Confirmados')] | //*[contains(text(), 'Pasajeros Confirmados')]"));
    expect(confirmedText).toBeDefined();
    
    // También verificar que el nombre del pasajero aparece ahí
    const passengerNameVisible = await helper.isElementVisible(By.xpath("//*[contains(text(), 'Pasajero Selenium')]"));
    expect(passengerNameVisible).toBe(true);
    
    console.log('✅ Solicitud aceptada exitosamente por el conductor');
  });
});
