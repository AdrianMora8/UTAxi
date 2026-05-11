---
name: UTAxi Mobile Progress
description: Estado completo del proyecto UTAxi — qué está implementado, qué falta, stack técnico y cómo retomar
type: project
originSessionId: 380f03da-13db-46c7-bd7a-a88b3f9fcfe9
---
# UTAxi — Estado del proyecto (al 2026-05-11)

## Stack técnico
- **Backend**: Node.js + Express + TypeScript + Prisma ORM + PostgreSQL (Docker en puerto 5436)
- **Mobile**: React Native + Expo (managed workflow), React Navigation v6, TanStack React Query, Zustand + AsyncStorage
- **Web (client)**: React + Vite + TailwindCSS + TanStack React Query
- **Almacenamiento fotos**: Cloudinary (carpeta `utaxi/vehicles`)
- **Auth**: JWT (access 15m + refresh 7d)
- **DB**: PostgreSQL vía Docker, puerto 5436

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

## Lo que está completamente implementado

### Auth (web + mobile)
- Registro, login, verificación de email, refresh token
- Zustand store con persistencia en AsyncStorage (`authStore.ts`)

### Perfil de usuario (web + mobile)
- Ver perfil, editar (fullName, career combobox, phone, neighborhood)
- Upload foto de perfil (Cloudinary)
- `EditProfileScreen.tsx` — career como combobox igual que registro

### Vehículo (web + mobile)
- `VehicleScreen.tsx` — crear / editar / eliminar vehículo
- Upload foto de vehículo a Cloudinary (`utaxi/vehicles`)
- Flujo dos pasos: foto se puede elegir durante creación y se sube automáticamente al crear el vehículo (`pendingPhotoUri`)
- Backend: `POST/PATCH/DELETE /users/me/vehicle`, `POST /users/me/vehicle/photo`

### Navegación condicional (mobile)
- `MainTabs.tsx` usa `useQuery(['me'])` para detectar si el usuario tiene vehículo
- Si tiene vehículo → 4 tabs (Buscar, Publicar, Avisos, Perfil)
- Si no tiene vehículo → 3 tabs (sin Publicar)
- Conductor = usuario con vehículo

### Viajes — Conductor (mobile)
- `HomeConductorScreen.tsx` — lista viajes activos propios con botones:
  - **Iniciar** (solo SCHEDULED) → `updateTripStatus('IN_PROGRESS')`
  - **Solicitudes** → navega a SolicitudesScreen
  - **Editar** (solo SCHEDULED) → navega a EditTripScreen
  - **Eliminar** (solo SCHEDULED) → `cancelTrip(id)` con confirmación
- `CreateTripScreen.tsx` — publicar viaje
- `EditTripScreen.tsx` — editar viaje (pre-carga datos, llama `PATCH /trips/:id`)

### Viajes — Pasajero (mobile + web)
- `HomePasajeroScreen.tsx` — busca viajes, filtra propios (`driverId !== user.id`)
- `TripDetailScreen.tsx` — detalle + solicitar unirse
- Web: `TripList.tsx`, `TripDetail.tsx` — misma lógica

### Solicitudes — Sistema completo (backend + mobile + web)

#### Backend (en `requests.service.ts`)
- **Límite de 3 rechazos**: `rejectionCount` en `TripRequest`. Al rechazar se incrementa. Si `rejectionCount >= 3` y intenta re-solicitar → error 400 bloqueado.
- **Re-solicitud**: `POST /requests/trip/:tripId` maneja re-requests automáticamente si status=REJECTED y rejectionCount < 3 (actualiza a PENDING sin crear nueva fila).
- **Check-in**: `PATCH /requests/:id/arrival` con `{ arrived: boolean }` → setea `arrivedAt` timestamp.
- Schema migrado: `rejectionCount Int @default(0)` y `arrivedAt DateTime?` en `TripRequest`.

#### SolicitudesScreen.tsx (conductor, mobile) — reescrito completo
- **3 secciones**: PENDIENTES / PASAJEROS ACEPTADOS / HISTORIAL
- PENDIENTES: aceptar/rechazar con confirmación
- ACEPTADOS: toggle "Marcar llegada / Llegó" + botón "Calificar" (abre RatingModal con `raterRole="driver"`)
- HISTORIAL: rechazados/cancelados con contador `X/3 rechazos` y badge "Bloqueado"

#### MisViajesScreen.tsx (pasajero, mobile)
- Muestra `X/3 rechazos` en solicitudes rechazadas
- Botón **Reintentar** (verde, llama `createRequest` del mismo viaje) si rejectionCount < 3
- Badge **Bloqueado** si rejectionCount >= 3

#### ManageRequests.tsx (conductor, web)
- Sección "Pasajeros Confirmados": toggle check-in + botón calificar pasajero
- Nueva sección "Historial de Solicitudes": rechazados/cancelados con contador
- RatingModal ya integrado

#### MyRequests.tsx (pasajero, web)
- Botón **Reintentar** con contador `X/3` visible
- Badge **Bloqueado** si llegó a 3 rechazos

### RatingModal (mobile) — actualizado
- Acepta `targetName` (genérico), `raterRole: 'driver' | 'passenger'`, `onSuccess` callback
- Texto del modal se adapta según quién califica a quién

### APIs mobile actualizadas
- `trips.api.ts`: añadidos `updateTrip(id, data)` y `cancelTrip(id)`
- `requests.api.ts`: añadidos `rejectionCount`, `arrivedAt` en interface; `markArrival(id, arrived)`
- `users.api.ts`: completo con vehicle CRUD + photo upload

### APIs web actualizadas
- `requests.api.ts`: añadidos `rejectionCount`, `arrivedAt`, `markArrival(id, arrived)`

---

## Lo que falta implementar (próximas sesiones)

### Alta prioridad
- [ ] **AvisosScreen.tsx** (mobile) — notificaciones de solicitudes aceptadas/rechazadas en tiempo real (WebSocket ya existe en backend con Socket.io)
- [ ] **Completar viaje** — el conductor marca el viaje como COMPLETED desde `ActiveTrip`
- [ ] **Calificar conductor** — el pasajero puede calificar al conductor una vez el viaje está COMPLETED (MisViajesScreen ya tiene el botón pero solo para COMPLETED)
- [ ] **EditProfileScreen.tsx** — tiene errores TypeScript preexistentes (variables `brand`, `model`, `year`, `plateNumber`, `color`, `saveVehicle` no encontradas en línea 116+)

### Media prioridad
- [ ] **Verificación de vehículo** — admin aprueba vehículo con foto (diseñado pero no implementado, ver `project_vehicle_verification.md`)
- [ ] **Pagos** — Stripe en modo test, endpoints existen pero no están wired en mobile
- [ ] **Reportes** — `ReportsScreen` en mobile (backend completo)
- [ ] **ActiveTrip con GPS** — tracking en tiempo real (web ya tiene `ActiveTrip.tsx` con mapa)

### Baja prioridad
- [ ] **Admin panel** — mobile (web ya tiene admin panel)
- [ ] **Chat** — decorativo por ahora en web

---

## Migraciones Prisma aplicadas
- `20260511020135_add_vehicle_photo` — campo `photoUrl` en Vehicle
- `20260511024845_add_rejection_count_and_arrival` — `rejectionCount` y `arrivedAt` en TripRequest

## Errores conocidos
- `EditProfileScreen.tsx` línea 116: variables de vehículo no encontradas (preexistente, no rompe el app, solo TypeScript)

## Cómo probar el flujo de solicitudes
- Conductor en móvil (Expo Go), pasajero en web (`localhost:4278`) o viceversa
- Ambos apuntan al mismo backend en puerto 4000
- La cuenta del conductor en móvil debe tener vehículo registrado para ver el tab "Publicar"

**Why:** Contexto completo para retomar desarrollo en cualquier sesión futura sin perder estado.
**How to apply:** Leer este archivo al inicio de cada sesión nueva sobre UTAxi para orientarse rápido.
