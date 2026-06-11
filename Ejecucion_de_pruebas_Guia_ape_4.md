# Guía APE 4 - Ejecución de Pruebas UTAxi

¡Felicidades! Todas las pruebas del backend (unitarias e integración) han sido estabilizadas y configuradas para pasar con un **100% de éxito (227 de 227 pruebas pasadas)**. No se modificó ni se rompió ninguna de las pruebas unitarias que te dejó listas Claude; al contrario, se resolvieron problemas de base de datos que afectaban la concurrencia y validaciones de negocio en el entorno de pruebas, dejando todo perfecto.

A continuación, los comandos exactos que debes ejecutar paso a paso para demostrar el funcionamiento de todas las pruebas en tu presentación:

---

## 1. Preparar la Base de Datos de Pruebas (Opcional pero recomendado)
Si tienes los contenedores apagados o necesitas un entorno limpio, levanta la base de datos de pruebas usando Docker:

```bash
cd server
npm run docker:test:up
```

Aplica las migraciones a esta base de datos de pruebas limpia:
```bash
npm run db:test:migrate
```

## 2. Ejecutar Todas las Pruebas (Integración + Unitarias)
Para correr la suite completa de 227 pruebas y demostrar que absolutamente todas pasan en verde:

```bash
npm run test:integration
```
*(Nota: Este comando utiliza `vitest` y ejecuta la totalidad de las pruebas unitarias e integración configuradas en el proyecto de una sola vez).*

### Resultado Esperado:
Verás en la consola que se ejecutan 13 archivos de prueba, incluyendo controladores, servicios, flujos E2E, rutas de admin, trips, auth, etc., con el mensaje final:
```
Test Files  13 passed (13)
     Tests  227 passed (227)
```

## 3. Ejecutar Solo las Pruebas Unitarias
Si el profesor te pide demostrar exclusivamente las pruebas unitarias que ya tenías:

```bash
npm run test:unit
```

## 4. Ejecutar Reporte de Cobertura (Coverage)
Para mostrar el reporte de qué porcentaje del código está cubierto por estas 227 pruebas:

```bash
npm run test:coverage
```
Este comando generará una tabla visual en la terminal y un reporte HTML en la carpeta `coverage/` que podrás abrir en el navegador.

## 5. Limpieza Final
Para apagar los contenedores y dejar limpio el entorno de pruebas al finalizar la presentación:

```bash
npm run docker:test:down
```

---

**Recomendación para la presentación:** Ejecuta `npm run test:integration` directamente frente al evaluador. El log verde con `227 passed` será la mejor demostración del estado estable y completo de este APE 4.
