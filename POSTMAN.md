# U-Ride — Guía de Pruebas en Postman

Base URL: `http://localhost:4000`

> **Tip Postman**: Crea una variable de entorno `baseUrl = http://localhost:4000` y un variable `accessToken` que actualices en cada login. Así usas `{{baseUrl}}/api/...` y `Bearer {{accessToken}}` en todos los requests.

---

## FASE 1 — Health Check

### GET /health
Verifica que el servidor y la base de datos estén corriendo.

```
GET {{baseUrl}}/health
```

**Respuesta esperada `200`:**
```json
{
  "status": "ok",
  "db": "connected",
  "env": "development"
}
```

---

## FASE 2 — Autenticación

### 1. Registrar usuario (dominio válido)
```
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "email": "test@uta.edu.ec",
  "password": "Password123!",
  "fullName": "Juan Pérez"
}
```
**Respuesta esperada `201`:**
```json
{ "message": "Código de verificación enviado a tu correo" }
```
> El código OTP aparece en los **logs del servidor** (consola donde corre `npm run dev`).

---

### 2. Registrar usuario (dominio inválido)
```
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "email": "test@gmail.com",
  "password": "Password123!",
  "fullName": "Juan Pérez"
}
```
**Respuesta esperada `400`:**
```json
{ "error": "Solo se permiten correos @uta.edu.ec" }
```

---

### 3. Verificar email con OTP
Copia el código de 6 dígitos que aparece en los logs del servidor.
```
POST {{baseUrl}}/api/auth/verify-email
Content-Type: application/json

{
  "email": "test@uta.edu.ec",
  "code": "123456"
}
```
**Respuesta esperada `200`:**
```json
{ "message": "Email verificado correctamente" }
```

---

### 4. Login
```
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "test@uta.edu.ec",
  "password": "Password123!"
}
```
**Respuesta esperada `200`:**
```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "...",
    "email": "test@uta.edu.ec",
    "fullName": "Juan Pérez",
    "role": "STUDENT"
  }
}
```
> Guarda el `accessToken` en tu variable de entorno de Postman.
> La cookie `refreshToken` se setea automáticamente (httpOnly).

---

### 5. Refrescar access token
```
POST {{baseUrl}}/api/auth/refresh
```
> Postman envía la cookie automáticamente si la tiene guardada.

**Respuesta esperada `200`:**
```json
{ "accessToken": "eyJ..." }
```

---

### 6. Logout
```
POST {{baseUrl}}/api/auth/logout
```
**Respuesta esperada `200`:**
```json
{ "message": "Sesión cerrada" }
```
> La cookie `refreshToken` queda eliminada.

---

## FASE 3 — Perfil de Usuario y Vehículo

> Todos los endpoints requieren:
> ```
> Authorization: Bearer {{accessToken}}
> ```

---

### 1. Ver mi perfil completo
```
GET {{baseUrl}}/api/users/me
Authorization: Bearer {{accessToken}}
```
**Respuesta esperada `200`:**
```json
{
  "user": {
    "id": "...",
    "email": "test@uta.edu.ec",
    "fullName": "Juan Pérez",
    "career": null,
    "phone": null,
    "neighborhood": null,
    "role": "STUDENT",
    "reputationScore": 5,
    "totalTrips": 0,
    "vehicle": null
  }
}
```

---

### 2. Actualizar perfil
```
PATCH {{baseUrl}}/api/users/me
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "career": "Ingeniería en Sistemas",
  "neighborhood": "La Merced",
  "phone": "0987654321"
}
```
**Respuesta esperada `200`:**
```json
{
  "user": {
    "career": "Ingeniería en Sistemas",
    "neighborhood": "La Merced",
    ...
  }
}
```

---

### 3. Registrar vehículo
```
POST {{baseUrl}}/api/users/me/vehicle
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2020,
  "plateNumber": "ABC1234",
  "color": "Blanco"
}
```
**Respuesta esperada `201`:**
```json
{
  "vehicle": {
    "id": "...",
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2020,
    "plateNumber": "ABC1234",
    "color": "BLANCO"
  }
}
```
> Segunda vez → `409` "Ya tienes un vehículo registrado. Usa PATCH para actualizarlo."

---

### 4. Actualizar vehículo
```
PATCH {{baseUrl}}/api/users/me/vehicle
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "color": "Negro"
}
```
**Respuesta esperada `200`:**
```json
{ "vehicle": { "color": "Negro", ... } }
```

---

### 5. Ver perfil público de otro usuario
```
GET {{baseUrl}}/api/users/<id_del_usuario>
Authorization: Bearer {{accessToken}}
```
**Respuesta esperada `200`:**
```json
{
  "user": {
    "id": "...",
    "fullName": "Juan Pérez",
    "career": "Ingeniería en Sistemas",
    "reputationScore": 5,
    "totalTrips": 0,
    "vehicle": { "brand": "Toyota", "model": "Corolla", ... },
    "ratingsReceived": []
  }
}
```
> Sin datos sensibles (sin email, sin passwordHash).

---

### 6. Verificar que el vehículo aparece en /me
```
GET {{baseUrl}}/api/users/me
Authorization: Bearer {{accessToken}}
```
→ Ahora el campo `vehicle` tiene los datos del Toyota.

---

## FASE 4 — Viajes

> Todos los endpoints requieren `Authorization: Bearer {{accessToken}}`

### 1. Crear un viaje (como conductor)
```
POST {{baseUrl}}/api/trips
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "originZone": "La Merced",
  "destinationZone": "Campus UTA",
  "departureTime": "2026-03-25T07:00:00-05:00",
  "totalSeats": 3,
  "pricePerSeat": 0.50,
  "notes": "Salida puntual",
  "rules": "No fumar, cinturón obligatorio"
}
```
**Respuesta esperada `201`:**
```json
{
  "trip": {
    "id": "...",
    "originZone": "La Merced",
    "destinationZone": "Campus UTA",
    "departureTime": "2026-03-25T12:00:00.000Z",
    "totalSeats": 3,
    "availableSeats": 3,
    "pricePerSeat": "0.50",
    "status": "SCHEDULED",
    "driver": { "id": "...", "fullName": "...", "reputationScore": 5 }
  }
}
```
> Guarda el `trip.id` para las siguientes pruebas.

---

### 2. Listar viajes (sin filtros)
```
GET {{baseUrl}}/api/trips
Authorization: Bearer {{accessToken}}
```
**Respuesta esperada `200`:**
```json
{
  "trips": [...],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

---

### 3. Filtrar viajes por zona y fecha
```
GET {{baseUrl}}/api/trips?destinationZone=Campus UTA&departureDate=2026-03-25
Authorization: Bearer {{accessToken}}
```
→ Solo muestra viajes que coincidan con el filtro.

---

### 4. Ver detalle de un viaje
```
GET {{baseUrl}}/api/trips/<trip_id>
Authorization: Bearer {{accessToken}}
```
**Respuesta esperada `200`:**
```json
{
  "trip": {
    "id": "...",
    "driver": {
      "fullName": "...",
      "vehicle": { "brand": "Toyota", "model": "Corolla", ... }
    },
    "_count": { "requests": 0 }
  }
}
```

---

### 5. Aceptar reglas de seguridad (safety ack)
```
POST {{baseUrl}}/api/trips/<trip_id>/safety-ack
Authorization: Bearer {{accessToken}}
```
**Respuesta esperada `201`:**
```json
{ "acknowledged": true }
```
> Segunda vez → también `201` (es idempotente, no lanza error).

---

### 6. Actualizar viaje (solo el conductor, solo si está SCHEDULED)
```
PATCH {{baseUrl}}/api/trips/<trip_id>
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "notes": "Salida desde la entrada principal",
  "pricePerSeat": 0.75
}
```
**Respuesta esperada `200`:** trip actualizado.
→ Si lo intenta otro usuario → `403`
→ Si el viaje ya no es SCHEDULED → `400`

---

### 7. Cambiar estado del viaje (conductor)
```
PATCH {{baseUrl}}/api/trips/<trip_id>/status
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{ "status": "IN_PROGRESS" }
```
Estados válidos y transiciones:
- `SCHEDULED` → `IN_PROGRESS` o `CANCELLED`
- `IN_PROGRESS` → `COMPLETED`
- `COMPLETED` y `CANCELLED` → no admiten cambios

---

### 8. Cancelar viaje (soft delete)
```
DELETE {{baseUrl}}/api/trips/<trip_id>
Authorization: Bearer {{accessToken}}
```
**Respuesta esperada `200`:** trip con `"status": "CANCELLED"`
→ Si otro usuario intenta cancelarlo → `403`

## FASE 5 — Solicitudes

> Necesitas **dos cuentas** en Postman: una como conductor (cuenta A) y otra como pasajero (cuenta B).
> Ambas con su propio `accessToken`.

---

### 1. Enviar solicitud para unirse a un viaje (cuenta B — pasajero)
```
POST {{baseUrl}}/api/requests/trip/<trip_id>
Authorization: Bearer {{accessToken_B}}
Content-Type: application/json

{
  "message": "Vivo cerca, salgo puntual"
}
```
**Respuesta esperada `201`:**
```json
{
  "request": {
    "id": "...",
    "status": "PENDING",
    "message": "Vivo cerca, salgo puntual",
    "passenger": { "fullName": "...", "reputationScore": 5 },
    "trip": { "destinationZone": "Campus UTA", ... }
  }
}
```
> Guarda el `request.id`.

Errores que puedes probar:
- Misma cuenta que creó el viaje → `403` "El conductor no puede unirse a su propio viaje"
- Segunda solicitud del mismo pasajero → `400` "Ya enviaste una solicitud"
- Viaje sin cupos → `400` "No hay cupos disponibles"

---

### 2. Ver solicitudes del viaje (cuenta A — conductor)
```
GET {{baseUrl}}/api/requests/trip/<trip_id>
Authorization: Bearer {{accessToken_A}}
```
**Respuesta esperada `200`:**
```json
{
  "requests": [
    {
      "id": "...",
      "status": "PENDING",
      "message": "Vivo cerca, salgo puntual",
      "passenger": { "fullName": "...", "career": "...", "reputationScore": 5 }
    }
  ]
}
```
> Con cuenta B → `403` "Solo el conductor puede ver las solicitudes"

---

### 3. Aceptar solicitud (cuenta A — conductor)
```
PATCH {{baseUrl}}/api/requests/<request_id>/respond
Authorization: Bearer {{accessToken_A}}
Content-Type: application/json

{ "action": "ACCEPT" }
```
**Respuesta esperada `200`:**
```json
{
  "request": {
    "status": "ACCEPTED",
    "passenger": { "fullName": "..." },
    "trip": { "availableSeats": 2 }
  }
}
```
> Verifica que `availableSeats` bajó en 1.

---

### 4. Verificar cupos decrementados
```
GET {{baseUrl}}/api/trips/<trip_id>
Authorization: Bearer {{accessToken_A}}
```
→ `availableSeats` debe ser 1 menos que antes.

---

### 5. Rechazar solicitud (cuenta A — conductor)
Crea otra solicitud con una tercera cuenta, luego:
```
PATCH {{baseUrl}}/api/requests/<request_id>/respond
Authorization: Bearer {{accessToken_A}}
Content-Type: application/json

{ "action": "REJECT" }
```
**Respuesta esperada `200`:** `"status": "REJECTED"`

---

### 6. Ver mis solicitudes como pasajero (cuenta B)
```
GET {{baseUrl}}/api/requests/my
Authorization: Bearer {{accessToken_B}}
```
**Respuesta esperada `200`:** lista de solicitudes con info del viaje y conductor.

---

### 7. Cancelar una solicitud (cuenta B — pasajero)
```
DELETE {{baseUrl}}/api/requests/<request_id>
Authorization: Bearer {{accessToken_B}}
```
**Respuesta esperada `200`:**
```json
{ "message": "Solicitud cancelada y cupo devuelto al viaje" }
```
> Si la solicitud estaba ACCEPTED, el cupo se devuelve automáticamente al viaje.

## FASE 6 — Pagos con Stripe

> **Prerequisito**: necesitas una cuenta Stripe gratuita en [stripe.com](https://stripe.com).
> En el dashboard → Developers → API Keys → copia `sk_test_...` y `pk_test_...`.
> Luego pon la secret key en `server/.env`:
> ```
> STRIPE_SECRET_KEY="sk_test_TU_KEY_AQUI"
> ```

---

### 1. Crear PaymentIntent (pasajero con solicitud ACCEPTED)
```
POST {{baseUrl}}/api/payments/create-intent
Authorization: Bearer {{accessToken_B}}
Content-Type: application/json

{
  "tripRequestId": "<request_id_aceptado>"
}
```
**Respuesta esperada `201`:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentId": "...",
  "amount": 0.50
}
```
> El `clientSecret` es lo que el frontend usaría con Stripe Elements.
> Guarda el `paymentId` y el `tripRequestId`.

Errores que puedes probar:
- Solicitud con status PENDING → `400` "Solo se puede pagar una solicitud aceptada"
- Otro usuario intentando pagar → `403`
- Pagar dos veces un pago ya confirmado → `409`

---

### 2. Simular webhook de Stripe (pago exitoso)

Instala la Stripe CLI: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

En una terminal separada:
```bash
stripe login
stripe listen --forward-to localhost:4000/api/payments/webhook
```
Copia el `whsec_...` que aparece y ponlo en `.env`:
```
STRIPE_WEBHOOK_SECRET="whsec_TU_SECRET_AQUI"
```

En otra terminal, simula el pago:
```bash
stripe trigger payment_intent.succeeded
```
→ El servidor recibe el webhook y actualiza `Payment.status = CONFIRMED`.

---

### 3. Verificar estado del pago
```
GET {{baseUrl}}/api/payments/<tripRequestId>
Authorization: Bearer {{accessToken_B}}
```
**Respuesta esperada `200`:**
```json
{
  "payment": {
    "status": "CONFIRMED",
    "amount": "0.50",
    "confirmedAt": "2026-03-25T...",
    "trip": { "originZone": "La Merced", "destinationZone": "Campus UTA" }
  }
}
```

---

### Tarjeta de prueba Stripe
Cuando integres el frontend, usa esta tarjeta para simular pagos exitosos:

| Campo | Valor |
|-------|-------|
| Número | `4242 4242 4242 4242` |
| Vencimiento | Cualquier fecha futura (ej. `12/29`) |
| CVC | Cualquier 3 dígitos (ej. `123`) |
| ZIP | Cualquier (ej. `12345`) |

## FASE 7 — Calificaciones

> **Prerequisito**: el viaje debe estar en estado `COMPLETED`.
> Usa el endpoint `PATCH /api/trips/:id/status` con `{ "status": "COMPLETED" }` (conductor).

---

### 1. Calificar como pasajero → al conductor
```
POST {{baseUrl}}/api/ratings
Authorization: Bearer {{accessToken_B}}
Content-Type: application/json

{
  "tripRequestId": "<request_id_aceptado>",
  "score": 5,
  "comment": "Conductor muy puntual y amable"
}
```
**Respuesta esperada `201`:**
```json
{
  "rating": {
    "id": "...",
    "score": 5,
    "comment": "Conductor muy puntual y amable",
    "raterRole": "PASSENGER",
    "createdAt": "..."
  }
}
```

---

### 2. Calificar como conductor → al pasajero
```
POST {{baseUrl}}/api/ratings
Authorization: Bearer {{accessToken_A}}
Content-Type: application/json

{
  "tripRequestId": "<mismo_request_id>",
  "score": 4,
  "comment": "Pasajero puntual"
}
```
**Respuesta esperada `201`**

---

### 3. Ver calificaciones de un usuario
```
GET {{baseUrl}}/api/ratings/user/<user_id>?page=1&limit=10
Authorization: Bearer {{accessToken}}
```
**Respuesta esperada `200`:**
```json
{
  "ratings": [
    {
      "score": 5,
      "comment": "Conductor muy puntual",
      "raterRole": "PASSENGER",
      "rater": { "fullName": "..." },
      "createdAt": "..."
    }
  ],
  "total": 1,
  "reputationScore": 5,
  "totalRatings": 1
}
```

---

### Errores que puedes probar
- Viaje no `COMPLETED` → `400` "Solo se puede calificar cuando el viaje está COMPLETED"
- Calificar dos veces → `409` "Ya calificaste este viaje"
- Usuario que no participó en el viaje → `403` "No participaste en este viaje"
- Solicitud con status `PENDING` o `REJECTED` → `400`

## FASE 8 — Reportes + Admin

---

### Preparar cuenta admin
Primero necesitas promover un usuario a ADMIN. Conéctate a pgAdmin y ejecuta:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'tu_usuario@uta.edu.ec';
```
Luego haz login con esa cuenta y guarda el token en `{{accessToken_admin}}`.

---

### 1. Crear un reporte (cualquier estudiante)
Usa `multipart/form-data` (no JSON) para poder adjuntar archivos.
```
POST {{baseUrl}}/api/reports
Authorization: Bearer {{accessToken_B}}
Content-Type: multipart/form-data

reportedId:   <id_del_usuario_a_reportar>
reason:       INAPPROPRIATE_BEHAVIOR
description:  El conductor no respetó las reglas mínimas de seguridad durante el viaje.
evidence:     (archivo opcional: imagen o PDF, máx 5MB, hasta 3 archivos)
```
**Respuesta esperada `201`:**
```json
{
  "report": {
    "id": "...",
    "reason": "INAPPROPRIATE_BEHAVIOR",
    "status": "OPEN",
    "evidenceUrls": ["/uploads/1234567-archivo.jpg"],
    "reported": { "fullName": "..." }
  }
}
```

Valores válidos para `reason`:
- `INAPPROPRIATE_BEHAVIOR`
- `NO_SHOW`
- `FRAUD`
- `UNSAFE_DRIVING`
- `HARASSMENT`
- `OTHER`

Errores que puedes probar:
- Reportarse a sí mismo → `400`
- Usuario reportado no existe → `404`

---

### 2. Ver mis reportes enviados
```
GET {{baseUrl}}/api/reports/my
Authorization: Bearer {{accessToken_B}}
```
**Respuesta esperada `200`:** lista de reportes con estado y revisiones.

---

### 3. Admin — listar todos los reportes
```
GET {{baseUrl}}/api/admin/reports?status=OPEN&page=1&limit=10
Authorization: Bearer {{accessToken_admin}}
```
→ Sin cuenta ADMIN → `403` "Acceso restringido a administradores"

---

### 4. Admin — ver detalle de un reporte
```
GET {{baseUrl}}/api/admin/reports/<report_id>
Authorization: Bearer {{accessToken_admin}}
```
**Respuesta esperada `200`:** reporte completo con info de reporter, reported y revisiones previas.

---

### 5. Admin — aplicar acción sobre un reporte
```
PATCH {{baseUrl}}/api/admin/reports/<report_id>
Authorization: Bearer {{accessToken_admin}}
Content-Type: application/json

{
  "action": "WARNED",
  "notes": "Primera advertencia por comportamiento inapropiado"
}
```
Valores válidos para `action`:
- `WARNED` → usuario pasa a status `WARNED`
- `SUSPENDED` → usuario pasa a status `SUSPENDED`
- `DISMISSED` → reporte cerrado sin acción

**Respuesta esperada `200`:**
```json
{
  "report": { "status": "RESOLVED" },
  "affectedUser": { "fullName": "...", "status": "WARNED" }
}
```

---

### 6. Admin — listar usuarios
```
GET {{baseUrl}}/api/admin/users?status=WARNED&search=Juan&page=1
Authorization: Bearer {{accessToken_admin}}
```
Filtros disponibles: `status` (ACTIVE/WARNED/SUSPENDED), `search` (nombre o email).

---

### 7. Admin — cambiar estado de un usuario directamente
```
PATCH {{baseUrl}}/api/admin/users/<user_id>/status
Authorization: Bearer {{accessToken_admin}}
Content-Type: application/json

{ "status": "SUSPENDED" }
```
**Respuesta esperada `200`:** usuario con nuevo status.

---

### 8. Verificar que usuario suspendido no puede hacer login
```
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "usuario_suspendido@uta.edu.ec",
  "password": "Password123!"
}
```
→ `403` "Tu cuenta está suspendida"

## FASE 9 — GPS en Tiempo Real (Socket.io)

> Postman tiene soporte básico de WebSocket pero Socket.io usa un protocolo propio.
> La forma más fácil de probar es desde la **consola del navegador**.

---

### Opción A — Probar desde consola del navegador

Abre `http://localhost:4000` en el navegador (o cualquier página), luego abre DevTools (F12) → **Console** y pega:

```javascript
// 1. Conectar con tu token
const socket = io('http://localhost:4000', {
  auth: { token: 'eyJ...' }  // ← pega tu accessToken aquí
});

socket.on('connect', () => console.log('✅ Conectado:', socket.id));
socket.on('connect_error', (err) => console.error('❌ Error:', err.message));
socket.on('error', (data) => console.error('Error del servidor:', data));
```

Necesitas cargar Socket.io primero — en otra pestaña del navegador abre:
```
http://localhost:4000/socket.io/socket.io.js
```
Y pégalo en la consola, o añade en el HTML:
```html
<script src="http://localhost:4000/socket.io/socket.io.js"></script>
```

---

### Opción B — Script Node.js de prueba (recomendado)

Crea un archivo temporal `test-socket.mjs` en cualquier carpeta:

```javascript
import { io } from 'socket.io-client';

const TOKEN = 'eyJ...'; // ← tu accessToken
const TRIP_ID = 'cl...'; // ← id de un viaje IN_PROGRESS

const socket = io('http://localhost:4000', {
  auth: { token: TOKEN }
});

socket.on('connect', () => {
  console.log('✅ Conectado:', socket.id);

  // Unirse a la sala del viaje
  socket.emit('join:trip', { tripId: TRIP_ID });
});

socket.on('joined:trip', (data) => {
  console.log('✅ Unido a viaje:', data);

  // Conductor emite ubicación (solo si eres el conductor del viaje)
  socket.emit('location:update', {
    tripId: TRIP_ID,
    lat: -1.2543,
    lng: -78.6234
  });
});

socket.on('location:update', (data) => {
  console.log('📍 Ubicación recibida:', data);
});

socket.on('request:update', (data) => {
  console.log('📬 Solicitud actualizada:', data);
});

socket.on('error', (data) => console.error('❌ Error:', data.message));
```

Ejecutar:
```bash
npm install socket.io-client  # en la carpeta del archivo
node test-socket.mjs
```

---

### Flujo completo de prueba

1. Viaje debe estar en estado `IN_PROGRESS` (`PATCH /api/trips/:id/status`)
2. **Conductor** (cuenta A) se conecta y hace `join:trip`
3. **Pasajero** (cuenta B, solicitud ACCEPTED) se conecta y hace `join:trip`
4. **Conductor** emite `location:update` con lat/lng
5. **Pasajero** recibe el evento `location:update` en tiempo real

---

### Eventos disponibles

**Cliente → Servidor:**
| Evento | Payload | Descripción |
|--------|---------|-------------|
| `join:trip` | `{ tripId }` | Unirse a sala del viaje |
| `leave:trip` | `{ tripId }` | Salir de sala |
| `location:update` | `{ tripId, lat, lng }` | Solo el conductor |

**Servidor → Cliente:**
| Evento | Payload | Descripción |
|--------|---------|-------------|
| `joined:trip` | `{ tripId }` | Confirmación de unión |
| `location:update` | `{ lat, lng, timestamp, driverId }` | GPS del conductor |
| `request:update` | `{ requestId, status }` | Al aceptar/rechazar solicitud |
| `error` | `{ message }` | Error de validación |
