# U-Ride (UTA) - Requerimientos y casos de prueba

Este documento consolida los requerimientos funcionales y no funcionales del sistema, junto con 3+ casos de prueba por requerimiento. Se basa en la arquitectura y la guia de endpoints del proyecto.

## Requerimientos funcionales (FR)

### FR-01 - Health check del backend
El sistema debe exponer un endpoint de salud para validar servidor y BD.

Casos de prueba:
1. GET /health con BD activa -> 200 y { status: "ok", db: "connected" }.
2. GET /health con BD caida -> 200 con db distinto a "connected" o error controlado.
3. GET /health sin autenticacion -> 200 (publico).

### FR-02 - Registro de usuario con correo UTA
El sistema debe permitir registrar usuarios con correo @uta.edu.ec y enviar OTP.

Casos de prueba:
1. POST /api/auth/register con email @uta.edu.ec -> 201 y mensaje de verificacion.
2. POST /api/auth/register con email no UTA -> 400 y error de dominio.
3. POST /api/auth/register con email duplicado -> 409 o error de registro duplicado.

### FR-03 - Verificacion de correo (OTP)
El sistema debe permitir verificar email con codigo OTP valido.

Casos de prueba:
1. POST /api/auth/verify-email con codigo correcto -> 200 y email verificado.
2. POST /api/auth/verify-email con codigo invalido -> 400.
3. POST /api/auth/verify-email con OTP expirado -> 400.

### FR-04 - Login, refresh y logout
El sistema debe autenticar usuarios y emitir accessToken, refrescarlo y cerrar sesion.

Casos de prueba:
1. POST /api/auth/login con credenciales validas -> 200, accessToken y cookie refreshToken.
2. POST /api/auth/refresh con cookie valida -> 200 y nuevo accessToken.
3. POST /api/auth/logout -> 200 y cookie refreshToken eliminada.

### FR-05 - Perfil de usuario autenticado
El usuario autenticado debe poder ver su perfil completo.

Casos de prueba:
1. GET /api/users/me con token valido -> 200 y datos del usuario.
2. GET /api/users/me sin token -> 401.
3. GET /api/users/me con token invalido -> 401.

### FR-06 - Actualizacion de perfil
El usuario autenticado debe poder actualizar datos basicos de su perfil.

Casos de prueba:
1. PATCH /api/users/me con datos validos -> 200 y datos actualizados.
2. PATCH /api/users/me con datos invalidos (telefono corto) -> 400.
3. PATCH /api/users/me sin token -> 401.

### FR-07 - Registro de vehiculo
El usuario debe poder registrar un vehiculo una sola vez.

Casos de prueba:
1. POST /api/users/me/vehicle con datos validos -> 201 y vehiculo creado.
2. POST /api/users/me/vehicle por segunda vez -> 409.
3. POST /api/users/me/vehicle con datos invalidos (anio < 1990) -> 400.

### FR-08 - Actualizacion de vehiculo
El usuario debe poder actualizar su vehiculo existente.

Casos de prueba:
1. PATCH /api/users/me/vehicle con cambios validos -> 200 y vehiculo actualizado.
2. PATCH /api/users/me/vehicle sin vehiculo previo -> 404.
3. PATCH /api/users/me/vehicle sin token -> 401.

### FR-09 - Perfil publico de usuario
El sistema debe exponer el perfil publico de un usuario autenticado sin datos sensibles.

Casos de prueba:
1. GET /api/users/:id con token valido -> 200 y sin email/passwordHash.
2. GET /api/users/:id con id inexistente -> 404.
3. GET /api/users/:id sin token -> 401.

### FR-10 - Crear viaje
El conductor debe poder crear viajes con asientos y precio.

Casos de prueba:
1. POST /api/trips con datos validos -> 201 y viaje SCHEDULED.
2. POST /api/trips con asientos <= 0 -> 400.
3. POST /api/trips sin token -> 401.

### FR-11 - Listar y filtrar viajes
El usuario debe poder listar y filtrar viajes disponibles.

Casos de prueba:
1. GET /api/trips sin filtros -> 200 con paginacion.
2. GET /api/trips?destinationZone=...&departureDate=... -> 200 con filtro.
3. GET /api/trips con filtros sin coincidencias -> 200 y lista vacia.

### FR-12 - Detalle de viaje
El usuario debe poder ver el detalle de un viaje.

Casos de prueba:
1. GET /api/trips/:id con id valido -> 200 y detalle del viaje.
2. GET /api/trips/:id con id inexistente -> 404.
3. GET /api/trips/:id sin token -> 401.

### FR-13 - Aceptar reglas de seguridad
El pasajero debe poder aceptar reglas de seguridad de un viaje (idempotente).

Casos de prueba:
1. POST /api/trips/:id/safety-ack primer intento -> 201.
2. POST /api/trips/:id/safety-ack segundo intento -> 201 (idempotente).
3. POST /api/trips/:id/safety-ack sin token -> 401.

### FR-14 - Actualizar viaje (solo conductor)
El conductor debe poder actualizar su viaje solo si esta SCHEDULED.

Casos de prueba:
1. PATCH /api/trips/:id con conductor y estado SCHEDULED -> 200.
2. PATCH /api/trips/:id por otro usuario -> 403.
3. PATCH /api/trips/:id con estado IN_PROGRESS -> 400.

### FR-15 - Cambiar estado del viaje
El conductor debe poder cambiar estado de viaje siguiendo transiciones validas.

Casos de prueba:
1. PATCH /api/trips/:id/status SCHEDULED -> IN_PROGRESS -> 200.
2. PATCH /api/trips/:id/status IN_PROGRESS -> COMPLETED -> 200.
3. PATCH /api/trips/:id/status COMPLETED -> IN_PROGRESS -> 400.

### FR-16 - Cancelar viaje
El conductor debe poder cancelar su viaje (soft delete).

Casos de prueba:
1. DELETE /api/trips/:id por conductor -> 200 y status CANCELLED.
2. DELETE /api/trips/:id por otro usuario -> 403.
3. DELETE /api/trips/:id con id inexistente -> 404.

### FR-17 - Enviar solicitud de viaje
El pasajero debe poder enviar una solicitud a un viaje con cupos.

Casos de prueba:
1. POST /api/requests/trip/:tripId por pasajero -> 201.
2. POST /api/requests/trip/:tripId por conductor del mismo viaje -> 403.
3. POST /api/requests/trip/:tripId con cupos agotados -> 400.

### FR-18 - Ver solicitudes de un viaje (conductor)
El conductor debe poder listar solicitudes de su viaje.

Casos de prueba:
1. GET /api/requests/trip/:tripId por conductor -> 200.
2. GET /api/requests/trip/:tripId por pasajero -> 403.
3. GET /api/requests/trip/:tripId sin token -> 401.

### FR-19 - Aceptar o rechazar solicitud
El conductor debe poder aceptar o rechazar solicitudes y ajustar cupos.

Casos de prueba:
1. PATCH /api/requests/:id/respond action=ACCEPT -> 200 y cupos -1.
2. PATCH /api/requests/:id/respond action=REJECT -> 200 y status REJECTED.
3. PATCH /api/requests/:id/respond por otro usuario -> 403.

### FR-20 - Ver mis solicitudes (pasajero)
El pasajero debe poder listar sus solicitudes.

Casos de prueba:
1. GET /api/requests/my -> 200 con lista.
2. GET /api/requests/my sin token -> 401.
3. GET /api/requests/my con token invalido -> 401.

### FR-21 - Cancelar solicitud
El pasajero debe poder cancelar su solicitud y devolver cupo si estaba aceptada.

Casos de prueba:
1. DELETE /api/requests/:id por pasajero -> 200 y mensaje.
2. DELETE /api/requests/:id por otro usuario -> 403.
3. DELETE /api/requests/:id con id inexistente -> 404.

### FR-22 - Crear intento de pago
El pasajero con solicitud ACCEPTED debe poder crear PaymentIntent.

Casos de prueba:
1. POST /api/payments/create-intent con solicitud ACCEPTED -> 201 y clientSecret.
2. POST /api/payments/create-intent con solicitud PENDING -> 400.
3. POST /api/payments/create-intent por otro usuario -> 403.

### FR-23 - Confirmacion de pago (webhook)
El sistema debe actualizar el pago a CONFIRMED cuando Stripe confirme el intento.

Casos de prueba:
1. Simular webhook payment_intent.succeeded -> payment CONFIRMED.
2. Webhook con firma invalida -> 400.
3. Webhook repetido -> idempotente (sin duplicar).

### FR-24 - Consultar estado de pago
El pasajero debe poder consultar el estado del pago.

Casos de prueba:
1. GET /api/payments/:tripRequestId por pasajero -> 200 con status.
2. GET /api/payments/:tripRequestId por otro usuario -> 403.
3. GET /api/payments/:tripRequestId inexistente -> 404.

### FR-25 - Calificaciones
Usuarios deben poder calificar solo cuando el viaje este COMPLETED.

Casos de prueba:
1. POST /api/ratings con viaje COMPLETED -> 201.
2. POST /api/ratings con viaje IN_PROGRESS -> 400.
3. POST /api/ratings duplicado -> 409.

### FR-26 - Ver calificaciones de usuario
El sistema debe listar calificaciones de un usuario con reputacion agregada.

Casos de prueba:
1. GET /api/ratings/user/:userId -> 200 con total y reputacion.
2. GET /api/ratings/user/:userId inexistente -> 404 o lista vacia.
3. GET /api/ratings/user/:userId sin token -> 401.

### FR-27 - Reportar usuario
El usuario debe poder crear reportes con evidencia opcional.

Casos de prueba:
1. POST /api/reports con datos validos -> 201.
2. POST /api/reports reportandose a si mismo -> 400.
3. POST /api/reports con archivo > 5MB -> 400.

### FR-28 - Ver mis reportes
El usuario debe poder ver sus reportes enviados.

Casos de prueba:
1. GET /api/reports/my -> 200.
2. GET /api/reports/my sin token -> 401.
3. GET /api/reports/my con token invalido -> 401.

### FR-29 - Admin: gestionar reportes
El administrador debe poder listar, ver y resolver reportes.

Casos de prueba:
1. GET /api/admin/reports por admin -> 200.
2. GET /api/admin/reports por no admin -> 403.
3. PATCH /api/admin/reports/:id action=WARNED -> 200 y usuario WARNED.

### FR-30 - Admin: gestionar usuarios
El administrador debe poder listar usuarios y cambiar estado.

Casos de prueba:
1. GET /api/admin/users por admin -> 200 con filtros.
2. PATCH /api/admin/users/:id/status por admin -> 200 y status actualizado.
3. PATCH /api/admin/users/:id/status por no admin -> 403.

### FR-31 - Usuario suspendido no puede login
El sistema debe bloquear login de usuarios con status SUSPENDED.

Casos de prueba:
1. POST /api/auth/login con status SUSPENDED -> 403.
2. POST /api/auth/login con status WARNED -> 200.
3. POST /api/auth/login con status ACTIVE -> 200.

### FR-32 - GPS en tiempo real
El sistema debe permitir envio y recepcion de ubicacion en tiempo real.

Casos de prueba:
1. Conductor emite location:update y pasajero la recibe -> OK.
2. Pasajero intenta emitir location:update -> error.
3. Usuario no autorizado intenta join:trip -> error.

## Requerimientos no funcionales (NFR)

### NFR-01 - Seguridad y autenticacion
El sistema debe proteger endpoints con JWT y roles.

Casos de prueba:
1. Endpoint protegido sin token -> 401.
2. Endpoint admin con token STUDENT -> 403.
3. Token expirado -> 401.

### NFR-02 - Validacion de datos
El sistema debe validar entradas con Zod y devolver errores claros.

Casos de prueba:
1. Campo requerido faltante -> 400 con detalles.
2. Formato invalido (email/telefono) -> 400.
3. Campos extra ignorados o rechazados segun esquema -> 400.

### NFR-03 - Privacidad de datos
El sistema no debe exponer datos sensibles en perfiles publicos.

Casos de prueba:
1. GET /api/users/:id no incluye email/passwordHash/refreshToken.
2. Logs no muestran password en texto plano.
3. Respuestas de error no filtran datos sensibles.

### NFR-04 - Confiabilidad e idempotencia
Operaciones criticas deben ser idempotentes cuando aplica.

Casos de prueba:
1. POST /api/trips/:id/safety-ack repetido -> misma respuesta.
2. Webhook Stripe repetido -> sin duplicados.
3. Reintento de logout -> 200 y cookie limpia.

### NFR-05 - Rendimiento
El sistema debe responder rapidamente para operaciones comunes.

Casos de prueba:
1. GET /api/trips lista 10 items < 500ms.
2. GET /api/users/me < 300ms.
3. POST /api/requests/trip/:id < 500ms.

### NFR-06 - Disponibilidad
Servicios core deben estar disponibles durante pruebas y demo.

Casos de prueba:
1. Backend arriba -> /health 200.
2. BD arriba -> /health db=connected.
3. Socket.io acepta conexiones -> connect ok.

### NFR-07 - Mantenibilidad y testabilidad
La arquitectura debe permitir pruebas unitarias con DI.

Casos de prueba:
1. UsersService se testea con Prisma mock -> tests pasan.
2. App separada de server.listen -> supertest posible.
3. Servicios con dependencias inyectables -> mocks sencillos.

### NFR-08 - Usabilidad
El frontend debe ser responsive y claro para estudiantes.

Casos de prueba:
1. Pantallas clave en mobile sin overflow.
2. Acciones criticas (login, publicar viaje) <= 3 pasos.
3. Mensajes de error claros y en espanol.

### NFR-09 - Escalabilidad
El sistema debe soportar crecimiento en viajes y usuarios.

Casos de prueba:
1. Indices en tablas clave existen (trips, requests, users).
2. Paginacion en listados -> no devuelve todo.
3. Filtros no hacen full scan (ver plan en DB).

---

## Alcance de pruebas unitarias en modulo de usuarios
Se agregaron pruebas unitarias para el servicio de usuarios (UsersService) cubriendo:
- Obtener perfil autenticado
- Actualizar perfil
- Crear vehiculo (incluye validacion de duplicado)
- Actualizar vehiculo (incluye validacion de inexistente)
- Obtener perfil publico

Las pruebas estan en: server/src/services/users.service.test.ts
