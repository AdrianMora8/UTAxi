# U-Ride — Transporte Compartido para Estudiantes (UTA)
## Documento de Arquitectura y Planificación

---

## Context
Proyecto universitario UTA (uta.edu.ec) para la materia de Gestión de Pruebas.
- **Primer parcial**: Modelado + arquitectura (este plan)
- **Segundo parcial**: Implementación completa
- **Tarea futura (no implementar aún)**: Manual de pruebas con Vitest, React Testing Library, Playwright, Artillery, OWASP ZAP, ESLint+SonarQube → la arquitectura debe facilitar todos estos tipos de test desde el inicio

El sistema es ride-sharing para estudiantes verificados con correo `@uta.edu.ec`.
Universidad Técnica de Ambato — Facultad de Ingeniería en Sistemas, Electrónica e Industrial.
Stack: React + TypeScript (frontend responsivo), Express + TypeScript (backend), PostgreSQL vía Docker.

---

## Estructura de Repositorio: Monorepo ✅

**Decisión: Un único repositorio** con la siguiente raíz:

```
UTAxi/                          ← raíz del monorepo
├── docker-compose.yml          ← servicios compartidos (PostgreSQL, pgAdmin)
├── docker-compose.test.yml     ← BD aislada para tests
├── e2e/                        ← Tests Playwright (prueban cliente + servidor juntos)
│   ├── playwright.config.ts
│   └── tests/
├── client/                     ← Frontend React
└── server/                     ← Backend Express
```

**Por qué monorepo y no dos repos separados:**

| Criterio | Monorepo ✅ | Dos repos ❌ |
|----------|------------|-------------|
| Tipos TypeScript compartidos | Un solo `types/` reutilizable en cliente y servidor | Duplicar o sincronizar manualmente |
| Schemas Zod | La misma validación en backend y frontend | Dos copias que se desincronizarán |
| Docker Compose | Naturalmente en la raíz — sirve a ambos | Iría en `server/`, el cliente no lo toca |
| Onboarding del equipo | Un solo `git clone` para tener todo | Clonar y coordinar dos repos |
| Tests E2E (Playwright) | Viven en la raíz, prueban el stack completo | Necesitarían un tercer repo o ir en uno de los dos |
| Proyecto universitario | Más simple de gestionar, menos overhead | Más configuración sin beneficio real |

Los archivos Docker en la raíz son correctos: PostgreSQL es un servicio de infraestructura compartida, no pertenece ni al cliente ni al servidor.

---

## Decisiones de Stack

### Framework Backend: Express.js (NO Fastify)
Express es el framework Node.js más conocido, con la mayor cantidad de recursos, tutoriales y comunidad. Para un proyecto universitario es la opción correcta: simple, directa, y el equipo encontrará soporte fácilmente. Fastify ofrece más performance pero innecesaria aquí y tiene una curva de aprendizaje adicional.

### Base de Datos: PostgreSQL en Docker ✅
- Datos altamente relacionales (usuarios ↔ viajes ↔ solicitudes ↔ pagos ↔ calificaciones ↔ reportes)
- ACID obligatorio para pagos (transacciones atómicas)
- Consultas complejas de filtrado → SQL natural
- Prisma ORM genera tipos TypeScript automáticamente
- **Todo corre en Docker** — no se instala PostgreSQL en la máquina, solo pgAdmin

### Pagos: Stripe ✅ (recomendación final)

**Análisis de opciones:**

| Opción | Pros | Contras |
|--------|------|---------|
| **Stripe** | Mejor DX del mercado, modo test completo (sin dinero real), documentación excelente, integración React oficial | Requiere tarjeta (no QR bancario local) |
| Mercado Pago | Popular en LatAm, tiene Ecuador, QR disponible | API más compleja, integración React no oficial |
| PayPal | Reconocido globalmente | Lento, UX anticuada, fees altos, no ideal para micropagos de viajes |
| De Una (QR) | Nativo Ecuador | Sin API REST documentada → imposible integrar automáticamente |

**Decisión: Stripe** por estas razones concretas para el proyecto:
- En modo **test** funciona 100% sin dinero real (tarjeta `4242 4242 4242 4242`)
- Integración React con `@stripe/react-stripe-js` es oficial y simple (componente `CardElement` listo)
- Backend: una función `stripe.paymentIntents.create()` genera el pago
- Demostrable en clase sin cuenta bancaria real
- El flujo es idéntico a cómo funciona Uber/Cabify: pasajero ingresa tarjeta, pago automático al confirmar

**Flujo de pago Stripe:**
```
Conductor acepta solicitud del pasajero
  → Backend: stripe.paymentIntents.create({ amount, currency: 'usd' })
  → Frontend: <CardElement> + stripe.confirmCardPayment(clientSecret)
  → Stripe procesa → webhook POST /api/payments/webhook confirma
  → Payment.status = CONFIRMED
  → Cupo descontado del viaje
```

### Frontend: Vite + React 18 + TypeScript
- **Build**: Vite (HMR instantáneo)
- **Estilos**: Tailwind CSS + shadcn/ui (componentes accesibles y testeables)
- **Estado servidor**: TanStack React Query v5
- **Estado cliente**: Zustand
- **Routing**: React Router v6
- **Mapas**: Leaflet.js + React-Leaflet + OpenStreetMap (sin API key, gratuito)
- **Tiempo real**: Socket.io-client
- **Pagos**: `@stripe/react-stripe-js` + `@stripe/stripe-js`

---

## Docker: Configuración Completa

### Estructura Docker (en raíz del proyecto)

```
UTAxi/
├── docker-compose.yml          ← PostgreSQL + pgAdmin
├── docker-compose.test.yml     ← Base de datos separada para tests
├── client/
└── server/
```

### `docker-compose.yml`
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    container_name: utaxi_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: utaxi
      POSTGRES_USER: utaxi
      POSTGRES_PASSWORD: utaxi123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U utaxi"]
      interval: 5s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: utaxi_pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@utaxi.com
      PGADMIN_DEFAULT_PASSWORD: admin123
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### `docker-compose.test.yml`
```yaml
version: '3.9'
services:
  postgres_test:
    image: postgres:16-alpine
    container_name: utaxi_db_test
    environment:
      POSTGRES_DB: utaxi_test
      POSTGRES_USER: utaxi
      POSTGRES_PASSWORD: utaxi123
    ports:
      - "5433:5432"   # Puerto diferente para no conflictar
    tmpfs:
      - /var/lib/postgresql/data  # En memoria, rápido para tests
```

### Scripts `server/package.json`
```json
{
  "scripts": {
    "docker:up": "docker-compose -f ../docker-compose.yml up -d",
    "docker:down": "docker-compose -f ../docker-compose.yml down",
    "docker:test:up": "docker-compose -f ../docker-compose.test.yml up -d",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts",
    "dev": "npm run docker:up && prisma generate && tsx watch src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "npm run docker:test:up && vitest run",
    "test:watch": "vitest"
  }
}
```

pgAdmin accesible en `http://localhost:5050` (email: admin@utaxi.com / pass: admin123)
Conectar servidor: Host=`postgres`, Port=5432, DB=`utaxi`, User=`utaxi`, Pass=`utaxi123`

---

## Schema de Base de Datos (Prisma)

### Enums
```prisma
enum Role { STUDENT ADMIN }
enum UserStatus { ACTIVE WARNED SUSPENDED }
enum TripStatus { SCHEDULED IN_PROGRESS COMPLETED CANCELLED }
enum RequestStatus { PENDING ACCEPTED REJECTED CANCELLED }
enum PaymentStatus { PENDING PROCESSING CONFIRMED FAILED REFUNDED }
enum ReportStatus { OPEN REVIEWED RESOLVED }
enum ReportReason { INAPPROPRIATE_BEHAVIOR NO_SHOW FRAUD UNSAFE_DRIVING HARASSMENT OTHER }
```

### Modelos (Prisma schema.prisma)
```prisma
model User {
  id                String       @id @default(cuid())
  email             String       @unique
  passwordHash      String
  fullName          String
  career            String?
  phone             String?
  photoUrl          String?
  neighborhood      String?
  role              Role         @default(STUDENT)
  status            UserStatus   @default(ACTIVE)
  emailVerified     Boolean      @default(false)
  emailVerifyToken  String?
  emailVerifyExpiry DateTime?
  refreshToken      String?
  reputationScore   Float        @default(5.0)
  totalTrips        Int          @default(0)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  tripsAsDriver     Trip[]        @relation("DriverTrips")
  vehicle           Vehicle?
  tripRequests      TripRequest[] @relation("PassengerRequests")
  ratingsGiven      Rating[]      @relation("RaterUser")
  ratingsReceived   Rating[]      @relation("RatedUser")
  reportsFiled      Report[]      @relation("ReporterUser")
  reportsReceived   Report[]      @relation("ReportedUser")
  reportReviews     ReportReview[]
  payments          Payment[]

  @@index([email])
  @@map("users")
}

model Vehicle {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  brand       String
  model       String
  year        Int
  plateNumber String
  color       String
  createdAt   DateTime @default(now())
  @@map("vehicles")
}

model Trip {
  id                String      @id @default(cuid())
  driverId          String
  driver            User        @relation("DriverTrips", fields: [driverId], references: [id])
  originZone        String
  destinationZone   String
  departureTime     DateTime
  totalSeats        Int
  availableSeats    Int
  pricePerSeat      Decimal     @db.Decimal(8, 2)
  notes             String?
  rules             String?
  status            TripStatus  @default(SCHEDULED)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  requests          TripRequest[]
  payments          Payment[]

  @@index([destinationZone, departureTime, availableSeats, status])
  @@index([driverId])
  @@map("trips")
}

model TripRequest {
  id          String        @id @default(cuid())
  tripId      String
  trip        Trip          @relation(fields: [tripId], references: [id])
  passengerId String
  passenger   User          @relation("PassengerRequests", fields: [passengerId], references: [id])
  status      RequestStatus @default(PENDING)
  message     String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  payment     Payment?
  rating      Rating?

  @@unique([tripId, passengerId])
  @@index([tripId, status])
  @@index([passengerId])
  @@map("trip_requests")
}

model Payment {
  id                 String        @id @default(cuid())
  tripRequestId      String        @unique
  tripRequest        TripRequest   @relation(fields: [tripRequestId], references: [id])
  tripId             String
  trip               Trip          @relation(fields: [tripId], references: [id])
  payerId            String
  payer              User          @relation(fields: [payerId], references: [id])
  amount             Decimal       @db.Decimal(8, 2)
  stripePaymentId    String?       @unique  // PaymentIntent ID de Stripe
  status             PaymentStatus @default(PENDING)
  confirmedAt        DateTime?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  @@index([stripePaymentId])
  @@map("payments")
}

model Rating {
  id            String      @id @default(cuid())
  tripRequestId String      @unique
  tripRequest   TripRequest @relation(fields: [tripRequestId], references: [id])
  raterId       String
  rater         User        @relation("RaterUser", fields: [raterId], references: [id])
  ratedId       String
  rated         User        @relation("RatedUser", fields: [ratedId], references: [id])
  score         Int         // 1-5
  comment       String?
  raterRole     String      // "DRIVER" | "PASSENGER"
  createdAt     DateTime    @default(now())

  @@index([ratedId])
  @@map("ratings")
}

model Report {
  id           String       @id @default(cuid())
  reporterId   String
  reporter     User         @relation("ReporterUser", fields: [reporterId], references: [id])
  reportedId   String
  reported     User         @relation("ReportedUser", fields: [reportedId], references: [id])
  reason       ReportReason
  description  String
  evidenceUrls String[]
  status       ReportStatus @default(OPEN)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  reviews      ReportReview[]

  @@index([reportedId, status])
  @@map("reports")
}

model ReportReview {
  id        String   @id @default(cuid())
  reportId  String
  report    Report   @relation(fields: [reportId], references: [id])
  adminId   String
  admin     User     @relation(fields: [adminId], references: [id])
  action    String   // "WARNED" | "SUSPENDED" | "DISMISSED"
  notes     String?
  createdAt DateTime @default(now())
  @@map("report_reviews")
}

model SafetyAcknowledgment {
  id             String   @id @default(cuid())
  userId         String
  tripId         String
  acknowledgedAt DateTime @default(now())

  @@unique([userId, tripId])
  @@map("safety_acknowledgments")
}
```

---

## Estructura de Carpetas

### `server/` — Arquitectura en capas (pensada para testabilidad)

La clave: **servicios como clases con inyección de dependencias** → el cliente Prisma se pasa al constructor → en tests se mockea fácilmente con Vitest.

```
server/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                     # Datos de prueba para demo y E2E
├── src/
│   ├── config/
│   │   ├── env.ts                  # Variables de entorno validadas con zod
│   │   ├── database.ts             # Singleton PrismaClient
│   │   ├── mailer.ts               # Nodemailer transport
│   │   └── stripe.ts               # Stripe client
│   ├── app.ts                      # Express app factory (sin listen → testeable)
│   ├── server.ts                   # Solo llama app.listen() → separado para tests
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── trips.routes.ts
│   │   ├── requests.routes.ts
│   │   ├── payments.routes.ts
│   │   ├── ratings.routes.ts
│   │   ├── reports.routes.ts
│   │   └── admin.routes.ts
│   ├── controllers/                # Solo HTTP: parsea req, llama service, responde
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── trips.controller.ts
│   │   ├── requests.controller.ts
│   │   ├── payments.controller.ts
│   │   ├── ratings.controller.ts
│   │   ├── reports.controller.ts
│   │   └── admin.controller.ts
│   ├── services/                   # LÓGICA DE NEGOCIO PURA — aquí van los tests unitarios
│   │   ├── auth.service.ts         # Clase con constructor(prisma, mailer)
│   │   ├── users.service.ts
│   │   ├── trips.service.ts
│   │   ├── requests.service.ts
│   │   ├── payments.service.ts     # Clase con constructor(prisma, stripe)
│   │   ├── ratings.service.ts
│   │   ├── reports.service.ts
│   │   └── admin.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts      # verifyToken, requireAdmin
│   │   ├── validate.middleware.ts  # validación zod de req.body
│   │   └── errorHandler.ts        # Centralizado → fácil de testear
│   ├── socket/
│   │   └── tracking.gateway.ts    # Socket.io GPS events
│   ├── utils/
│   │   ├── jwt.ts                  # Funciones puras → unit tests directos
│   │   ├── hash.ts
│   │   └── pagination.ts
│   └── types/
│       ├── express.d.ts            # Augment Request con user
│       └── index.ts
├── tests/                          # Tests del backend
│   ├── unit/
│   │   ├── auth.service.test.ts
│   │   ├── trips.service.test.ts
│   │   ├── payments.service.test.ts
│   │   └── utils/
│   │       └── jwt.test.ts
│   ├── integration/
│   │   ├── auth.routes.test.ts     # Supertest contra app.ts (sin listen)
│   │   ├── trips.routes.test.ts
│   │   └── payments.routes.test.ts
│   └── helpers/
│       ├── testDb.ts               # Setup/teardown DB de test
│       └── fixtures.ts             # Datos de prueba reutilizables
├── .env
├── .env.test                       # DATABASE_URL apunta a puerto 5433 (utaxi_test)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Por qué esta separación `app.ts` / `server.ts`:**
```typescript
// app.ts — exporta la app Express sin escuchar
export const app = express();
// ... middlewares, rutas

// server.ts — solo para producción/dev
import { app } from './app';
app.listen(PORT);

// tests/integration/auth.routes.test.ts
import { app } from '../../src/app';
import request from 'supertest';
// supertest usa app directamente sin necesitar un puerto real
```

### `client/`

```
client/
├── src/
│   ├── api/
│   │   ├── client.ts              # Axios con interceptors (token, refresh)
│   │   ├── auth.api.ts
│   │   ├── trips.api.ts
│   │   ├── requests.api.ts
│   │   ├── payments.api.ts
│   │   └── reports.api.ts
│   ├── components/
│   │   ├── ui/                    # shadcn/ui (Button, Dialog, Form, Badge, Toast...)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── trips/
│   │   │   ├── TripCard.tsx
│   │   │   ├── TripForm.tsx       # React Hook Form + zod
│   │   │   ├── TripFilters.tsx
│   │   │   └── TripMap.tsx
│   │   ├── tracking/
│   │   │   └── LiveMap.tsx        # React-Leaflet, recibe coords por Socket.io
│   │   ├── payments/
│   │   │   └── StripePaymentModal.tsx  # @stripe/react-stripe-js CardElement
│   │   ├── ratings/
│   │   │   └── RatingStars.tsx
│   │   └── shared/
│   │       ├── SafetyRulesModal.tsx
│   │       └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSocket.ts
│   │   └── useGeolocation.ts
│   ├── pages/
│   │   ├── auth/       (Login, Register, VerifyEmail)
│   │   ├── trips/      (List, Detail, Create)
│   │   ├── tracking/   (ActiveTrip)
│   │   ├── profile/    (Profile)
│   │   ├── payments/   (Payment)
│   │   └── admin/      (Dashboard, ReportDetail)
│   ├── store/
│   │   ├── authStore.ts
│   │   └── trackingStore.ts
│   ├── lib/
│   │   ├── queryClient.ts
│   │   ├── socket.ts
│   │   └── utils.ts               # cn() para Tailwind merge
│   ├── types/index.ts
│   └── router/index.tsx
├── tests/
│   ├── components/                # React Testing Library
│   │   ├── TripCard.test.tsx
│   │   ├── TripForm.test.tsx
│   │   └── StripePaymentModal.test.tsx
│   ├── hooks/
│   │   └── useAuth.test.ts
│   └── e2e/                       # Playwright (o en carpeta raíz /e2e)
│       ├── auth.spec.ts
│       ├── trips.spec.ts
│       └── payments.spec.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## API REST

```
POST   /api/auth/register               (valida @uta.edu.ec)
POST   /api/auth/verify-email
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

GET    /api/users/me
PATCH  /api/users/me
POST   /api/users/me/vehicle
GET    /api/users/:id/ratings

GET    /api/trips                       (?zone=&date=&availableSeats=)
POST   /api/trips
GET    /api/trips/:id
PATCH  /api/trips/:id
DELETE /api/trips/:id
POST   /api/trips/:id/safety-ack

POST   /api/trips/:id/requests
GET    /api/trips/:id/requests
PATCH  /api/requests/:id               (aceptar/rechazar)

POST   /api/payments/create-intent     (Stripe PaymentIntent)
POST   /api/payments/webhook           (Stripe webhook → confirma automático)
GET    /api/payments/:tripRequestId

POST   /api/ratings
POST   /api/reports

GET    /api/admin/reports
PATCH  /api/admin/reports/:id
GET    /api/admin/users
PATCH  /api/admin/users/:id/status
```

## Socket.io Events
```
Client → Server:
  join:trip        { tripId }
  leave:trip       { tripId }
  location:update  { tripId, lat, lng }   ← conductor emite

Server → Client:
  location:update  { lat, lng, timestamp }
  trip:started     { tripId }
  trip:completed   { tripId }
  request:accepted { requestId }
  request:rejected { requestId }
  payment:confirmed { paymentId }
```

---

## Variables de Entorno

### `server/.env`
```bash
DATABASE_URL=postgresql://utaxi:utaxi123@localhost:5432/utaxi
JWT_ACCESS_SECRET=super_secret_access_key_change_in_prod
JWT_REFRESH_SECRET=super_secret_refresh_key_change_in_prod
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
ALLOWED_EMAIL_DOMAIN=uta.edu.ec
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=utaxi@uta.edu.ec
SMTP_PASS=app_password_here
FRONTEND_URL=http://localhost:4278
STRIPE_SECRET_KEY=sk_test_...        # Stripe test key
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=4000
NODE_ENV=development
```

### `server/.env.test`
```bash
DATABASE_URL=postgresql://utaxi:utaxi123@localhost:5433/utaxi_test
NODE_ENV=test
JWT_ACCESS_SECRET=test_access_secret
JWT_REFRESH_SECRET=test_refresh_secret
STRIPE_SECRET_KEY=sk_test_...
```

### `client/.env`
```bash
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

---

## Preparación para Testing (Segunda Tarea — NO implementar aún)

La arquitectura ya está diseñada para facilitar estos tests:

### Vitest (Unitarias + Integración)
- **Servicios con DI**: `new AuthService(prisma, mailer)` → en tests: `new AuthService(mockPrisma, mockMailer)`
- **Funciones puras en `utils/`**: `jwt.ts`, `hash.ts` → testeables directamente sin BD
- **`app.ts` separado de `server.ts`** → tests de integración con `supertest(app)` sin levantar servidor
- **`vitest.config.ts`** con `environment: 'node'` para backend, `environment: 'jsdom'` para cliente

### React Testing Library (Componentes UI)
- Componentes de shadcn/ui usan Radix UI → accesibles por defecto → queries por rol/label
- No habrá lógica en componentes: solo llaman hooks → fácil de mockear React Query
- `data-testid` solo como último recurso (priorizar `getByRole`, `getByLabelText`)

### Playwright (E2E)
- `prisma/seed.ts` crea usuarios de prueba → Playwright usa esas cuentas
- `playwright.config.ts` apunta a `http://localhost:4278` (Vite dev server)
- Los tests E2E corren contra la app real con la BD de test (puerto 5433)

### Artillery (Carga)
- Endpoints REST sin estado de sesión en memoria → escalables
- `GET /api/trips` con filtros es el endpoint más crítico → prueba de carga principal
- Archivos YAML de Artillery en `server/tests/load/`

### OWASP ZAP (Seguridad DAST)
- JWT en httpOnly cookie → protege contra XSS
- Validación con zod en todos los endpoints → previene inyección
- CORS configurado estrictamente con `FRONTEND_URL`
- Helmet.js en Express para headers de seguridad

### ESLint + SonarQube (Análisis Estático)
- `.eslintrc` configurado desde el inicio con reglas TypeScript estrictas
- `sonar-project.properties` en raíz del proyecto
- Cobertura de tests exportada en formato lcov para SonarQube

---

## Dependencias Clave

### `server/package.json`
```json
{
  "dependencies": {
    "express": "^4.x",
    "cors": "^2.x",
    "helmet": "^7.x",
    "cookie-parser": "^1.x",
    "express-async-errors": "^3.x",
    "multer": "^1.x",
    "@prisma/client": "^5.x",
    "socket.io": "^4.x",
    "jsonwebtoken": "^9.x",
    "bcryptjs": "^2.x",
    "nodemailer": "^6.x",
    "stripe": "^14.x",
    "zod": "^3.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "prisma": "^5.x",
    "typescript": "^5.x",
    "tsx": "^4.x",
    "vitest": "^1.x",
    "supertest": "^6.x",
    "@types/supertest": "^6.x",
    "@types/express": "^4.x",
    "@types/node": "^20.x",
    "@types/jsonwebtoken": "^9.x",
    "@types/bcryptjs": "^2.x",
    "@types/nodemailer": "^6.x",
    "@types/multer": "^1.x",
    "eslint": "^8.x",
    "@typescript-eslint/eslint-plugin": "^6.x"
  }
}
```

### `client/package.json`
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x",
    "axios": "^1.x",
    "socket.io-client": "^4.x",
    "leaflet": "^1.x",
    "react-leaflet": "^4.x",
    "@stripe/stripe-js": "^3.x",
    "@stripe/react-stripe-js": "^2.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "lucide-react": "latest",
    "date-fns": "^3.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x",
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "jsdom": "^24.x",
    "@playwright/test": "^1.x",
    "@types/leaflet": "^1.x",
    "eslint": "^8.x"
  }
}
```

---

## Orden de Implementación

| Fase | Contenido |
|------|-----------|
| 1 | Docker Compose + `docker:up` en scripts → Init server (Express+Prisma+TS) → schema.prisma → migrate → Init client (Vite+React+Tailwind+shadcn) → módulo auth completo con validación `@uta.edu.ec` |
| 2 | CRUD viajes + búsqueda/filtros → módulo requests → páginas frontend (auth, lista viajes, detalle, crear) |
| 3 | Stripe integration → SafetyRulesModal (RF9) → calificaciones post-viaje (solo tras COMPLETED) |
| 4 | Socket.io GPS tracking → LiveMap con React-Leaflet → hooks useSocket/useGeolocation |
| 5 | Reportes + panel admin + upload de evidencia (Multer) |
| 6 | Responsive audit → toasts → loading skeletons → seed.ts completo para demo |

---

## Archivos Críticos (orden de creación)

1. `docker-compose.yml` — levantar BD antes de cualquier código
2. `server/prisma/schema.prisma` — fuente de verdad del modelo; todos los tipos TS se derivan de aquí
3. `server/src/app.ts` — Express app factory (sin `.listen()` para testabilidad)
4. `server/src/server.ts` — solo llama `app.listen(PORT)`
5. `server/src/services/auth.service.ts` — validación `@uta.edu.ec`, OTP, JWT, bcrypt
6. `server/src/services/payments.service.ts` — Stripe PaymentIntent + webhook handler
7. `client/src/router/index.tsx` — árbol de rutas con ProtectedRoute y guard de admin
