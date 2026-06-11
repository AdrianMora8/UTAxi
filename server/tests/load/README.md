# ⚡ Pruebas de Rendimiento (Artillery) - U-Ride

Pruebas de carga para validar rendimiento bajo stress.

---

## 📁 Estructura

```
tests/load/
├── load-test.yml           # Configuración YAML de escenarios
└── load-test-processor.js  # Funciones personalizadas JS
```

---

## 🚀 Instalación

```bash
# Instalar Artillery
npm install -g artillery

# O localmente
npm install --save-dev artillery
```

---

## 🏃 Ejecutar Tests

```bash
# Ejecutar prueba de carga (genera JSON)
npm run load:test

# Generar reporte HTML
npm run load:report

# Ver reporte
open results/load-test-report.html
```

**Duración total:** ~4-5 minutos

---

## 📊 Escenarios Configurados

### Fases de Carga

```yaml
Phase 1: Ramp-up (60s)
├── Usuarios iniciales: 5
├── Aumento gradual hasta: 20
└── Objetivo: Calentar el servidor

Phase 2: Sustain (120s)
├── Usuarios constantes: 20
└── Objetivo: Carga normalizada

Phase 3: Ramp-down (60s)
├── Reduce de 20 a 5
└── Objetivo: Validar recuperación
```

### Endpoints Testeados

| Escenario | Endpoint | Peso | Descripción |
|-----------|----------|------|-------------|
| Login | POST /api/auth/login | 10% | Autenticación |
| Trips List | GET /api/trips | 40% | Más crítico |
| Search | GET /api/trips?filters | 30% | Con búsqueda |
| Profile | GET /api/users/me | 10% | Perfil usuario |
| Trip Detail | GET /api/trips/:id | 10% | Detalles |

---

## 📈 Métricas Evaluadas

| Métrica | Qué Mide | Objetivo |
|---------|----------|----------|
| **Latency (p95)** | 95% de requests bajo este tiempo | < 500ms |
| **Latency (p99)** | 99% de requests bajo este tiempo | < 1000ms |
| **Throughput** | Requests por segundo | > 20 req/s |
| **Error Rate** | % de requests que fallan | < 1% |
| **Response Time Mean** | Promedio de tiempo de respuesta | < 200ms |

---

## 📋 Ejemplo de Resultado

```
Report: results/load-test-report.html
========================================

Scenarios launched:  100
Scenarios completed: 100

Requests completed:  4,850
Requests failed:     0
Requests rate:       20.04/sec

Mean response time:  145.2 ms
Min response time:   23 ms
Max response time:   1,245 ms
p95 response time:   245 ms
p99 response time:   450 ms

Scenario breakdown:
  Login (10%):              485 requests, 0 failed
  Trips List (40%):       1,940 requests, 0 failed
  Search (30%):           1,455 requests, 0 failed
  Profile (10%):            485 requests, 0 failed
  Trip Detail (10%):        485 requests, 0 failed

Summary: ✅ PASS - Todos los tests completados exitosamente
```

---

## ⚙️ Configuración (load-test.yml)

### Variables

```yaml
config:
  target: 'http://localhost:3000'  # URL del servidor
  
  variables:
    baseUrl: 'http://localhost:3000'
    timeout: 30                      # segundos
```

### Headers Predeterminados

```yaml
defaults:
  headers:
    Content-Type: 'application/json'
    Accept: 'application/json'
```

### Processor

```yaml
processor: './load-test-processor.js'
```

Scripts JS personalizados para transformar datos dinámicamente.

---

## 🔧 Personalizar Tests

### Agregar Nuevo Escenario

```yaml
scenarios:
  - name: 'My Custom Scenario'
    weight: 15           # 15% del tráfico
    flow:
      - post:
          url: '/api/endpoint'
          json:
            key: 'value'
          expect:
            - statusCode: [200, 201]
```

### Cambiar Fases de Carga

```yaml
phases:
  - duration: 120      # Ramp-up más largo
    arrivalRate: 10
    name: 'Warm up'
  
  - duration: 300      # Sustain más largo
    arrivalRate: 50
    name: 'Peak load'
```

### Usar Variables Dinámicas

```yaml
flow:
  - post:
      url: '/api/auth/login'
      json:
        email: '{{ email }}'
        password: '{{ password }}'
      capture:
        - json: '$.accessToken'
          as: 'token'
  
  - get:
      url: '/api/users/me'
      headers:
        Authorization: 'Bearer {{ token }}'
```

---

## 🐛 Troubleshooting

### "Cannot connect to target"

```bash
# Verificar que el servidor esté corriendo
npm run dev

# O en otra terminal
curl http://localhost:3000/health
```

### Latencias Altas

1. Reducir número de usuarios
2. Aumentar duración de fases
3. Revisar BD y logs del servidor

### Error Rate Alto

```bash
# Ver detalles del error
cat results/load-test-results.json | grep error

# Revisar logs del servidor
npm run dev  # Ver outputs
```

---

## 💡 Optimización

**Antes de producción:**

1. Ejecutar con 50+ usuarios simultáneos
2. Verificar p99 < 1 segundo
3. Error rate < 0.1%
4. Revisar CPU/Memoria del servidor

```bash
# En otra terminal, monitorear servidor
top
# O
htop
```

---

## 📚 Recursos

- [Artillery Docs](https://artillery.io/docs)
- [YAML Format](https://artillery.io/docs/guides/load-testing)
- [Best Practices](https://artillery.io/docs/guides/best-practices)

---

**Versión:** 1.0
**Estado:** ✅ Listo para usar
