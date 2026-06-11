---
name: Testing strategy for UTAxi mobile
description: Stack de testing acordado para el sprint 2 mobile, equivalencias con el plan web original
type: project
originSessionId: 0ab63a4d-a98e-465e-9c02-70470ab473d0
---
El plan de tests original era para web. Se migra a mobile con estas equivalencias:

| Tipo | Web (original) | Mobile (acordado) |
|---|---|---|
| Unitarias / Integración | Vitest | Jest |
| Componentes UI | React Testing Library | @testing-library/react-native |
| Aceptación E2E | Playwright | Maestro (corre en teléfono físico, YAML) |
| Rendimiento / Carga | Artillery | Artillery (mismo, ataca el backend igual) |
| Seguridad DAST | OWASP ZAP | OWASP ZAP (mismo, ataca el backend) |
| Análisis Estático | ESLint + SonarQube | ESLint + SonarQube (sin cambio) |

**Why:** El backend no cambió — Artillery y ZAP se reutilizan tal cual. Maestro reemplaza Playwright porque corre flujos reales en el teléfono físico sin emulador ni Android Studio. @testing-library/react-native es el mismo proyecto que RTL, misma API.

**How to apply:** Cuando lleguemos al Bloque 6 (tests), implementar en este orden: Jest (unitarios/store/api) → @testing-library/react-native (componentes) → Maestro (E2E flujos auth + viajes) → Artillery (carga API) → ZAP (seguridad).

La configuración de Jest requiere mocks de módulos nativos: expo-linear-gradient, @expo/vector-icons, AsyncStorage, expo-font.
