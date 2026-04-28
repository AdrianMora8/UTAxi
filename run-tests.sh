#!/bin/bash

echo "🧪 Ejecutando pruebas del módulo de usuarios..."
echo ""

echo "📦 Server - Pruebas de servicios y controladores"
cd UTAxi/server
npm run test:watch -- --run --reporter=verbose

echo ""
echo "🎨 Client - Pruebas de componentes e integración"
cd ../client
npm run test:watch -- --run --reporter=verbose

echo ""
echo "✅ Pruebas completadas"
