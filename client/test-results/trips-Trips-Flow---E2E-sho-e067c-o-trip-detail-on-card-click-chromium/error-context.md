# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: trips.spec.ts >> Trips Flow - E2E >> should navigate to trip detail on card click
- Location: tests\e2e\trips.spec.ts:29:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href^="/trips/"]:not([href="/trips/new"])').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('a[href^="/trips/"]:not([href="/trips/new"])').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - link "U-Ride" [ref=e6] [cursor=pointer]:
        - /url: /
      - generic [ref=e7]:
        - link "Buscar Viaje" [ref=e8] [cursor=pointer]:
          - /url: /trips
        - link "Publicar Viaje" [ref=e9] [cursor=pointer]:
          - /url: /trips/new
        - link "Mis Solicitudes" [ref=e10] [cursor=pointer]:
          - /url: /requests
        - link "Mis Viajes" [ref=e11] [cursor=pointer]:
          - /url: /my-trips
        - link "U-Wallet" [ref=e12] [cursor=pointer]:
          - /url: /wallet
        - generic [ref=e13]:
          - generic [ref=e14]: Conductor / Pasajero
          - link "account_circle" [ref=e15] [cursor=pointer]:
            - /url: /profile
          - button "logout" [ref=e16] [cursor=pointer]
  - main [ref=e17]:
    - generic [ref=e18]:
      - main [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]:
            - heading "Kinetic Movement for the Academic Mind." [level=1] [ref=e22]
            - paragraph [ref=e23]: Conecta con compañeros para un traslado más seguro, inteligente y sostenible al campus.
          - generic [ref=e25]:
            - generic [ref=e26]:
              - generic [ref=e27]: Zona de Origen
              - generic [ref=e28]:
                - generic [ref=e29]: location_on
                - textbox "¿De dónde sales?" [ref=e30]
            - generic [ref=e31]:
              - generic [ref=e32]: Zona de Destino
              - generic [ref=e33]:
                - generic [ref=e34]: near_me
                - textbox "¿A dónde vas?" [ref=e35]
            - generic [ref=e36]:
              - generic [ref=e37]: Horario
              - generic [ref=e38]:
                - generic [ref=e39]: schedule
                - textbox [ref=e40]
            - button "search Encontrar Viaje" [ref=e41] [cursor=pointer]:
              - generic [ref=e42]: search
              - text: Encontrar Viaje
        - generic [ref=e43]:
          - generic [ref=e44]:
            - heading "Viajes Disponibles" [level=2] [ref=e45]
            - paragraph [ref=e46]: 0 rutas encontradas
          - generic [ref=e47]:
            - button "MÁS RECIENTES" [ref=e48] [cursor=pointer]
            - button "MEJOR CALIFICADOS" [ref=e49] [cursor=pointer]
        - generic [ref=e50]:
          - generic [ref=e51]: directions_car
          - paragraph [ref=e52]: No hay viajes disponibles con esos filtros.
          - button "Limpiar filtros" [ref=e53] [cursor=pointer]
        - generic [ref=e54]:
          - generic [ref=e57]: shield
          - generic [ref=e58]:
            - heading "Protocolo de Seguridad Académica" [level=3] [ref=e59]
            - paragraph [ref=e60]: Todos los conductores en U-Ride son estudiantes o personal verificado con correo institucional @uta.edu.ec. Tu viaje está monitoreado por GPS en tiempo real para tu tranquilidad.
          - generic [ref=e61]: Ver Reglas
      - generic [ref=e63]:
        - generic [ref=e64]:
          - text: U-Ride
          - paragraph [ref=e65]: © 2024 U-Ride Institutional. Powered by Academic Kinetic.
        - generic [ref=e66]:
          - generic [ref=e67]: Centro de Ayuda
          - generic [ref=e68]: Reglas de Seguridad
          - generic [ref=e69]: Privacidad
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | 
  3  | async function login(page: Page) {
  4  |   await page.goto('/login');
  5  |   await page.fill('input[placeholder="usuario@uta.edu.ec"]', 'student1@uta.edu.ec');
  6  |   await page.fill('input[placeholder="••••••••"]', 'Password123!');
  7  |   await page.click('button:has-text("Iniciar Sesión")');
  8  |   await expect(page).toHaveURL(/.*trips/, { timeout: 10000 });
  9  | }
  10 | 
  11 | test.describe('Trips Flow - E2E', () => {
  12 |   test.beforeEach(async ({ page }) => {
  13 |     await login(page);
  14 |   });
  15 | 
  16 |   test('should show trips list with heading', async ({ page }) => {
  17 |     await page.goto('/trips');
  18 | 
  19 |     await expect(page.locator('h2:has-text("Viajes Disponibles")')).toBeVisible();
  20 |   });
  21 | 
  22 |   test('should show sort buttons on trips list', async ({ page }) => {
  23 |     await page.goto('/trips');
  24 | 
  25 |     await expect(page.locator('button:has-text("MÁS RECIENTES")')).toBeVisible();
  26 |     await expect(page.locator('button:has-text("MEJOR CALIFICADOS")')).toBeVisible();
  27 |   });
  28 | 
  29 |   test('should navigate to trip detail on card click', async ({ page }) => {
  30 |     await page.goto('/trips');
  31 | 
  32 |     // Wait for at least one trip card to appear (Link to /trips/:id)
  33 |     const firstCard = page.locator('a[href^="/trips/"]:not([href="/trips/new"])').first();
> 34 |     await expect(firstCard).toBeVisible({ timeout: 10000 });
     |                             ^ Error: expect(locator).toBeVisible() failed
  35 |     await firstCard.click();
  36 | 
  37 |     await expect(page).toHaveURL(/\/trips\/[^/]+$/, { timeout: 8000 });
  38 |     await expect(page.locator('text="Itinerario del Viaje"')).toBeVisible();
  39 |   });
  40 | 
  41 |   test('should show Solicitar Unirse button on a trip not owned by user', async ({ page }) => {
  42 |     await page.goto('/trips');
  43 | 
  44 |     const firstCard = page.locator('a[href^="/trips/"]:not([href="/trips/new"])').first();
  45 |     await expect(firstCard).toBeVisible({ timeout: 10000 });
  46 |     await firstCard.click();
  47 | 
  48 |     // Could be "Solicitar Unirse", "Gestionar Solicitudes" (if driver), or "¡Solicitud enviada!"
  49 |     const actionPanel = page.locator('button:has-text("Solicitar Unirse"), button:has-text("Gestionar Solicitudes"), div:has-text("¡Solicitud enviada!")');
  50 |     await expect(actionPanel).toBeVisible({ timeout: 8000 });
  51 |   });
  52 | 
  53 |   test('should filter trips by origin zone', async ({ page }) => {
  54 |     await page.goto('/trips');
  55 | 
  56 |     await page.fill('input[placeholder="¿De dónde sales?"]', 'Campus');
  57 |     await page.click('button:has-text("Encontrar Viaje")');
  58 | 
  59 |     // Either shows results with "Campus" or empty state message
  60 |     const results = page.locator('text=/Campus|No hay viajes disponibles/i');
  61 |     await expect(results).toBeVisible({ timeout: 8000 });
  62 |   });
  63 | 
  64 |   test('should filter trips by destination zone', async ({ page }) => {
  65 |     await page.goto('/trips');
  66 | 
  67 |     await page.fill('input[placeholder="¿A dónde vas?"]', 'Huachi');
  68 |     await page.click('button:has-text("Encontrar Viaje")');
  69 | 
  70 |     const results = page.locator('text=/Huachi|No hay viajes disponibles/i');
  71 |     await expect(results).toBeVisible({ timeout: 8000 });
  72 |   });
  73 | 
  74 |   test('should show empty state when no trips match filter', async ({ page }) => {
  75 |     await page.goto('/trips');
  76 | 
  77 |     await page.fill('input[placeholder="¿A dónde vas?"]', 'ZonaInexistente99999');
  78 |     await page.click('button:has-text("Encontrar Viaje")');
  79 | 
  80 |     await expect(page.locator('text="No hay viajes disponibles con esos filtros."')).toBeVisible({ timeout: 8000 });
  81 |   });
  82 | 
  83 |   test('should clear filters and show all trips again', async ({ page }) => {
  84 |     await page.goto('/trips');
  85 | 
  86 |     await page.fill('input[placeholder="¿A dónde vas?"]', 'ZonaInexistente99999');
  87 |     await page.click('button:has-text("Encontrar Viaje")');
  88 |     await expect(page.locator('text="No hay viajes disponibles con esos filtros."')).toBeVisible({ timeout: 8000 });
  89 | 
  90 |     await page.click('button:has-text("Limpiar filtros")');
  91 | 
  92 |     await expect(page.locator('h2:has-text("Viajes Disponibles")')).toBeVisible();
  93 |   });
  94 | });
  95 | 
```