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

## FASE 7 — Calificaciones *(próximamente)*

## FASE 8 — Reportes + Admin *(próximamente)*

## FASE 9 — GPS en Tiempo Real *(próximamente)*
