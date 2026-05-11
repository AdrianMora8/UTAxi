# UTAxi — Contexto de Migración a React Native (Expo)

## Fecha de creación: 10 de mayo de 2026

---

## El proyecto

**UTAxi** es una app tipo Uber/ridesharing para estudiantes de la Universidad Técnica de Ambato (UTA). Solo pueden registrarse usuarios con correo `@uta.edu.ec`.

Stack actual:
- **Backend:** Node.js + Express + TypeScript + Prisma + PostgreSQL + Socket.io + Stripe
- **Frontend web:** React + Vite + TypeScript + Tailwind + Zustand + React Query
- **Base de datos:** PostgreSQL vía Docker

El proyecto es académico, entregado por sprints.

---

## Contexto académico

- **Sprint 1 (ya presentado):** Autenticación completa (login, registro, OTP, recuperación de contraseña). Nota: **10/10**.
- **Sprint 2 (siguiente entrega):** La aplicación debe presentarse en formato **móvil** — no como web responsive, sino como app móvil real.
- **Fecha límite sprint 2:** **20 de mayo de 2026**
- **Presentación final (deploy completo):** mediados de junio de 2026

### Requisitos del sprint 2
1. App móvil funcionando (al menos login + lo que se avance)
2. Tests de **integración** y de **sistema** (no unitarios — esos ya están)
3. Demo en persona, probablemente desde el teléfono del desarrollador

---

## Decisiones acordadas

### ¿Por qué Expo y no React Native CLI puro?
- Expo **es** React Native. No es un atajo ni una trampa. El código es idéntico.
- La diferencia es solo en el tooling y setup.
- Expo en desarrollo: se prueba con la app **Expo Go** en el teléfono (QR code — solo para el desarrollador durante desarrollo).
- Expo en producción/presentación: genera un **APK real** que se instala en cualquier Android sin Expo Go, sin QR, sin nada raro.
- El profesor verá una APK instalada en un teléfono Android funcionando normalmente.
- En Windows/Linux, React Native CLI puro requiere configurar Android Studio, Java, variables de entorno, Gradle — puede comerse 1-2 días. Expo evita todo eso sin cambiar el código.

### ¿Por qué no Next.js?
No se consideró Next.js en ningún momento. La decisión fue siempre entre React Native CLI y Expo (que es React Native).

### Backend
- El backend **no se toca** para la migración móvil. Se consume exactamente igual desde la app móvil.
- Durante desarrollo: la app móvil se conecta al backend local vía IP de la red WiFi (`http://192.168.x.x:4000`).
- Para el APK final presentado a otra persona fuera de la red local: **sí o sí necesita el backend en la nube**.
- Deploy del backend: se hace para la presentación final de junio, no para el sprint 2.
- Para el sprint 2 se puede presentar desde el propio teléfono con el backend local en la misma red WiFi.

### Sistema operativo de desarrollo
**Fedora 44 Linux**

### Plataforma objetivo
**Solo Android** (no iOS, no hace falta Mac ni nada relacionado con Apple)

---

## Lo que se puede reutilizar del proyecto web actual

| Qué | Estado |
|-----|--------|
| Backend completo | 100% reutilizable, sin cambios |
| Archivos `/client/src/api/*.ts` | Reutilizables con mínimos cambios (solo el base URL) |
| `authStore.ts` (Zustand) | Reutilizable casi idéntico |
| Tipos TypeScript | Reutilizables |
| Lógica de negocio | Reutilizable |

## Lo que hay que reescribir

| Qué | Motivo |
|-----|--------|
| Toda la UI | De HTML/Tailwind a componentes React Native (View, Text, TextInput, etc.) |
| Navegación | De React Router a React Navigation |
| Mapa GPS | De Leaflet a `react-native-maps` |
| Pagos UI | Stripe tiene SDK para React Native pero requiere config nativa |

---

## Bloques del proyecto móvil

| Bloque | Contenido | Estado |
|--------|-----------|--------|
| **Bloque 1** | Entorno y estructura base | 🟡 En progreso |
| **Bloque 2** | Autenticación (Login, Registro, OTP, Recuperación) | ⏳ Pendiente |
| **Bloque 3** | Flujo pasajero (listar viajes, detalle, solicitar) | ⏳ Pendiente |
| **Bloque 4** | Flujo conductor (crear viaje, gestionar solicitudes) | ⏳ Pendiente |
| **Bloque 5** | Perfil | ⏳ Pendiente |
| **Bloque 6** | Tests de integración y sistema | ⏳ Pendiente |
| **Bloque 7** | Deploy backend + build APK final | ⏳ Pendiente (junio) |

### Scope para el 20 de mayo (sprint 2)
Bloques 1, 2 y lo que se avance de 3 y 4. Tests del Bloque 6.

### Fuera de scope por ahora (para presentación final en junio)
- Mapa GPS en tiempo real (Socket.io + react-native-maps — lo más complejo)
- Pagos con Stripe
- Panel de administración
- Reportes

---

## Bloque 1 — Entorno y estructura base

### Fase 1.1 — Instalación ✅ COMPLETADA

**Lo instalado:**
- Node.js: `v24.15.0` (ya estaba)
- npm: `v11.12.1` (ya estaba)
- EAS CLI: `v18.11.0` (instalado con `npm install -g eas-cli`) — sirve para generar el APK

**Pendiente manual (el desarrollador lo hace en su teléfono):**
- Instalar **Expo Go** desde Play Store en el teléfono Android (icono blanco con "e" negra)

**Nota:** Se intentó instalar `expo-cli` global pero está deprecado para Node 17+. La forma correcta ahora es `npx create-expo-app` para crear proyectos y `eas-cli` para builds. No instalar `expo-cli` global.

---

### Fase 1.2 — Crear el proyecto ⏳ PENDIENTE

Crear la carpeta `mobile/` dentro del repositorio UTAxi (al mismo nivel que `client/` y `server/`).

Comando a ejecutar:
```bash
cd /home/adrian/dev/UTAxi
npx create-expo-app@latest mobile --template blank-typescript
```

---

### Fase 1.3 — Dependencias base ⏳ PENDIENTE

A instalar dentro de `mobile/`:
- `@react-navigation/native` + `@react-navigation/native-stack` + dependencias
- `zustand`
- `@tanstack/react-query`
- `axios`
- `react-native-safe-area-context`
- `react-native-screens`

---

### Fase 1.4 — Navegación base ⏳ PENDIENTE

- Stack navigator con rutas definidas (pantallas vacías por ahora)
- Separación entre rutas públicas (auth) y privadas (app autenticada)

---

### Fase 1.5 — Verificación ⏳ PENDIENTE

- App corriendo en el teléfono via Expo Go
- Pantalla simple funcionando
- Confirmar conexión al backend local

---

## Flujo de trabajo diario

1. Arranca el backend local: `cd server && npm run dev`
2. Arranca la app móvil: `cd mobile && npx expo start`
3. Escanea el QR con Expo Go en el teléfono
4. Desarrollas y ves cambios en tiempo real en el teléfono

---

## Notas importantes

- El proyecto se llama **UTAxi** en el repo pero la app se llama **U-Ride** en el frontend.
- El backend corre en el puerto `4000`.
- El frontend web corre en el puerto `4278`.
- La app mobile usará la IP local de la máquina de desarrollo para conectarse al backend durante desarrollo.
- Los JWT secrets actuales son débiles (problema de seguridad conocido, no prioritario ahora).
- Hay credenciales reales en el `.env` commiteado (problema conocido, no prioritario para el sprint 2).
- El `simulateConfirm` en payments existe para demo sin Stripe real.

---

## Estructura esperada del repositorio al final del Bloque 1

```
UTAxi/
├── client/          # Frontend web (existente, no se toca)
├── server/          # Backend (existente, no se toca)
├── mobile/          # App React Native con Expo (nueva)
├── docker-compose.yml
├── ARQUITECTURA.md
├── MOBILE_CONTEXT.md  # Este archivo
└── ...
```
