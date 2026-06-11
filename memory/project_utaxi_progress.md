---
name: UTAxi Progress — Estado completo
description: Estado completo del proyecto UTAxi — qué está implementado, qué falta, stack, migraciones, rutas y cómo retomar en la próxima sesión
type: project
originSessionId: 7458e6f5-6f28-4a46-bb98-a6c17899b684
---
# UTAxi — Estado del proyecto (actualizado 2026-05-11)

## Stack técnico
- **Backend**: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL (Docker puerto 5436)
- **Mobile**: React Native + Expo managed (Expo Go, sin dev build), React Navigation v6, TanStack React Query, Zustand + AsyncStorage
- **Web**: React + Vite + TailwindCSS + TanStack React Query
- **Fotos**: Cloudinary (carpeta `utaxi/vehicles`)
- **Auth**: JWT (access 15m + refresh 7d)
- **Tiempo real**: Socket.io — rooms `user:{userId}` (auto-join) y `trip:{tripId}`
- **Mapas mobile**: WebView + Leaflet inline HTML (Expo Go no soporta react-native-maps)
- **Mapas web**: react-leaflet
- **Geocoding**: Nominatim OSM, gratis, `countrycodes=ec`, debounce 400ms

## Directorios
- `/home/adrian/dev/UTAxi/server` · `/home/adrian/dev/UTAxi/mobile` · `/home/adrian/dev/UTAxi/client`

## Levantar proyecto
```bash
# Backend (puerto 4000)
cd server && npm run dev

# Web (puerto 4278)
cd client && npm run dev

# Mobile
cd mobile && npx expo start  # Expo Go, escanear QR
```

---

## COMPLETAMENTE IMPLEMENTADO

### Auth (web + mobile)
Registro, login, verificación email, forgot/reset password, refresh token. Zustand con AsyncStorage.

### Perfil (web + mobile)
Ver/editar perfil (fullName, career combobox, phone, neighborhood), upload foto Cloudinary.

### Vehículo (mobile)
`VehicleScreen.tsx` — CRUD vehículo + upload foto Cloudinary. `pendingPhotoUri` flow.
Backend: `POST/PATCH/DELETE /users/me/vehicle`, `POST /users/me/vehicle/photo`.

### Navegación condicional (mobile)
`MainTabs.tsx` — con vehículo: 4 tabs + HomeConductorScreen. Sin vehículo: 3 tabs + HomePasajeroScreen.

### Origen/Destino mejorado — campuses + mapa

**Constantes**: `mobile/src/constants/campuses.ts` y `client/src/constants/campuses.ts` (idénticos)
- Campus Huachi: (-1.2540, -78.6197)
- Campus Querochamba: (-1.3677, -78.6126)
- Campus Ingahurco: (-1.2468, -78.6274)
- Helpers: `findCampusById`, `findCampusByLabel`

**CampusPicker**: mobile (`CampusPicker.tsx`) + web (`CampusPicker.tsx`) — 3 tarjetas seleccionables.

**LocationPickerScreen** (mobile): WebView + Leaflet HTML inline. Búsqueda Nominatim, pin arrastrable, postMessage → Zustand store `locationPickerStore` → `navigation.goBack()`. Registrada con `animation: 'slide_from_bottom'`.

**Zustand locationPickerStore** (mobile): bridge entre LocationPickerScreen y CreateTripScreen/EditTripScreen. `useFocusEffect` lee el resultado al volver de navegación.

**DestinationPickerField** (web): búsqueda + dropdown Nominatim + mapa Leaflet 240px + pin arrastrable. Exporta `DestinationValue { address, lat, lng }`.

**RouteMap** (web): coords directas > campus lookup > Nominatim. Props: `originLat?`, `originLng?`, `destLat?`, `destLng?`.

**Backend coordenadas**: Trip model tiene `originLat Float?`, `originLng Float?`, `destLat Float?`, `destLng Float?`. `trips.service.ts` `create()` y `update()` incluyen las 4 coords en sus firmas. Migración aplicada (~`add_trip_coordinates`).

### Viajes — estados y acciones

**HomeConductorScreen.tsx** (mobile):
- Tab "Activos" (SCHEDULED/IN_PROGRESS) | Tab "Completados" (COMPLETED)
- SCHEDULED: Iniciar, Solicitudes, Editar, Cancelar
- IN_PROGRESS: **SOLO botón "Terminar"** (resto oculto)
- `completeTrip` → `PATCH /trips/:id/status { status: 'COMPLETED' }`

**ManageRequests.tsx** (conductor, web):
- IN_PROGRESS: solo botón "Completar Viaje"
- COMPLETED: sección "Viaje Completado"
- `RouteMap` con coords directas de `tripData`

**MyTrips.tsx** (conductor, web) — NUEVO `/my-trips`:
- Tabs Activos | Completados
- Botón Gestionar en activos, Ver detalles en completados
- En navbar desktop y mobile bottom bar

### Solicitudes — sistema completo

**Backend**: `rejectionCount` en TripRequest (max 3). Re-solicitud actualiza PENDING si < 3. Check-in `arrivedAt`. Migraciones aplicadas.

**SolicitudesScreen** (conductor, mobile): 3 secciones — PENDIENTES (aceptar/rechazar) / ACEPTADOS (check-in + calificar) / HISTORIAL (rechazados con contador).

**MisViajesScreen** (pasajero, mobile):
- Tab "Activas": PENDING + ACCEPTED
- Tab "Historial": solo COMPLETED
- Reintentar (< 3 rechazos) | Bloqueado (= 3)
- Calificar en COMPLETED sin rating

**MyRequests.tsx** (pasajero, web):
- Tab "Activas": PENDING + ACCEPTED
- Tab "Historial": solo COMPLETED
- Mismas acciones que mobile

**ManageRequests.tsx** (conductor, web): check-in + calificar + historial rechazados.

### Notificaciones tiempo real (Socket.io)

**Backend**:
- Auto-join `user:{userId}` al conectar
- `emitToUser(userId, event, data)` helper en tracking.gateway.ts
- `createRequest` → emit `request:new` al conductor
- `respondToRequest` → emit `request:update` al pasajero
- CORS `origin: '*'` en dev (necesario para Expo Go)

**Mobile** `hooks/useNotifications.ts`: conecta con token, refs estables, callbacks `onRequestUpdate` + `onRequestNew`. Integrado en MisViajesScreen y SolicitudesScreen.

**Web** `hooks/useNotifications.ts`: misma lógica. Integrado en MyRequests y ManageRequests.

### Rating
`RatingModal` mobile: `targetName`, `raterRole: 'driver' | 'passenger'`, `onSuccess`. Integrado en SolicitudesScreen y MisViajesScreen. Web: integrado en ManageRequests y MyRequests.

---

## APIs — estado actual

### `trips.api.ts` (mobile + web)
`getTrips`, `getTripById`, `getMyTrips(driverId, status?)`, `createTrip`, `updateTrip`, `cancelTrip`, `updateTripStatus`, `safetyAck`
`Trip` interface incluye `originLat?`, `originLng?`, `destLat?`, `destLng?`

### `requests.api.ts` (mobile + web)
`createRequest`, `getRequestsByTrip`, `respondToRequest`, `cancelRequest`, `getMyRequests`, `markArrival`
`TripRequest` interface incluye `rejectionCount`, `arrivedAt`, `rating?`, `payment?`

---

## Rutas web
```
/            /trips          /trips/new
/trips/:id   /trips/:id/requests   /trips/:id/active
/my-trips    ← NUEVO (conductor historial)
/requests    /pay/:requestId   /profile   /reports   /admin
```

## Stack mobile PublicarStackParamList
`HomeConductor`, `CreateTrip`, `EditTrip { tripId }`, `Solicitudes { tripId }`, `LocationPicker` (slide_from_bottom)

---

## Migraciones Prisma aplicadas
1. `20260511020135_add_vehicle_photo` — `photoUrl` en Vehicle
2. `20260511024845_add_rejection_count_and_arrival` — `rejectionCount`, `arrivedAt` en TripRequest
3. `~20260511_add_trip_coordinates` — `originLat`, `originLng`, `destLat`, `destLng` en Trip

---

## LO QUE FALTA (en orden de prioridad)

1. **Mapa tiempo real tipo Uber** — conductor emite GPS por socket durante IN_PROGRESS, pasajero lo recibe y ve el carro moverse. Socket infrastructure ya existe.
2. **Calificar conductor** (mobile) — flujo completo post-COMPLETED en MisViajesScreen historial. RatingModal existe, verificar integración end-to-end.
3. **Reportar conductor** (mobile) — backend de reportes existe (`/reports`), falta pantalla mobile.
4. **AvisosScreen.tsx** (mobile) — tab "Avisos" actualmente vacío/placeholder.
5. **Pagos Stripe** (mobile) — endpoints backend existen, faltan pantallas mobile.
6. **Verificación vehículo** — ver `project_vehicle_verification.md`.
7. **Admin panel mobile**.
8. **Chat**.

---

## Detalles técnicos críticos
- Maps en Expo Go: usar WebView + Leaflet HTML inline, NO react-native-maps
- Resultado de navegación: Zustand store + useFocusEffect (funciones no van en nav params)
- Socket CORS: `origin: '*'` en dev para Expo Go
- Campus coords: siempre de `campuses.ts`, nunca hardcodeadas
- Nominatim: debounce 400ms, `countrycodes=ec`, `accept-language=es`, max 5

## Errores conocidos
- `EditProfileScreen.tsx` ~línea 116: vars de vehículo no encontradas. Preexistente, no rompe el app.

**Why:** Contexto completo para retomar en cualquier sesión futura sin perder estado.
**How to apply:** Leer al inicio de cada sesión sobre UTAxi antes de cualquier cambio.
