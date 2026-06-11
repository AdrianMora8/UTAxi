# UTAxi - Script de configuración y ejecución de pruebas
# Ejecutar desde: C:\Users\HOME\Desktop\UTAxi\server\
# Uso: .\run-all-tests.ps1

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent $PSScriptRoot

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  UTAxi - Ejecutor de Pruebas Completo" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# PASO 1: Pruebas unitarias (no necesitan BD)
Write-Host "PASO 1: Ejecutando pruebas UNITARIAS..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
$unitResult = & npm run test:unit 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Pruebas unitarias: TODAS PASARON" -ForegroundColor Green
} else {
    Write-Host "❌ Pruebas unitarias: FALLARON" -ForegroundColor Red
    Write-Host $unitResult
}

Write-Host ""
Write-Host "PASO 2: Levantando contenedor de BD de pruebas..." -ForegroundColor Yellow

# Levantar Docker para BD de prueba
try {
    $dockerResult = & docker compose -f "$ROOT\docker-compose.test.yml" up -d postgres_test 2>&1
    Write-Host "Docker output: $dockerResult" -ForegroundColor Gray
    
    # Esperar a que PostgreSQL esté listo
    Write-Host "Esperando que PostgreSQL esté listo..." -ForegroundColor Yellow
    $maxWait = 30
    for ($i = 1; $i -le $maxWait; $i++) {
        Start-Sleep -Seconds 1
        $testResult = & node "$PSScriptRoot\check-db.js" 2>&1
        if ($testResult -match "conectada") {
            Write-Host "✅ PostgreSQL listo en $i segundos" -ForegroundColor Green
            break
        }
        Write-Host "  Esperando... ($i/$maxWait)" -ForegroundColor Gray
        if ($i -eq $maxWait) {
            Write-Host "❌ PostgreSQL no respondió a tiempo" -ForegroundColor Red
        }
    }
    
    # PASO 3: Migraciones
    Write-Host ""
    Write-Host "PASO 3: Ejecutando migraciones de prueba..." -ForegroundColor Yellow
    $env:DATABASE_URL = "postgresql://utaxi:utaxi123@localhost:5437/utaxi_test"
    & npx prisma migrate deploy 2>&1 | Write-Host
    Write-Host "✅ Migraciones completadas" -ForegroundColor Green
    
    # PASO 4: Pruebas de integración
    Write-Host ""
    Write-Host "PASO 4: Ejecutando pruebas de INTEGRACIÓN..." -ForegroundColor Yellow
    $integResult = & npm run test:integration 2>&1
    Write-Host $integResult
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Pruebas de integración: TODAS PASARON" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Algunas pruebas de integración fallaron" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error con Docker: $_" -ForegroundColor Red
    Write-Host "Asegúrate de que Docker Desktop esté corriendo" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Pruebas completadas" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
