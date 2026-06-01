# =============================================================================
#  UTAxi - Ejecutor de Pruebas Selenium (Python / pytest)
#  Uso: .\Ejecutar-Pruebas-Selenium.ps1
# =============================================================================

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-OK   { param([string]$T) Write-Host "  ✅ $T" -ForegroundColor Green  }
function Write-Fail { param([string]$T) Write-Host "  ❌ $T" -ForegroundColor Red    }
function Write-Info { param([string]$T) Write-Host "  ℹ️  $T" -ForegroundColor Yellow }

# ── Verificar Python ──────────────────────────────────────────────────────────
Write-Header "Verificando entorno"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Fail "Python no encontrado. Instala Python 3.x y asegurate de que esté en el PATH."
    exit 1
}
Write-OK "Python: $(python --version)"

$pytestOk = python -m pytest --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "pytest no instalado. Ejecuta: pip install pytest selenium webdriver-manager requests"
    exit 1
}
Write-OK "pytest: $pytestOk"

# ── Menú ──────────────────────────────────────────────────────────────────────
function Show-Menu {
    Write-Host ""
    Write-Host "  Selecciona una opcion:" -ForegroundColor White
    Write-Host "  [1] Todas las pruebas (headless)"               -ForegroundColor Cyan
    Write-Host "  [2] Todas las pruebas (con navegador visible)"   -ForegroundColor Cyan
    Write-Host "  [3] Solo test_login.py"                          -ForegroundColor Cyan
    Write-Host "  [4] Solo test_registro.py"                       -ForegroundColor Cyan
    Write-Host "  [5] Solo test_trips_crud.py"                     -ForegroundColor Cyan
    Write-Host "  [6] Solo test_bookings_crud.py"                  -ForegroundColor Cyan
    Write-Host "  [0] Salir"                                       -ForegroundColor Gray
    Write-Host ""
}

$running = $true
while ($running) {
    Show-Menu
    $opt = Read-Host "  Opcion"

    switch ($opt) {
        "1" {
            Write-Header "Ejecutando TODAS las pruebas (headless)"
            python -m pytest client/tests/selenium/ -v --tb=short
        }
        "2" {
            Write-Header "Ejecutando TODAS las pruebas (headed)"
            $env:HEADLESS = "false"
            python -m pytest client/tests/selenium/ -v --tb=short
            Remove-Item Env:\HEADLESS -ErrorAction SilentlyContinue
        }
        "3" {
            Write-Header "test_login.py"
            python -m pytest client/tests/selenium/test_login.py -v --tb=short
        }
        "4" {
            Write-Header "test_registro.py"
            python -m pytest client/tests/selenium/test_registro.py -v --tb=short
        }
        "5" {
            Write-Header "test_trips_crud.py"
            python -m pytest client/tests/selenium/test_trips_crud.py -v --tb=short
        }
        "6" {
            Write-Header "test_bookings_crud.py"
            python -m pytest client/tests/selenium/test_bookings_crud.py -v --tb=short
        }
        "0" {
            Write-OK "Hasta luego"
            $running = $false
        }
        default {
            Write-Info "Opcion invalida, intenta de nuevo."
        }
    }

    if ($running -and $opt -ne "0") {
        Write-Host ""
        Read-Host "  Presiona ENTER para continuar"
    }
}
