# 🔐 Pruebas de Seguridad (OWASP ZAP) - U-Ride

Escaneo de seguridad automatizado para detectar vulnerabilidades web.

---

## 📁 Estructura

```
tests/security/
├── owasp-zap-scan.js       # Script de escaneo
└── reports/                 # Reportes generados
    ├── owasp-zap-report.json
    └── owasp-zap-report.html
```

---

## 🚀 Instalación

OWASP ZAP se ejecuta en Docker automáticamente:

```bash
# Levantar ZAP en docker-compose.test.yml
cd server
npm run zap:up
```

---

## 🏃 Ejecutar Escaneo

```bash
# Levantar ZAP
npm run zap:up

# Esperar ~10 segundos para que arranque
sleep 10

# Ejecutar escaneo (tarda ~15-20 minutos)
npm run security:scan

# Ver reportes generados
npm run security:report

# Abrir reporte HTML
open tests/security/reports/owasp-zap-report.html
```

**Tiempo total:** ~20-25 minutos

---

## 🔍 Proceso del Escaneo

### Fase 1: Spider (Rastreo Pasivo)
```
Duración: ~3-5 minutos
Objetivo: Mapear la aplicación
- Sigue todos los links
- Descubre formularios
- Identifica endpoints API
- Construye árbol de sitio
```

### Fase 2: Active Scan (Pruebas de Vulnerabilidades)
```
Duración: ~10-15 minutos
Objetivo: Inyectar payloads de prueba
Vulnerabilidades testeadas:
- SQL Injection
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Buffer Overflow
- XML External Entity (XXE)
- Path Traversal
- Command Injection
```

### Fase 3: Generación de Reportes
```
Salida:
- JSON: Datos estructurados
- HTML: Visualización interactiva
- Resumen: Estadísticas por riesgo
```

---

## 📊 Interpretación de Resultados

### Niveles de Riesgo

| Nivel | Color | Acción |
|-------|-------|--------|
| 🔴 **High** | Rojo | ⚠️ CRÍTICO - Corregir inmediatamente |
| 🟠 **Medium** | Naranja | ⚠️ IMPORTANTE - Corregir pronto |
| 🟡 **Low** | Amarillo | ℹ️ Considerar corregir |
| 🔵 **Info** | Azul | ℹ️ Solo información |

### Ejemplo de Resultado

```
RESUMEN DE VULNERABILIDADES:

🔴 High Risk (0):
  (Ninguna - ✅ BIEN)

🟠 Medium Risk (2):
  • Missing Anti-CSRF Tokens
    URL: http://localhost:3000/api/users/me
  • Insecure Direct Object References
    URL: http://localhost:3000/api/trips/1

🟡 Low Risk (3):
  • Server Leaks Information
  • X-Frame-Options Header Missing
  • X-Content-Type-Options Header Missing

🔵 Info (5):
  • Re-authenticate
  • Cookies without SameSite Attribute
  ...
```

---

## 🛡️ Vulnerabilidades Comunes

### SQL Injection
```
Riesgo: 🔴 HIGH
Descripción: Inyectar SQL malicioso en inputs
Prevención: 
  ✅ Usar Prisma ORM (prepared statements)
  ✅ Validación con Zod
  ✅ Sanitización de inputs
```

### XSS (Cross-Site Scripting)
```
Riesgo: 🔴 HIGH
Descripción: Inyectar scripts en el frontend
Prevención:
  ✅ React escapa HTML automáticamente
  ✅ No usar dangerouslySetInnerHTML
  ✅ Content Security Policy (CSP)
```

### CSRF (Cross-Site Request Forgery)
```
Riesgo: 🟠 MEDIUM
Descripción: Forzar acciones sin consentimiento
Prevención:
  ✅ CSRF tokens en formularios
  ✅ SameSite cookies
  ✅ Same-origin policy
```

### XXE (XML External Entity)
```
Riesgo: 🔴 HIGH
Descripción: Inyectar entidades XML maliciosas
Prevención:
  ✅ Deshabilitar DTD parsing
  ✅ Usar parsers seguros
  ✅ Validación de XML
```

---

## 🔧 Configuración (owasp-zap-scan.js)

### API URLs Configuradas

```javascript
const ZAP_API_URL = 'http://localhost:8090';  // ZAP API
const TARGET_URL = 'http://localhost:3000';   // App a testear
```

### Funciones Principales

```javascript
startSpider()          // Rastrear aplicación
waitForSpider()        // Esperar a que termine
startActiveScan()      // Iniciar escaneo activo
waitForActiveScan()    // Esperar a que termine
getAlerts()            // Obtener vulnerabilidades
getHTMLReport()        // Obtener reporte HTML
saveReports()          // Guardar archivos
analyzeResults()       // Analizar e imprimir
```

---

## 📈 Escalado de Escaneos

### Quick Scan (5-10 min)
```bash
# Modificar load-test.yml para incluir solo 2-3 endpoints
# Ejecutar con fewer checks
npm run security:scan
```

### Full Scan (15-20 min)
```bash
# Escaneo completo (actual)
npm run security:scan
```

### Deep Scan (30+ min)
```bash
# Aumentar iteraciones en owasp-zap-scan.js
# Incluir ALL endpoints y submódulos
# Ejecutar verificaciones adicionales
```

---

## 🐛 Troubleshooting

### "Cannot connect to ZAP API"

```bash
# Verificar que ZAP esté corriendo
docker ps | grep zap

# Levantar ZAP
npm run zap:up

# Esperar a que esté listo
sleep 15
```

### "No alerts found"

```
Significa que:
✅ No se encontraron vulnerabilidades
Esto es BUENO - significa que la app es segura
```

### "Scan timeout"

```bash
# Aumentar timeout en owasp-zap-scan.js
const TIMEOUT = 300000;  // 5 minutos

# O ejecutar scan más corto
```

---

## 🚀 CI/CD Integration

**GitHub Actions:**
```yaml
- name: Security Scan (OWASP ZAP)
  run: |
    cd server
    npm run docker:test:up
    npm run security:scan
    
- name: Upload Security Report
  uses: actions/upload-artifact@v2
  with:
    name: security-report
    path: tests/security/reports/
```

---

## 📋 Checklist Pre-Producción

- [ ] Ejecutar escaneo de seguridad
- [ ] Revisar reporte HTML
- [ ] 0 vulnerabilidades 🔴 HIGH
- [ ] < 3 vulnerabilidades 🟠 MEDIUM
- [ ] Documentar excepciones si las hay
- [ ] Implementar fixes necesarios
- [ ] Re-ejecutar escaneo

---

## 💡 Mejores Prácticas

1. **Headers de Seguridad**
   ```typescript
   // Express: usar helmet
   app.use(helmet());
   
   // Headers automáticos:
   // - X-Frame-Options
   // - X-Content-Type-Options
   // - Strict-Transport-Security
   ```

2. **CORS Seguro**
   ```typescript
   app.use(cors({
     origin: process.env.FRONTEND_URL,  // No '*'
     credentials: true,
     methods: ['GET', 'POST', 'PATCH', 'DELETE']
   }));
   ```

3. **Input Validation**
   ```typescript
   // Usar Zod para validar TODO input
   const schema = z.object({
     email: z.string().email(),
     password: z.string().min(8)
   });
   ```

4. **HTTPS en Producción**
   ```
   ✅ Certificado SSL/TLS válido
   ✅ Redirigir HTTP → HTTPS
   ✅ HSTS headers
   ```

5. **Rate Limiting**
   ```typescript
   // Prevenir brute force
   app.use(rateLimit({
     windowMs: 15 * 60 * 1000,  // 15 min
     max: 100  // 100 requests por IP
   }));
   ```

---

## 📚 Recursos

- [OWASP ZAP Docs](https://www.zaproxy.org/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Security Cheatsheet](https://cheatsheetseries.owasp.org/)
- [Helmet.js](https://helmetjs.github.io/)

---

## 🎯 Políticas de Seguridad

### Aceptar Vulnerabilidades

Solo en casos especiales:
1. Documentar razón
2. Evaluar impacto
3. Implementar workaround
4. Fecha de revisión

### Ciclo de Remedición

1. Descubrir (OWASP ZAP)
2. Clasificar (riesgo)
3. Asignar (equipo)
4. Corregir (desarrollo)
5. Verificar (re-escanear)
6. Documentar (cambios)

---

**Versión:** 1.0
**Estado:** ✅ Listo para usar
**Última actualización:** Mayo 2026
