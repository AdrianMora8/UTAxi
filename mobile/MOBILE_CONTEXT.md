# MOBILE_CONTEXT — UTAxi / U-Ride Mobile

> Documento de contexto para retomar la sesión exactamente donde quedó.
> Actualizado: 2026-05-10

---

## 1. Descripción del Proyecto

**UTAxi / U-Ride** es una app de ridesharing académico para estudiantes de la Universidad Técnica de Ambato (UTA). Solo correos `@uta.edu.ec`. El proyecto tiene un backend Node.js + Express + Prisma + PostgreSQL ya funcional, y este repositorio es la app **React Native (Expo) para Android**.

- **Sprint 2 deadline:** 20 mayo 2026
- **Plataforma:** Solo Android
- **Desarrollo:** Expo Go en celular físico (sin emulador)
- **Producción futura:** APK generado con `eas build` (junio, fuera de scope Sprint 2)
- **Backend:** No tocar salvo adiciones necesarias. Corre en `192.168.1.13:4000`

---

## 2. Stack Técnico

| Capa | Tecnología |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navegación | React Navigation v7 (native stack + bottom tabs) |
| Estado auth | Zustand + AsyncStorage (`uride-auth`) |
| Estado servidor | @tanstack/react-query |
| HTTP | axios con JWT Bearer + auto-refresh en 401 |
| Gradientes | expo-linear-gradient |
| Tipografía | @expo-google-fonts/space-grotesk + inter |
| Íconos | @expo/vector-icons (Ionicons) |
| Pickers | @react-native-community/datetimepicker |
| Safe area | react-native-safe-area-context |

---

## 3. Archivos Clave

### Configuración
- `src/config.ts` → `export const API_BASE_URL = 'http://192.168.1.13:4000/api'`
- `app.json` → `userInterfaceStyle: dark`, `softwareKeyboardLayoutMode: "pan"` (fix barra blanca teclado), plugins: `expo-font` + `@react-native-community/datetimepicker`

### Tema (`src/theme.ts`)
```ts
colors = {
  background: '#0e0e0e',   // base
  surface: '#131313',
  surfaceContainer: '#1a1919',
  surfaceHigh: '#262626',
  primary: '#9cff93',      // acid green
  primaryDark: '#00440a',
  text: '#ffffff',
  textMuted: '#888888',
  textDim: '#555555',
  error: '#ff4444',
}
fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
}
```

### Auth Store (`src/store/authStore.ts`)
```ts
interface AuthUser {
  id, email, fullName, role: 'STUDENT'|'ADMIN',
  status: 'ACTIVE'|'WARNED'|'SUSPENDED',
  emailVerified, reputationScore, photoUrl,
  career, phone, neighborhood
  // FALTA agregar: vehicle (Fase 6.2)
}
// Zustand + AsyncStorage persist, onRehydrateStorage sets isAuthenticated
```

### API Layer (`src/api/`)
- `client.ts` → axios instance, baseURL desde config.ts, `withCredentials: true`, interceptor auto-refresh en 401
- `auth.api.ts` → register, verifyEmail, resendCode, login, logout, forgotPassword, resetPassword
- `trips.api.ts` → getTrips(filters), getTripById, createTrip, getMyTrips(driverId)
- `requests.api.ts` → getRequestsByTrip, createRequest, respondToRequest, cancelRequest, getMyRequests

### Navegación (`src/navigation/`)
```
AppNavigator → espera hidratación AsyncStorage → AuthStack | MainTabs
AuthStack: Login → Register → OTP → ForgotPassword
MainTabs (bottom tabs: Buscar | Publicar | Avisos | Perfil):
  BuscarStack:   HomePasajero → TripDetail
  PublicarStack: HomeConductor → CreateTrip → Solicitudes
  AvisosScreen  (tab directo, placeholder)
  PerfilStack:   Profile → MisViajes
```
**Tab bar:** bg `#262626`, active green, inactive gray, height 64, sin borde top.

---

## 4. Sistema de Diseño — "The Academic Kinetic"

Mockup de referencia: `MOCKUPS-MOBILE/u_ride_kinetic/DESIGN.md`

- **Fondo:** `#0e0e0e` (true dark), sin bordes de 1px, separación solo por color
- **Tipografía:** Space Grotesk (display/headers) + Inter (body/labels)
- **Acento:** Acid Green `#9cff93` — úsalo con moderación
- **Botones primarios:** LinearGradient `#9cff93 → #00fc40` a 135°, texto `#00440a`
- **Botones secundarios:** bg `surfaceHigh`, sin borde
- **Inputs:** bg `surfaceContainer`, sin borde, sin outline
- **Tarjetas:** bg `surfaceContainer`, borderRadius 16, sin dividers, gap vertical
- **Chips seleccionados:** bg `primary` con animación "pulse"
- **Regla anti-borde:** nunca `borderWidth: 1` para separar secciones

---

## 5. Pantallas Implementadas ✅

### Auth
| Pantalla | Archivo | Mockup usado |
|---|---|---|
| Login | `screens/auth/LoginScreen.tsx` | `login_mobile` |
| Registro | `screens/auth/RegisterScreen.tsx` | `registro_mobile_final` |
| OTP | `screens/auth/OTPScreen.tsx` | `verificaci_n_otp_mobile` |
| Recuperar cuenta | `screens/auth/ForgotPasswordScreen.tsx` | `recuperar_cuenta_mobile_paso_1/2` |

### App — Pasajero
| Pantalla | Archivo | Mockup usado |
|---|---|---|
| Home Pasajero | `screens/app/HomePasajeroScreen.tsx` | `home_pasajero_mobile_dark_mode_final` |
| Detalle Viaje | `screens/app/TripDetailScreen.tsx` | `detalle_de_viaje_mobile` |
| Mis Viajes | `screens/app/MisViajesScreen.tsx` | `mis_viajes_mobile` |

### App — Conductor
| Pantalla | Archivo | Mockup usado |
|---|---|---|
| Home Conductor | `screens/app/HomeConductorScreen.tsx` | `home_conductor_mobile_final` |
| Crear Viaje | `screens/app/CreateTripScreen.tsx` | `crear_viaje_mobile_dark_mode` |
| Solicitudes | `screens/app/SolicitudesScreen.tsx` | `solicitudes_mobile` |

### App — Perfil
| Pantalla | Archivo | Mockup usado |
|---|---|---|
| Perfil | `screens/app/ProfileScreen.tsx` | `perfil_mobile_final` |
| Avisos | `screens/app/AvisosScreen.tsx` | (placeholder vacío) |

---

## 6. Bugs Resueltos (para no repetir)

| Bug | Causa | Fix |
|---|---|---|
| Barra blanca al cerrar teclado | Android keyboard layout | `softwareKeyboardLayoutMode: "pan"` en app.json + `behavior={undefined}` en KeyboardAvoidingView Android |
| Chips de filtros estirados | Faltaba flexDirection/alignItems en scroll | `alignItems: 'center'`, `flexDirection: 'row'` en row, `alignSelf: 'flex-start'` en chip |
| No había endpoint `driverId` en trips | Backend solo filtraba por status | Agregar `driverId` a `trips.service.ts` findMany y controller |
| API_BASE_URL hardcodeada | Mala práctica | Extraer a `src/config.ts` |
| `@expo/vector-icons` no encontrado | Faltaba instalación | `npx expo install @expo/vector-icons` |

---

## 7. Modificaciones al Backend (server/)

Solo se hicieron estas dos adiciones — no romper nada más:

1. `server/src/services/trips.service.ts` → agregado `driverId?: string` al filter y `where.driverId = filters.driverId`
2. `server/src/controllers/trips.controller.ts` → `driverId` leído de `req.query` y pasado al servicio

---

## 8. Mockups Disponibles en `MOCKUPS-MOBILE/`

Cada carpeta tiene `screen.png` (imagen) y `code.html` (referencia HTML).

| Carpeta | Usado | Estado |
|---|---|---|
| `u_ride_kinetic/` | Design system DESIGN.md | ✅ Referencia global |
| `login_mobile/` | LoginScreen | ✅ Completo |
| `registro_mobile_final/` | RegisterScreen | ✅ Completo |
| `verificaci_n_otp_mobile/` | OTPScreen | ✅ Completo |
| `recuperar_cuenta_mobile_paso_1/` | ForgotPasswordScreen step 1 | ✅ Completo |
| `recuperar_cuenta_mobile_paso_2/` | ForgotPasswordScreen step 2 | ✅ Completo |
| `home_pasajero_mobile_dark_mode_final/` | HomePasajeroScreen | ✅ Completo |
| `detalle_de_viaje_mobile/` | TripDetailScreen | ✅ Completo |
| `mis_viajes_mobile/` | MisViajesScreen | ✅ Completo |
| `home_conductor_mobile_final/` | HomeConductorScreen | ✅ Completo |
| `crear_viaje_mobile/` + `crear_viaje_mobile_dark_mode/` | CreateTripScreen | ✅ Completo |
| `solicitudes_mobile/` | SolicitudesScreen | ✅ Completo |
| `perfil_mobile_final/` | ProfileScreen | ✅ Completo (con tabs pendientes) |
| `viaje_activo_mobile/` | — | ❌ No implementado |
| `pago_simulado_mobile/` | — | ❌ No implementado |
| `reporte_de_usuario_mobile/` | — | ❌ No implementado |
| `admin_dashboard_mobile/` | — | ❌ Fuera de scope (rol ADMIN) |
| `MOCKUP-GENERAL.html` | — | Referencia general |

---

## 9. Plan de Fases Restantes

### Bloque 6 — Funcionalidades Faltantes (en curso)

#### Fase 6.1 — Editar Perfil + Vehículo ⬅️ SIGUIENTE
- ProfileScreen con dos tabs: "Datos" y "Vehículo"
- Tab Datos: editar fullName, career, phone, neighborhood → PATCH /users/me
- Tab Vehículo: form marca/modelo/año/placa/color → POST o PATCH /users/me/vehicle
- Al guardar → refrescar user en authStore con `setAuth`
- Mockup: `perfil_mobile_final`

#### Fase 6.2 — Tab "Publicar" condicional
- Agregar `vehicle` al tipo `AuthUser` en authStore
- Refrescar store al cargar app con GET /users/me
- En MainTabs: si `user.vehicle === null` → PublicarStack muestra pantalla "Registra tu vehículo en Perfil para publicar viajes" en lugar de HomeConductor

#### Fase 6.3 — Empezar Viaje + Pasajeros confirmados en SolicitudesScreen
- Botón "Empezar Viaje" (visible cuando trip.status === 'SCHEDULED') → PATCH /trips/:id/status `{ status: 'IN_PROGRESS' }`
- Sección "Pasajeros Confirmados" al final de la lista (requests con status ACCEPTED)
- Mockup: `solicitudes_mobile` (ya analizado)

#### Fase 6.4 — Cancelar Solicitud + Calificar funcional en MisViajesScreen
- Botón "Cancelar" en tarjetas con status PENDING → Alert confirmar → DELETE /requests/:id
- Botón "Calificar" navega a nueva `RatingScreen`
- RatingScreen: estrellas 1–5 + comentario opcional → POST /ratings → volver a MisViajes
- Agregar RatingScreen al PerfilStack en MainTabs
- Mockup: `mis_viajes_mobile`

#### Fase 6.5 — Reglas del conductor en CreateTripScreen
- Agregar campo textarea "Notas / Reglas del viaje" al formulario
- Mapear al campo `notes` del body en POST /trips
- Mostrar el campo `notes` en TripDetailScreen si existe
- Mockup: `crear_viaje_mobile_dark_mode`

#### Fase 6.6 — Pago Simulado
- Nueva pantalla `PaymentScreen`
- Resumen del viaje (destino, precio, conductor)
- Form decorativo: tarjeta prerrellenada con `•••• •••• •••• 4242`
- POST /payments/:requestId/confirm → estado "¡Pago Confirmado!" → invalidar query + navegar
- Acceso desde MisViajesScreen en tarjetas ACCEPTED
- Mockup: `pago_simulado_mobile`

#### Fase 6.7 — Reportar Usuario
- Nueva pantalla `ReportScreen`
- Dropdown con 6 motivos (INAPPROPRIATE_BEHAVIOR, NO_SHOW, UNSAFE_DRIVING, FRAUD, HARASSMENT, OTHER)
- Textarea descripción (mín 10, máx 1000 chars)
- Adjunto imagen opcional (expo-image-picker)
- POST /reports (multipart) → estado éxito
- Acceso desde TripDetailScreen botón "Reportar conductor"
- Mockup: `reporte_de_usuario_mobile`

#### Fase 6.8 — TypeScript final + smoke test general
- `npx tsc --noEmit` limpio
- Navegar todos los flujos manualmente en Expo Go
- Verificar que no hay imports rotos ni pantallas sin registrar

---

### Bloque 7 — Tests

**Stack acordado (migración de plan web a mobile):**

| Tipo | Herramienta | Notas |
|---|---|---|
| Unitarios / Store / API | Jest | Mocks: expo-linear-gradient, @expo/vector-icons, AsyncStorage, expo-font |
| Componentes UI | @testing-library/react-native | Misma API que RTL web |
| E2E en dispositivo | Maestro | Flujos YAML, corre en celular físico sin emulador |
| Carga API | Artillery | Mismo que web, ataca el backend directamente |
| Seguridad DAST | OWASP ZAP | Mismo que web, ataca el backend |
| Análisis estático | ESLint + SonarQube | Sin cambio |

**Orden de implementación dentro del bloque:**
1. Jest (unitarios: store, api client, helpers)
2. @testing-library/react-native (componentes: LoginScreen, RequestCard, etc.)
3. Maestro (E2E: flujo auth completo + buscar viaje + solicitar + flujo conductor)
4. Artillery (carga: GET /trips, POST /trips/:id/requests)
5. ZAP (seguridad: endpoints auth + trips)

---

### Bloque 8 — Deploy (Junio, fuera de scope Sprint 2)
- Backend: deploy en VPS / Railway / Render
- Cambiar `API_BASE_URL` en `src/config.ts` a URL pública
- APK: `eas build --platform android --profile preview`

---

## 10. Decisiones de Arquitectura Tomadas

| Decisión | Razonamiento |
|---|---|
| Sin emulador Android — usar Expo Go | El estudiante tiene el celular físico, evita instalar Android Studio |
| KeyboardAvoidingView behavior `undefined` en Android | `'height'` causaba la barra blanca al cerrar teclado |
| withCredentials: true en axios | El refresh token es httpOnly cookie, Android lo maneja nativo |
| MisViajes en PerfilStack (no BuscarStack) | El mockup muestra el tab Perfil activo al entrar a Mis Viajes |
| driverId filter en backend | Permite que conductor vea solo SUS viajes sin romper búsqueda de pasajeros |
| AuthUser.role = 'STUDENT' | El backend usa STUDENT (no DRIVER/PASSENGER), la lógica de conductor se determina por tener vehículo |
| API_BASE_URL en config.ts | Fácil cambiar de IP local a URL pública para producción |
| Tab Publicar condicional a tener vehículo | El backend lo valida también, pero la UX debe guiar al usuario a registrar su auto primero |

---

## 11. Endpoints Backend Relevantes

```
AUTH
  POST /auth/register, /auth/verify-email, /auth/resend-code
  POST /auth/login, /auth/logout, /auth/refresh
  POST /auth/forgot-password, /auth/reset-password

USERS
  GET  /users/me
  PATCH /users/me             → { fullName, career, phone, neighborhood }
  POST  /users/me/vehicle     → { brand, model, year, plate, color }
  PATCH /users/me/vehicle     → mismos campos
  GET  /users/:id

TRIPS
  GET  /trips                 → ?destinationZone, departureDate, minSeats, status, driverId
  GET  /trips/:id
  POST /trips                 → { originZone, destinationZone, departureTime, totalSeats, pricePerSeat, notes }
  PATCH /trips/:id/status     → { status: 'IN_PROGRESS'|'COMPLETED'|'CANCELLED' }

REQUESTS
  POST   /trips/:tripId/requests
  GET    /trips/:tripId/requests
  PATCH  /requests/:id/respond  → { action: 'ACCEPT'|'REJECT' }
  DELETE /requests/:id
  GET    /requests

PAYMENTS
  GET  /payments/:requestId
  POST /payments/:requestId/confirm

RATINGS
  POST /ratings               → { requestId, score, comment? }

REPORTS
  POST /reports               → multipart: reason, description, evidence?
```

---

## 12. Cómo Retomar la Sesión

1. Leer este archivo completo
2. La **siguiente fase a ejecutar es la 6.1** (Editar Perfil + Vehículo)
3. Antes de cada fase, leer el `screen.png` del mockup correspondiente
4. Después de cada pantalla: `npx tsc --noEmit` para verificar tipos
5. El usuario prueba en Expo Go escaneando el QR de `npx expo start`
6. IP del backend: `192.168.1.13:4000` (puede cambiar si cambia la red WiFi — actualizar `src/config.ts`)

---

*Fin del documento de contexto*
