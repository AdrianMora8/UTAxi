# UTAxi — Estado completo del proyecto (al 2026-05-11)

## Stack técnico
- **Backend**: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL (Docker puerto 5436)
- **Mobile**: React Native + Expo (managed workflow, Expo Go — sin dev build), React Navigation v6, TanStack React Query, Zustand + AsyncStorage
- **Web (client)**: React + Vite + TailwindCSS + TanStack React Query
- **Almacenamiento fotos**: Cloudinary (carpeta `utaxi/vehicles`)
- **Auth**: JWT (access 15m + refresh 7d)
- **Tiempo real**: Socket.io — rooms por usuario `user:{userId}` y por viaje `trip:{tripId}`
- **Mapas mobile**: `react-native-webview` con Leaflet inline HTML (Expo Go no soporta `react-native-maps`)
- **Mapas web**: `react-leaflet` + Leaflet
- **Geocoding**: Nominatim (OpenStreetMap), gratis, sin API key, `countrycodes=ec`

## Directorios
- Servidor: `/home/adrian/dev/UTAxi/server`
- Mobile: `/home/adrian/dev/UTAxi/mobile`
- Web: `/home/adrian/dev/UTAxi/client`

## Cómo levantar el proyecto
```bash
# Backend (desde /server)
npm run dev   # puerto 4000

# Web (desde /client)
npm run dev   # puerto 4278

# Mobile
cd mobile && npx expo start
# Escanear QR con Expo Go en el celular
```

---

## MÓDULOS COMPLETAMENTE IMPLEMENTADOS

### 1. Auth (web + mobile)
- Registro, login, verificación de email, forgot/reset password, refresh token
- Zustand store con persistencia en AsyncStorage (`authStore.ts`)

### 2. Perfil de usuario (web + mobile)
- Ver perfil, editar (fullName, career combobox, phone, neighborhood)
- Upload foto de perfil (Cloudinary)
- `EditProfileScreen.tsx` — career como combobox igual que registro

### 3. Vehículo (mobile)
- `VehicleScreen.tsx` — crear / editar / eliminar vehículo
- Upload foto de vehículo a Cloudinary (`utaxi/vehicles`)
- Flujo dos pasos: foto elegible durante creación, se sube automáticamente (`pendingPhotoUri`)
- Backend: `POST/PATCH/DELETE /users/me/vehicle`, `POST /users/me/vehicle/photo`

### 4. Navegación condicional (mobile)
- `MainTabs.tsx` usa `useQuery(['me'])` para detectar si el usuario tiene vehículo
- Con vehículo → 4 tabs (Buscar, Publicar, Avisos, Perfil) + HomeConductorScreen
- Sin vehículo → 3 tabs (sin Publicar) + HomePasajeroScreen
- Conductor = usuario con vehículo registrado

### 5. Publicar viaje — Origen/Destino mejorado (mobile + web)

#### Constantes campuses
- `mobile/src/constants/campuses.ts` y `client/src/constants/campuses.ts` — idénticos
- 3 campus fijos: Huachi (-1.2540, -78.6197), Querochamba (-1.3677, -78.6126), Ingahurco (-1.2468, -78.6274)
- Helpers: `findCampusById(id)`, `findCampusByLabel(label)`

#### CampusPicker (mobile + web)
- Mobile: `mobile/src/components/CampusPicker.tsx` — 3 tarjetas táctiles, borde verde cuando seleccionado
- Web: `client/src/components/CampusPicker.tsx` — botones Tailwind, mismo comportamiento

#### LocationPickerScreen (mobile)
- `mobile/src/screens/app/LocationPickerScreen.tsx`
- Pantalla completa con WebView + Leaflet HTML inline
- Centro Ambato: [-1.2543, -78.6229]
- Búsqueda Nominatim con debounce 400ms, `countrycodes=ec`, max 5 resultados
- Pin verde arrastrable (divIcon), reverse geocode en dragend + click
- Al confirmar: `window.ReactNativeWebView.postMessage(JSON.stringify({address, lat, lng}))` → store → `navigation.goBack()`
- Registrada en `PublicarStackParamList` con `animation: 'slide_from_bottom'`

#### Zustand locationPickerStore (mobile)
- `mobile/src/store/locationPickerStore.ts`
- Bridge entre LocationPickerScreen y CreateTripScreen/EditTripScreen
- `useFocusEffect` + `locationPickerStore` para pasar resultado al volver de navegación (funciones no pueden ir en nav params)

#### DestinationPickerField (web)
- `client/src/components/map/DestinationPickerField.tsx`
- Input de búsqueda + dropdown Nominatim (debounce 400ms)
- Mapa Leaflet 240px, `FlyTo` y `ClickHandler` como componentes internos
- Pin verde arrastrable, dragend → reverse geocode
- Exporta `DestinationValue { address, lat, lng }`

#### RouteMap (web) — refactorizado
- `client/src/components/map/RouteMap.tsx`
- Elimina hardcode incorrecto, ahora genera coords desde `CAMPUSES` constants
- Acepta `originLat?`, `originLng?`, `destLat?`, `destLng?` para coords directas (evita geocoding)
- Prioridad: coords directas > campus lookup > Nominatim geocode

#### CreateTripScreen.tsx y EditTripScreen.tsx (mobile) — reescritos
- Estado `campus: Campus | null` (replace de `origin: string`)
- Estado `destLat`, `destLng` para coords del destino
- `useFocusEffect` lee de `locationPickerStore` al volver de LocationPicker
- Botón destino → navega a `'LocationPicker'`
- Payload: `{ originZone: campus.label, originLat, originLng, destinationZone, destLat, destLng, ... }`

#### CreateTrip.tsx (web) — actualizado
- `selectedCampus: Campus | null` replace del input de texto
- `destination: DestinationValue | null` del DestinationPickerField
- Validación manual antes de submit (ambos campos obligatorios)
- `RouteMap` recibe coords directas desde estados

#### Backend coordenadas
- Prisma schema: `originLat Float?`, `originLng Float?`, `destLat Float?`, `destLng Float?` en Trip
- `trips.service.ts`: `create()` y `update()` tienen las 4 coords en sus firmas TypeScript
- `trips.controller.ts`: Zod schema acepta todas las coords, usa spread `...data` → todo fluye
- Migración aplicada: `20260511034509_add_trip_coordinates` (aproximada, verificar nombre exacto)

### 6. Viajes — Estado y acciones

#### Ciclo de estados: SCHEDULED → IN_PROGRESS → COMPLETED | CANCELLED

#### HomeConductorScreen.tsx (mobile) — completo
- **Tabs**: "Activos" (SCHEDULED/IN_PROGRESS) | "Completados" (historial COMPLETED)
- **Botones por estado**:
  - SCHEDULED: Iniciar, Solicitudes, Editar, Cancelar
  - IN_PROGRESS: **SOLO botón "Terminar"** (ocultados todos los demás)
  - COMPLETED: aparece en tab Completados (solo lectura)
- `completeTrip` mutation → `PATCH /trips/:id/status` con `{ status: 'COMPLETED' }`

#### ManageRequests.tsx (conductor, web)
- Misma lógica: sección IN_PROGRESS solo muestra "Completar Viaje"
- Sección "Viaje Completado" cuando status=COMPLETED
- `RouteMap` recibe coords directas de `tripData`
- `completeTripMut` mutation integrada

#### MyTrips.tsx (conductor, web) — NUEVO
- Ruta: `/my-trips`
- Tabs "Activos" | "Completados"
- Botón "Gestionar" → `/trips/:id/requests` en viajes activos
- Link "Ver detalles" en viajes completados
- Accesible desde navbar (desktop y mobile bottom nav)

### 7. Solicitudes — Sistema completo

#### Backend (`requests.service.ts`)
- **Límite 3 rechazos**: `rejectionCount` en TripRequest. Al rechazar se incrementa.
- Si `rejectionCount >= 3` e intenta re-solicitar → error 400.
- **Re-solicitud**: `POST /requests/trip/:tripId` actualiza a PENDING si status=REJECTED y rejectionCount < 3.
- **Check-in**: `PATCH /requests/:id/arrival` con `{ arrived: boolean }` → setea `arrivedAt`.

#### SolicitudesScreen.tsx (conductor, mobile)
- 3 secciones: PENDIENTES / PASAJEROS ACEPTADOS / HISTORIAL
- PENDIENTES: aceptar/rechazar con confirmación
- ACEPTADOS: toggle check-in + botón Calificar (`raterRole="driver"`)
- HISTORIAL: rechazados/cancelados con contador `X/3 rechazos` y badge "Bloqueado"

#### MisViajesScreen.tsx (pasajero, mobile) — con tabs
- **Tab "Activas"**: solicitudes PENDING + ACCEPTED
- **Tab "Historial"**: solo solicitudes COMPLETED
- Botón Reintentar si rejectionCount < 3
- Badge Bloqueado si rejectionCount >= 3
- Botón Calificar en COMPLETED sin rating

#### MyRequests.tsx (pasajero, web) — tabs corregidos
- **Tab "Activas"**: PENDING + ACCEPTED (ya no incluye COMPLETED)
- **Tab "Historial"**: solo COMPLETED
- Botón Reintentar + Badge Bloqueado
- Botón Calificar en completados

#### ManageRequests.tsx (conductor, web)
- Sección "Pasajeros Confirmados": toggle check-in + calificar
- Sección "Historial de Solicitudes": rechazados/cancelados con contador

### 8. Notificaciones en tiempo real (Socket.io)

#### Backend
- `socket/tracking.gateway.ts`: auto-join a `user:{userId}` room en connect
- Helper `emitToUser(userId, event, data)` para emitir a usuario específico
- `requests.controller.ts`:
  - `createRequest` → emite `request:new` a room del conductor con `{ requestId, tripId, passengerName }`
  - `respondToRequest` → emite `request:update` a room del pasajero con `{ requestId, tripId, status, rejectionCount }`
- CORS: `origin: '*'` en development (permite Expo Go)

#### Mobile — `hooks/useNotifications.ts`
- Conecta a `SOCKET_URL = API_BASE_URL.replace(/\/api$/, '')`
- Auth por token en handshake
- Callbacks `onRequestUpdate` y `onRequestNew` con refs estables
- Reconecta solo cuando cambia el accessToken
- `MisViajesScreen`: `onRequestUpdate` → invalidate query + Alert (aceptado/rechazado + intentos restantes)
- `SolicitudesScreen`: `onRequestNew` filtrado por tripId → invalidate queries + Alert

#### Web — `hooks/useNotifications.ts`
- Misma lógica, conecta a `'/'` namespace
- `MyRequests.tsx`: `onRequestUpdate` → invalidate + toast
- `ManageRequests.tsx`: `onRequestNew` filtrado por tripId → invalidate + toast

### 9. Historial de viajes

#### Pasajero
- Mobile `MisViajesScreen` tab "Historial" → solo requests COMPLETED
- Web `MyRequests.tsx` tab "Historial" → solo requests COMPLETED

#### Conductor
- Mobile `HomeConductorScreen` tab "Completados" → trips COMPLETED que publicó
- Web `MyTrips.tsx` tab "Completados" → trips COMPLETED que publicó

#### Backend
- `GET /trips?driverId=X&status=COMPLETED` ya funciona (filtro existente en `findMany`)
- `GET /requests/my` retorna todas las requests con trip incluido (filtrado en frontend)

### 10. Rating (calificaciones)
- `RatingModal` mobile: acepta `targetName`, `raterRole: 'driver' | 'passenger'`, `onSuccess`
- Web: `RatingModal` integrado en ManageRequests y MyRequests
- Rating disponible en: SolicitudesScreen (conductor califica pasajero), MisViajesScreen (pasajero califica conductor en COMPLETED)

---

## APIs — Estado actual

### Mobile `trips.api.ts`
- `getTrips`, `getTripById`, `getMyTrips(driverId)`, `createTrip`, `updateTrip`, `cancelTrip`, `updateTripStatus`, `safetyAck`
- `Trip` interface incluye: `originLat?`, `originLng?`, `destLat?`, `destLng?`
- `CreateTripPayload` incluye coords

### Web `trips.api.ts`
- `getTrips`, `getTripById`, `getMyTrips(driverId, status?)`, `createTrip`, `updateTrip`, `cancelTrip`, `updateTripStatus`
- Mismas interfaces con coords

### Mobile `requests.api.ts`
- `createRequest(tripId)`, `getRequestsByTrip(tripId)`, `respondToRequest`, `cancelRequest`, `getMyRequests`, `markArrival`
- `TripRequest` interface: `rejectionCount`, `arrivedAt`, `rating?`, `payment?`

### Web `requests.api.ts`
- Igual que mobile

---

## Rutas web registradas
```
/                → Home
/trips           → TripList (buscar viajes como pasajero)
/trips/new       → CreateTrip
/trips/:id       → TripDetail
/trips/:id/requests → ManageRequests (conductor)
/trips/:id/active   → ActiveTrip
/my-trips        → MyTrips (historial conductor) ← NUEVO
/requests        → MyRequests (historial pasajero)
/pay/:requestId  → Payment
/profile         → Profile
/reports         → Report
/admin           → AdminDashboard
```

## Rutas mobile (PublicarStackParamList)
```
HomeConductor
CreateTrip
EditTrip { tripId: string }
Solicitudes { tripId: string }
LocationPicker  ← NUEVO (slide_from_bottom)
```

---

## Migraciones Prisma aplicadas
1. `20260511020135_add_vehicle_photo` — `photoUrl` en Vehicle
2. `20260511024845_add_rejection_count_and_arrival` — `rejectionCount` y `arrivedAt` en TripRequest
3. `20260511034509` (aprox) `add_trip_coordinates` — `originLat`, `originLng`, `destLat`, `destLng` en Trip (nullable Float)

---

## Lo que FALTA implementar (próximas sesiones)

### Alta prioridad
- [ ] **Mapa de seguimiento en tiempo real (tipo Uber)** — conductor y pasajero ven el carro moviéndose durante IN_PROGRESS. Conductor emite GPS por WebSocket, pasajero lo recibe. Ya existe socket infrastructure.
- [ ] **Calificar conductor** (mobile) — flujo completo post-COMPLETED: pasajero ve botón calificar en MisViajesScreen tab Historial. RatingModal ya existe, falta verificar integración end-to-end.
- [ ] **Reportar conductor** (mobile) — botón reporte en historial o detalle. Backend de reportes existe (`/reports`), falta pantalla mobile.

### Media prioridad
- [ ] **Verificación de vehículo** — admin aprueba vehículo. Ver `project_vehicle_verification.md`.
- [ ] **Pagos** — Stripe test mode. Endpoints existen en backend, faltan pantallas mobile.
- [ ] **AvisosScreen.tsx** (mobile) — pantalla de notificaciones en el tab "Avisos" (actualmente vacía o placeholder).

### Baja prioridad
- [ ] **Admin panel mobile**
- [ ] **Chat**

---

## Errores conocidos
- `EditProfileScreen.tsx` tiene errores TypeScript preexistentes (variables de vehículo en línea ~116). No rompe el app.

## Cómo probar
- Conductor en móvil (Expo Go) + pasajero en web (`localhost:4278`) o viceversa
- Ambos apuntan al backend en puerto 4000
- Conductor debe tener vehículo registrado para ver tab "Publicar"
- Para notificaciones tiempo real: ambos logeados simultáneamente

## Detalles técnicos importantes para no olvidar
- **Maps en Expo Go**: usar `react-native-webview` con Leaflet HTML inline (no `react-native-maps`)
- **Pasar resultado de navegación**: usar Zustand store + `useFocusEffect` (funciones no pueden ir en nav params)
- **Socket CORS mobile**: `origin: '*'` en desarrollo (RN no enforcea CORS pero socket.io sí verifica en handshake)
- **Campus coords**: siempre usar las constantes de `campuses.ts`, nunca hardcodear
- **Nominatim**: debounce 400ms, `countrycodes=ec`, `accept-language=es`, max 5 resultados, no abusar (throttling)
