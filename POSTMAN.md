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

## FASE 4 — Viajes *(próximamente)*

## FASE 5 — Solicitudes *(próximamente)*

## FASE 6 — Pagos con Stripe *(próximamente)*

## FASE 7 — Calificaciones *(próximamente)*

## FASE 8 — Reportes + Admin *(próximamente)*

## FASE 9 — GPS en Tiempo Real *(próximamente)*
