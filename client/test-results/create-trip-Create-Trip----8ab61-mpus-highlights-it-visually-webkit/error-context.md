# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: create-trip.spec.ts >> Create Trip - E2E >> authenticated >> selecting a campus highlights it visually
- Location: tests\e2e\create-trip.spec.ts:98:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text("Campus Huachi")').locator('text="check"')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button:has-text("Campus Huachi")').locator('text="check"')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - link "U-Ride" [ref=e6]:
        - /url: /
      - generic [ref=e7]:
        - link "Buscar Viaje" [ref=e8]:
          - /url: /trips
        - link "Publicar Viaje" [ref=e9]:
          - /url: /trips/new
        - link "Mis Solicitudes" [ref=e10]:
          - /url: /requests
        - link "Mis Viajes" [ref=e11]:
          - /url: /my-trips
        - link "U-Wallet" [ref=e12]:
          - /url: /wallet
        - generic [ref=e13]:
          - generic [ref=e14]: Conductor / Pasajero
          - link "account_circle" [ref=e15]:
            - /url: /profile
          - button "logout" [ref=e16] [cursor=pointer]
  - main [ref=e17]:
    - generic [ref=e18]:
      - main [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]:
            - heading "PLANEA TU MOVIMIENTO." [level=1] [ref=e22]
            - paragraph [ref=e23]: Establece tu ruta, horario y conecta con otros estudiantes para el viaje diario al campus.
          - generic [ref=e24]:
            - generic [ref=e25]:
              - generic [ref=e26]:
                - generic [ref=e27]: Campus de Origen
                - generic [ref=e28]:
                  - button "school Campus Huachi Campus central — Av. Los Chasquis check_circle" [ref=e29] [cursor=pointer]:
                    - generic [ref=e31]: school
                    - generic [ref=e32]:
                      - paragraph [ref=e33]: Campus Huachi
                      - paragraph [ref=e34]: Campus central — Av. Los Chasquis
                    - generic [ref=e35]: check_circle
                  - button "school Campus Querochamba Fac. Ciencias Agropecuarias — Cevallos" [ref=e36] [cursor=pointer]:
                    - generic [ref=e38]: school
                    - generic [ref=e39]:
                      - paragraph [ref=e40]: Campus Querochamba
                      - paragraph [ref=e41]: Fac. Ciencias Agropecuarias — Cevallos
                  - button "school Campus Ingahurco Fac. Jurisprudencia y Ciencias Sociales" [ref=e42] [cursor=pointer]:
                    - generic [ref=e44]: school
                    - generic [ref=e45]:
                      - paragraph [ref=e46]: Campus Ingahurco
                      - paragraph [ref=e47]: Fac. Jurisprudencia y Ciencias Sociales
              - generic [ref=e48]:
                - generic [ref=e49]: Punto de Llegada
                - generic [ref=e50]:
                  - generic [ref=e51]:
                    - generic: search
                    - textbox "Buscar calle, barrio, sector..." [ref=e52]
                  - generic [ref=e53]:
                    - generic [ref=e55]:
                      - button "Zoom in" [ref=e56] [cursor=pointer]: +
                      - button "Zoom out" [ref=e57] [cursor=pointer]: −
                    - generic:
                      - generic: Busca o toca el mapa para elegir destino
            - generic [ref=e58]:
              - generic [ref=e59]:
                - generic [ref=e60]: Fecha
                - textbox [ref=e61]
              - generic [ref=e62]:
                - generic [ref=e63]: Hora Salida
                - textbox [ref=e64]
              - generic [ref=e65]:
                - generic [ref=e66]: Asientos
                - generic [ref=e67]:
                  - button "remove" [ref=e68] [cursor=pointer]:
                    - generic [ref=e69]: remove
                  - spinbutton [ref=e70]: "3"
                  - button "add" [ref=e71] [cursor=pointer]:
                    - generic [ref=e72]: add
            - generic [ref=e73]:
              - generic [ref=e74]: Precio por Asiento (USD)
              - generic [ref=e75]:
                - generic [ref=e76]: $
                - spinbutton [ref=e77]: "1.5"
            - generic [ref=e78]:
              - generic [ref=e79]: Notas del Conductor & Reglas
              - 'textbox "Ej: No fumar en el auto. Puntualidad requerida. Máximo una maleta pequeña..." [ref=e80]'
            - generic [ref=e81]:
              - button "Publicar Viaje" [ref=e82] [cursor=pointer]
              - button "Cancelar" [ref=e83] [cursor=pointer]
        - generic [ref=e85]:
          - generic [ref=e86]:
            - button [ref=e88] [cursor=pointer]
            - generic [ref=e92]:
              - generic [ref=e93]:
                - generic [ref=e94]: Vista Previa de Ruta
                - generic [ref=e95]: Ambato, Ecuador
              - generic [ref=e101]:
                - generic [ref=e102]: Campus Huachi
                - generic [ref=e103]: Destino
          - generic [ref=e104]:
            - heading "Kinetic Insights" [level=3] [ref=e105]
            - generic [ref=e106]:
              - generic [ref=e107]:
                - generic [ref=e108]: trending_up
                - paragraph [ref=e109]: Publicar en horarios de entrada/salida aumenta tus posibilidades de encontrar pasajeros en un 85%.
              - generic [ref=e110]:
                - generic [ref=e111]: eco
                - paragraph [ref=e112]:
                  - text: Compartir viaje con 3 pasajeros ahorra aproximadamente
                  - generic [ref=e113]: 4.2 kg de CO₂
                  - text: respecto a viajes individuales.
              - generic [ref=e114]:
                - generic [ref=e115]: payments
                - paragraph [ref=e116]:
                  - text: Con 3 asientos a $1.5 c/u, puedes generar
                  - generic [ref=e117]: $4.50
                  - text: por viaje.
      - generic [ref=e119]:
        - generic [ref=e120]:
          - text: U-Ride
          - paragraph [ref=e121]: © 2024 U-Ride Institutional. Powered by Academic Kinetic.
        - generic [ref=e122]:
          - generic [ref=e123]: Centro de Ayuda
          - generic [ref=e124]: Privacidad
```

# Test source

```ts
  7   |   await page.click('button:has-text("Iniciar Sesión")');
  8   |   await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
  9   | }
  10  | 
  11  | test.describe('Create Trip - E2E', () => {
  12  |   test('should redirect to login when not authenticated', async ({ page }) => {
  13  |     await page.goto('/trips/new');
  14  |     await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  15  |   });
  16  | 
  17  |   test.describe('authenticated', () => {
  18  |     test.beforeEach(async ({ page }) => {
  19  |       await login(page);
  20  |     });
  21  | 
  22  |     test('should show the create trip form heading', async ({ page }) => {
  23  |       await page.goto('/trips/new');
  24  | 
  25  |       await expect(page.locator('text=/PLANEA TU/i')).toBeVisible({ timeout: 8000 });
  26  |       await expect(page.locator('button:has-text("Publicar Viaje")')).toBeVisible();
  27  |     });
  28  | 
  29  |     test('should show campus picker with UTA campus options', async ({ page }) => {
  30  |       await page.goto('/trips/new');
  31  | 
  32  |       await expect(page.locator('button:has-text("Campus Huachi")')).toBeVisible({ timeout: 8000 });
  33  |       await expect(page.locator('button:has-text("Campus Ingahurco")')).toBeVisible();
  34  |       await expect(page.locator('button:has-text("Campus Querochamba")')).toBeVisible();
  35  |     });
  36  | 
  37  |     test('should show destination field with search input', async ({ page }) => {
  38  |       await page.goto('/trips/new');
  39  | 
  40  |       await expect(
  41  |         page.locator('input[placeholder="Buscar calle, barrio, sector..."]')
  42  |       ).toBeVisible({ timeout: 8000 });
  43  |     });
  44  | 
  45  |     test('should show date, time, seats and price fields', async ({ page }) => {
  46  |       await page.goto('/trips/new');
  47  | 
  48  |       await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 8000 });
  49  |       await expect(page.locator('input[type="time"]')).toBeVisible();
  50  |       await expect(page.locator('input[type="number"]').first()).toBeVisible();
  51  |     });
  52  | 
  53  |     test('should show campus validation error when submitting without campus', async ({ page }) => {
  54  |       await page.goto('/trips/new');
  55  | 
  56  |       // Llenar fecha y hora para que pase la validación Zod
  57  |       await page.locator('input[type="date"]').fill('2026-12-01');
  58  |       await page.locator('input[type="time"]').fill('08:00');
  59  |       await page.click('button:has-text("Publicar Viaje")');
  60  | 
  61  |       await expect(
  62  |         page.locator('text="Selecciona el campus de origen"')
  63  |       ).toBeVisible({ timeout: 8000 });
  64  |     });
  65  | 
  66  |     test('should show destination validation error when campus selected but no destination', async ({ page }) => {
  67  |       await page.goto('/trips/new');
  68  | 
  69  |       await page.click('button:has-text("Campus Huachi")');
  70  |       await page.locator('input[type="date"]').fill('2026-12-01');
  71  |       await page.locator('input[type="time"]').fill('08:00');
  72  |       await page.click('button:has-text("Publicar Viaje")');
  73  | 
  74  |       await expect(
  75  |         page.locator('text="Elige el destino en el mapa"')
  76  |       ).toBeVisible({ timeout: 8000 });
  77  |     });
  78  | 
  79  |     test('should show date validation error when date is empty', async ({ page }) => {
  80  |       await page.goto('/trips/new');
  81  | 
  82  |       await page.click('button:has-text("Campus Huachi")');
  83  |       await page.click('button:has-text("Publicar Viaje")');
  84  | 
  85  |       await expect(
  86  |         page.locator('text="Selecciona una fecha"')
  87  |       ).toBeVisible({ timeout: 8000 });
  88  |     });
  89  | 
  90  |     test('Cancelar button navigates back to /trips', async ({ page }) => {
  91  |       await page.goto('/trips/new');
  92  | 
  93  |       await page.click('button:has-text("Cancelar")');
  94  | 
  95  |       await expect(page).toHaveURL(/.*\/trips$/, { timeout: 8000 });
  96  |     });
  97  | 
  98  |     test('selecting a campus highlights it visually', async ({ page }) => {
  99  |       await page.goto('/trips/new');
  100 | 
  101 |       await page.click('button:has-text("Campus Huachi")');
  102 | 
  103 |       // El campus seleccionado muestra un check icon (material-symbols-outlined "check")
  104 |       const campusBtn = page.locator('button:has-text("Campus Huachi")');
  105 |       await expect(campusBtn).toBeVisible();
  106 |       // Verificar que el botón cambia estado (contiene el ícono check)
> 107 |       await expect(campusBtn.locator('text="check"')).toBeVisible();
      |                                                       ^ Error: expect(locator).toBeVisible() failed
  108 |     });
  109 |   });
  110 | });
  111 | 
```