# Mobile Tests — Contexto completo

## Stack de testing

| Herramienta | Versión | Uso |
|-------------|---------|-----|
| jest-expo | 56 | Preset principal |
| jest | 29 | Runner |
| @testing-library/react-native | 13 | RNTL — componentes |
| Maestro | latest | E2E en dispositivo real |

**Comandos:**
```bash
# Correr todos los tests unitarios
npx jest --testPathPattern="src/__tests__" --no-coverage

# Correr un archivo específico
npx jest --testPathPattern="src/__tests__/auth/LoginScreen" --no-coverage

# Maestro E2E (dispositivo conectado o emulador corriendo)
maestro test mobile/.maestro/flows/01_auth.yaml
```

---

## Estado de fases

| Fase | Tests | Estado |
|------|-------|--------|
| A — Auth screens | 59 | ✅ Completa |
| B — Passenger screens | 65 | ✅ Completa |
| C — Profile + MisViajes | 40 | ✅ Completa |
| D — Maestro E2E | 5 flows | ✅ Completa |

---

## Fase A — Auth (59 tests) ✅

| Archivo | Tests |
|---------|-------|
| `src/__tests__/auth/LoginScreen.test.tsx` | 14 |
| `src/__tests__/auth/RegisterScreen.test.tsx` | 16 |
| `src/__tests__/auth/OTPScreen.test.tsx` | 13 |
| `src/__tests__/auth/ForgotPasswordScreen.test.tsx` | 16 |

---

## Fase B — Passenger screens (65 tests) ✅

| Archivo | Tests |
|---------|-------|
| `src/__tests__/passenger/HomePasajeroScreen.test.tsx` | 13 |
| `src/__tests__/passenger/TripDetailScreen.test.tsx` | 10 |
| `src/__tests__/passenger/HistorialPasajeroScreen.test.tsx` | 12 |
| `src/__tests__/passenger/SolicitudesScreen.test.tsx` | 18 |
| `src/__tests__/passenger/WalletScreen.test.tsx` | 12 |

---

## Fase C — Profile + MisViajes (40 tests) ✅

| Archivo | Tests |
|---------|-------|
| `src/__tests__/profile/ProfileScreen.test.tsx` | 14 |
| `src/__tests__/trips/MisViajesScreen.test.tsx` | 26 |

**Nota importante MisViajesScreen:**
- Tab "Activas" muestra solo PENDING + ACCEPTED
- Tab "Historial" muestra solo COMPLETED
- REJECTED y CANCELLED **nunca aparecen** en esta pantalla — son responsabilidad de `HistorialPasajeroScreen`
- El código de `TripRequestCard` para REJECTED existe pero es letra muerta en el contexto de `MisViajesScreen`

---

## Fase D — Maestro E2E

### D1 — Auth + seed (✅ Lista)

**Seed (`server/prisma/seed.ts`)** — usuarios E2E añadidos:
- `e2e.passenger@uta.edu.ec` / `E2ETest123!` — STUDENT sin vehículo
- `e2e.driver@uta.edu.ec` / `E2ETest123!` — STUDENT con Toyota Corolla 2020 / ABC-1234 / Blanco

**Archivos creados:**
```
mobile/.maestro/
├── subflows/
│   ├── login.yaml      # parametrizado con ${EMAIL} y ${PASSWORD}
│   └── logout.yaml     # navega a tab Perfil → Cerrar Sesión
└── flows/
    └── 01_auth.yaml    # login pasajero + logout + login conductor + logout
```

**`appId` de Expo Go:** `host.exp.exponent`
(Si se buildea APK standalone usar `com.anonymous.mobile`)

---

### D2 — Perfil + Wallet (✅ Lista)

- `mobile/.maestro/flows/04_perfil.yaml`
  - Login como pasajero → tab Perfil → verificar PUNTUACIÓN y PASAJERO
  - Historial (MisViajesScreen) → swipe back
  - U-Wallet (WalletScreen) → swipe back → Logout

- `mobile/.maestro/flows/05_wallet.yaml`
  - Login como pasajero → Perfil → U-Wallet
  - Verificar "Saldo disponible" → tap "Recargar"
  - Modal: ingresar $10.00 → confirmar → modal se cierra → Logout

---

### D3 — Buscar + Publicar viaje (✅ Lista)

- `mobile/.maestro/flows/02_buscar_viajes.yaml`
  - Login como pasajero → verificar chips de filtro
  - Filtrar por "Campus Norte" → resetear a "Todos"
  - Condicional: si hay viaje → abrir detalle → volver
  - Si no hay viajes → verificar estado vacío → Logout

- `mobile/.maestro/flows/03_publicar_viaje.yaml`
  - Login como conductor → tap "Publicar Viaje"
  - Seleccionar "Campus Huachi" → tap destino → LocationPicker WebView
  - Tap centro del mapa → "Confirmar ubicación"
  - Ajustar hora a 23:30 via time picker (Android keyboard mode)
  - Precio: $0.50 → tap "Publicar Viaje" → verificar Alert "¡Viaje publicado!"
  - Verificar en tab "Activos" → Logout
  
  **Notas de implementación:**
  - `testID="time-picker-btn"` añadido en `CreateTripScreen.tsx` para acceso robusto
  - LocationPicker: `tapOn: point: "50%, 55%"` para el mapa WebView; luego `tapOn: text: "Confirmar ubicación"`
  - Time picker Android keyboard mode: `description: "Switch to text input mode"` → inputText `"2330"` → OK

---

## Infraestructura de tests (RNTL)

### Helper principal

`src/__tests__/test-utils.tsx` exporta `renderWithProviders` que envuelve con:
- `SafeAreaProvider`
- `QueryClientProvider` (QueryClient con `retry: false, gcTime: 0`)
- `NavigationContainer`

### Setup global

`src/__tests__/setup.ts` mockea automáticamente:
- `AsyncStorage`
- `expo-linear-gradient`
- `@expo/vector-icons` → Ionicons renderiza como `<Text testID="icon-{name}" />`
- `expo-font`, `expo-location`, `socket.io-client`
- `react-native-safe-area-context`
- Suprime `console.error` para `'Warning:'` y `'Each child in a list'`

---

## Patrones críticos

### 1. Mock de APIs (patrón correcto para jest-expo)

jest-expo **no hace hoist** de variables `const mockX = jest.fn()` antes del factory de `jest.mock()`.

```ts
// ✅ Correcto
jest.mock('../../api/auth.api', () => ({
  authApi: { login: jest.fn() },
}));

import { authApi } from '../../api/auth.api';
const mockLogin = authApi.login as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// En cada test:
mockLogin.mockResolvedValue({ data: { token: 'tok' } });
```

### 2. fireEvent (NO userEvent.type)

`userEvent.type()` de RNTL v13 no dispara `onPress` en `TouchableOpacity` anidado dentro de `LinearGradient → View`.

```ts
// ✅ Siempre usar:
fireEvent.changeText(screen.getByPlaceholderText('...'), 'valor');
fireEvent.press(screen.getByText('Botón'));

// Para assertions async:
await waitFor(() => expect(mockFn).toHaveBeenCalledWith(...));
```

### 3. Mock de componentes con JSX en factory

`React` no está en scope dentro de `jest.mock()`.

```ts
// ✅ Correcto: usar require() dentro del factory
jest.mock('../../components/RatingModal', () => ({
  __esModule: true,
  default: ({ targetName }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View, { testID: 'rating-modal' },
      React.createElement(Text, null, `Calificar a ${targetName}`)
    );
  },
}));
```

### 4. useNavigation hook

```ts
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

import { useNavigation } from '@react-navigation/native';
const mockUseNavigation = useNavigation as jest.Mock;

beforeEach(() => {
  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
    goBack: jest.fn(),
    getParent: jest.fn().mockReturnValue({ navigate: jest.fn() }),
  });
});
```

### 5. useAuthStore — con y sin selector

`ProfileScreen` llama `useAuthStore()` sin selector (destructura el estado completo).
El mock debe manejar ambos casos:

```ts
(useAuthStore as jest.Mock).mockImplementation((selector?: (s: any) => any) => {
  const state = { user: mockUser, clearAuth: mockClearAuth, accessToken: 'tok' };
  return selector ? selector(state) : state;
});
```

### 6. toBeNull() — evitar falso positivo durante carga

```ts
// ❌ Pasa inmediatamente en estado loading (el elemento tampoco existe durante carga)
await waitFor(() => expect(screen.queryByText('Calificar')).toBeNull());

// ✅ Esperar que los datos carguen primero, luego verificar ausencia
await waitFor(() => expect(screen.getByText('COMPLETADO')).toBeTruthy());
expect(screen.queryByText('Calificar')).toBeNull();
```

### 7. Colisión de texto en HomePasajeroScreen

Los chips de filtro usan zonas reales: `['Todos', 'Campus Norte', 'Centro', 'Los Shyris', 'Ficoa', 'Huachi']`.

En tests, usar zonas **ficticias** para el `originZone`/`destinationZone` de los viajes mock:
- `Atocha`, `Bellavista`, `Celiano`, `Miraflores`

Así `getByText('Atocha')` no colisiona con ningún chip.

### 8. Alert — extraer botones para simular confirmación

```ts
jest.spyOn(Alert, 'alert');

fireEvent.press(screen.getByText('Cancelar viaje'));

const alertSpy = Alert.alert as jest.Mock;
const buttons: any[] = alertSpy.mock.calls[0][2];
const confirmBtn = buttons.find((b: any) => b.text === 'Confirmar');
confirmBtn.onPress();

await waitFor(() => expect(mockCancelRequest).toHaveBeenCalledWith('req-1'));
```

### 9. FUTURE_DEPARTURE en MisViajesScreen

`buildCancelDialog()` en `TripRequestCard` cambia el mensaje según `minsLeft < 10`.
Usar siempre una hora de salida con >10 min de margen:

```ts
const FUTURE_DEPARTURE = new Date(Date.now() + 90 * 60_000).toISOString();
```

---

## Textos UI reales (para Maestro)

| Elemento | Texto exacto |
|----------|-------------|
| Logo LoginScreen | `U-Ride` |
| Logo ProfileScreen | `U-RIDE` |
| Placeholder email | `estudiante@uta.edu.ec` |
| Placeholder password | `••••••••` |
| Botón login | `Iniciar Sesión  →` (dos espacios antes de →) |
| Primera pantalla post-login | `Buscar Viaje` |
| Tab bar | `Buscar`, `Publicar`, `Avisos`, `Perfil` |
| Botón logout | `Cerrar Sesión` |
