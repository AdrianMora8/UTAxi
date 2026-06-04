#!/bin/bash
# Script para ejecutar pruebas de Selenium con opciones

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funciones
print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_error() {
    echo -e "${RED}❌ Error: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar que estamos en el directorio client
if [ ! -f "package.json" ]; then
    print_error "package.json no encontrado. Por favor ejecuta este script desde la carpeta 'client'"
    exit 1
fi

# Mostrar menú
show_menu() {
    echo ""
    echo "Selecciona una opción:"
    echo "1) Ejecutar todas las pruebas (headless)"
    echo "2) Ejecutar con navegador visible (headed)"
    echo "3) Modo watch (auto-reload)"
    echo "4) Ejecutar solo pruebas de registro"
    echo "5) Ejecutar solo pruebas de login"
    echo "6) Ejecutar solo pruebas avanzadas"
    echo "7) Instalar dependencias"
    echo "8) Ver reporte de cobertura"
    echo "9) Ejecutar con debugging"
    echo "0) Salir"
    echo ""
}

# Verificar que npm está instalado
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado"
    exit 1
fi

# Menú principal
while true; do
    show_menu
    read -p "Ingresa tu opción [0-9]: " option
    
    case $option in
        1)
            print_header "Ejecutando todas las pruebas (Headless)"
            npm run selenium
            ;;
        2)
            print_header "Ejecutando pruebas con navegador visible"
            npm run selenium:headed
            ;;
        3)
            print_header "Iniciando modo watch"
            npm run selenium:watch
            ;;
        4)
            print_header "Ejecutando pruebas de registro"
            npx vitest tests/selenium -t "Registro"
            ;;
        5)
            print_header "Ejecutando pruebas de login"
            npx vitest tests/selenium -t "Inicio de Sesión|Login"
            ;;
        6)
            print_header "Ejecutando pruebas avanzadas"
            npx vitest tests/selenium/auth.advanced.test.ts
            ;;
        7)
            print_header "Instalando dependencias"
            npm install
            print_success "Dependencias instaladas"
            ;;
        8)
            print_header "Generando reporte de cobertura"
            npm run test:coverage
            ;;
        9)
            print_header "Iniciando con debugging"
            npm run selenium:debug
            ;;
        0)
            print_success "¡Hasta luego!"
            exit 0
            ;;
        *)
            print_error "Opción inválida"
            ;;
    esac
    
    echo ""
    read -p "Presiona ENTER para continuar..."
done
