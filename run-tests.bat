@echo off
echo ============================================
echo  UTAxi - Iniciar BD de Test y Ejecutar Tests
echo ============================================
echo.

echo [PASO 1] Levantando contenedor de PostgreSQL de test...
cd /d C:\Users\HOME\Desktop\UTAxi
docker compose -f docker-compose.test.yml up -d postgres_test
if %errorlevel% neq 0 (
    echo ERROR: No se pudo levantar Docker. Verifica que Docker Desktop este corriendo.
    pause
    exit /b 1
)

echo.
echo [PASO 2] Esperando que PostgreSQL este listo...
timeout /t 5 /nobreak > nul

echo.
echo [PASO 3] Ejecutando todas las pruebas...
cd /d C:\Users\HOME\Desktop\UTAxi\server
npm test

echo.
echo ============================================
echo  Pruebas completadas.
echo ============================================
pause
