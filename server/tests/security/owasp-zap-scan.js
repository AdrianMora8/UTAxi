/**
 * Script para ejecutar pruebas de seguridad con OWASP ZAP
 * Realiza un escaneo de seguridad en la aplicación
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ZAP_API_URL = 'http://localhost:8090';
const TARGET_URL = 'http://localhost:3000';

async function runSecurityScan() {
  console.log('🔒 Iniciando escaneo de seguridad con OWASP ZAP...\n');

  try {
    // 1. Espider - rastreo automático de la aplicación
    console.log('📡 Fase 1: Rastreo de la aplicación...');
    const spiderId = await startSpider(TARGET_URL);
    await waitForSpider(spiderId);

    // 2. Scan activo - pruebas de vulnerabilidades
    console.log('🔍 Fase 2: Escaneo activo de vulnerabilidades...');
    const scanId = await startActiveScan(TARGET_URL);
    await waitForActiveScan(scanId);

    // 3. Obtener reportes
    console.log('📊 Fase 3: Generando reportes...');
    const alerts = await getAlerts();
    const htmlReport = await getHTMLReport();

    // 4. Guardar reportes
    saveReports(alerts, htmlReport);

    // 5. Analizar resultados
    analyzeResults(alerts);

    console.log('\n✅ Escaneo de seguridad completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el escaneo:', error.message);
    process.exit(1);
  }
}

/**
 * Iniciar el rastreador (spider) de ZAP
 */
async function startSpider(url) {
  try {
    const response = await axios.get(`${ZAP_API_URL}/JSON/spider/action/scan`, {
      params: {
        url: url,
        recurse: 'true',
      },
    });
    return response.data.scan;
  } catch (error) {
    console.error('Error al iniciar spider:', error.message);
    throw error;
  }
}

/**
 * Esperar a que termineSpider
 */
async function waitForSpider(spiderId) {
  let progress = 0;
  while (progress < 100) {
    const response = await axios.get(`${ZAP_API_URL}/JSON/spider/view/status`, {
      params: { scanId: spiderId },
    });
    progress = parseInt(response.data.status);
    console.log(`  Spider: ${progress}% completado`);
    await sleep(2000);
  }
}

/**
 * Iniciar escaneo activo
 */
async function startActiveScan(url) {
  try {
    const response = await axios.get(`${ZAP_API_URL}/JSON/ascan/action/scan`, {
      params: {
        url: url,
        recurse: 'true',
        inScopeOnly: 'false',
      },
    });
    return response.data.scan;
  } catch (error) {
    console.error('Error al iniciar escaneo activo:', error.message);
    throw error;
  }
}

/**
 * Esperar a que termine el escaneo activo
 */
async function waitForActiveScan(scanId) {
  let progress = 0;
  while (progress < 100) {
    const response = await axios.get(`${ZAP_API_URL}/JSON/ascan/view/status`, {
      params: { scanId: scanId },
    });
    progress = parseInt(response.data.status);
    console.log(`  Escaneo Activo: ${progress}% completado`);
    await sleep(3000);
  }
}

/**
 * Obtener alertas/vulnerabilidades encontradas
 */
async function getAlerts() {
  try {
    const response = await axios.get(`${ZAP_API_URL}/JSON/core/view/alerts`, {
      params: {
        baseurl: TARGET_URL,
      },
    });
    return response.data.alerts || [];
  } catch (error) {
    console.error('Error al obtener alertas:', error.message);
    return [];
  }
}

/**
 * Obtener reporte en formato HTML
 */
async function getHTMLReport() {
  try {
    const response = await axios.get(`${ZAP_API_URL}/OTHER/core/other/htmlreport`, {
      params: {
        baseurl: TARGET_URL,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener reporte HTML:', error.message);
    return '';
  }
}

/**
 * Guardar reportes en archivos
 */
function saveReports(alerts, htmlReport) {
  const reportsDir = path.join(__dirname, 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Reporte JSON
  const jsonReport = {
    timestamp: new Date().toISOString(),
    target: TARGET_URL,
    totalAlerts: alerts.length,
    alerts: alerts,
    summary: summarizeAlerts(alerts),
  };

  fs.writeFileSync(
    path.join(reportsDir, 'owasp-zap-report.json'),
    JSON.stringify(jsonReport, null, 2)
  );

  // Reporte HTML
  if (htmlReport) {
    fs.writeFileSync(
      path.join(reportsDir, 'owasp-zap-report.html'),
      htmlReport
    );
  }

  console.log(`  📁 Reportes guardados en: ${reportsDir}`);
}

/**
 * Analizar y categorizar resultados
 */
function analyzeResults(alerts) {
  if (!alerts || alerts.length === 0) {
    console.log('\n✅ No se encontraron vulnerabilidades');
    return;
  }

  const riskMap = {
    'High': [],
    'Medium': [],
    'Low': [],
    'Informational': [],
  };

  alerts.forEach((alert) => {
    const risk = alert.riskcode || alert.risk || 'Informational';
    const category = riskMap[risk] || [];
    category.push({
      name: alert.name,
      description: alert.description,
      solution: alert.solution,
      url: alert.url,
    });
  });

  console.log('\n📋 RESUMEN DE VULNERABILIDADES:\n');

  const riskColors = {
    'High': '🔴',
    'Medium': '🟠',
    'Low': '🟡',
    'Informational': '🔵',
  };

  Object.entries(riskMap).forEach(([risk, items]) => {
    if (items.length > 0) {
      console.log(`${riskColors[risk]} ${risk} Risk (${items.length}):`);
      items.forEach((item) => {
        console.log(`  • ${item.name}`);
        console.log(`    URL: ${item.url}`);
      });
      console.log();
    }
  });

  // Fallar si hay vulnerabilidades de alto riesgo
  if (riskMap['High'].length > 0) {
    throw new Error(
      `Se encontraron ${riskMap['High'].length} vulnerabilidades de ALTO RIESGO`
    );
  }
}

/**
 * Crear resumen de alertas
 */
function summarizeAlerts(alerts) {
  const summary = {
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };

  alerts.forEach((alert) => {
    const risk = (alert.riskcode || alert.risk || 'informational').toLowerCase();
    if (risk === 'high') summary.high++;
    else if (risk === 'medium') summary.medium++;
    else if (risk === 'low') summary.low++;
    else summary.informational++;
  });

  return summary;
}

/**
 * Esperar
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runSecurityScan();
}

module.exports = { runSecurityScan };
