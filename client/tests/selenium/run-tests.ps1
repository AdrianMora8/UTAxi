# Script para ejecutar pruebas de Selenium en Windows (PowerShell)
# Uso: .\run-tests.ps1

# Configuración de colores
function Write-Header {
    param([string]$Text)
    Write-Host "========================================" -ForegroundColor Green
    Write-Host $Text -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Text)
    Write-Host "❌ Error: $Text" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Text)
    Write-Host "⚠️  $Text" -ForegroundColor Yellow
}

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Error-Custom "package.json no encontrado. Por favor ejecuta este script desde la carpeta 'client'"
    exit 1
}

# Verificar que npm está instalado
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "npm no está instalado"
    exit 1
}

# Mostrar menú
function Show-Menu {
    Write-Host ""
    Write-Host "Selecciona una opción:" -ForegroundColor Cyan
    Write-Host "1) Ejecutar todas las pruebas (headless)" -ForegroundColor Cyan
    Write-Host "2) Ejecutar con navegador visible (headed)" -ForegroundColor Cyan
    Write-Host "3) Modo watch (auto-reload)" -ForegroundColor Cyan
    Write-Host "4) Ejecutar solo pruebas de registro" -ForegroundColor Cyan
    Write-Host "5) Ejecutar solo pruebas de login" -ForegroundColor Cyan
    Write-Host "6) Ejecutar solo pruebas avanzadas" -ForegroundColor Cyan
    Write-Host "7) Instalar dependencias" -ForegroundColor Cyan
    Write-Host "8) Ver información de depuración" -ForegroundColor Cyan
    Write-Host "0) Salir" -ForegroundColor Cyan
    Write-Host ""
}

# Menú principal
$running = $true
while ($running) {
    Show-Menu
    $option = Read-Host "Ingresa tu opción [0-9]"
    
    switch ($option) {
        "1" {
            Write-Header "Ejecutando todas las pruebas (Headless)"
            npm run selenium
            break
        }
        "2" {
            Write-Header "Ejecutando pruebas con navegador visible"
            npm run selenium:headed
            break
        }
        "3" {
            Write-Header "Iniciando modo watch"
            npm run selenium:watch
            break
        }
        "4" {
            Write-Header "Ejecutando pruebas de registro"
            npx vitest tests/selenium -t "Registro"
            break
        }
        "5" {
            Write-Header "Ejecutando pruebas de login"
            npx vitest tests/selenium -t "Inicio de Sesión|Login"
            break
        }
        "6" {
            Write-Header "Ejecutando pruebas avanzadas"
            npx vitest tests/selenium/auth.advanced.test.ts
            break
        }
        "7" {
            Write-Header "Instalando dependencias"
            npm install
            Write-Success "Dependencias instaladas"
            break
        }
        "8" {
            Write-Header "Información del Entorno"
            Write-Host "Node.js: " -NoNewline
            node --version
            Write-Host "NPM: " -NoNewline
            npm --version
            Write-Host "Sistema Operativo: " -NoNewline
            [System.Environment]::OSVersion.VersionString
            break
        }
        "0" {
            Write-Success "¡Hasta luego!"
            $running = $false
            exit 0
        }
        default {
            Write-Error-Custom "Opción inválida"
        }
    }
    
    Write-Host ""
    Read-Host "Presiona ENTER para continuar"
}
