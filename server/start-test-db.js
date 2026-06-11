/**
 * Script para levantar el contenedor de PostgreSQL de prueba
 * usando la API REST de Docker a través del named pipe de Windows.
 * 
 * Uso: node start-test-db.js
 */

const http = require('http');
const net = require('net');
const fs = require('fs');

const DOCKER_SOCKET = '//./pipe/docker_engine';

function dockerRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers = [
      `${method} ${path} HTTP/1.1`,
      'Host: localhost',
      'Content-Type: application/json',
    ];
    if (bodyStr) headers.push(`Content-Length: ${Buffer.byteLength(bodyStr)}`);
    headers.push('', '');
    const request = headers.join('\r\n') + bodyStr;

    const socket = net.createConnection(DOCKER_SOCKET);
    let responseData = '';

    socket.setTimeout(10000);

    socket.on('connect', () => {
      socket.write(request);
    });

    socket.on('data', (data) => {
      responseData += data.toString();
      // Check if we have the complete response (detect end)
      if (responseData.includes('\r\n\r\n')) {
        const headerEnd = responseData.indexOf('\r\n\r\n');
        const headerSection = responseData.substring(0, headerEnd);
        const statusMatch = headerSection.match(/HTTP\/1\.1 (\d+)/);
        const status = statusMatch ? parseInt(statusMatch[1]) : 0;
        
        // For chunked or known-length responses, wait a bit more
        setTimeout(() => {
          const bodyStart = headerEnd + 4;
          let body = responseData.substring(bodyStart);
          // Remove chunked encoding markers
          body = body.replace(/^[0-9a-f]+\r\n/gm, '').replace(/\r\n/g, '');
          socket.destroy();
          resolve({ status, body });
        }, 500);
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Docker request timed out'));
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log('🐳 Verificando Docker API...');
  
  try {
    // Verificar si ya existe el contenedor
    const containers = await dockerRequest('GET', '/v1.41/containers/json?all=true', null);
    console.log('✅ Docker API respondió (status:', containers.status, ')');
    
    let containerData = [];
    try {
      containerData = JSON.parse(containers.body);
    } catch(e) {
      console.log('Body raw:', containers.body.substring(0, 200));
    }
    
    const testDb = containerData.find(c => 
      c.Names && c.Names.some(n => n.includes('utaxi_db_test'))
    );
    
    if (testDb) {
      console.log('📦 Contenedor utaxi_db_test encontrado. Estado:', testDb.State);
      if (testDb.State !== 'running') {
        console.log('▶️  Iniciando contenedor...');
        const startResult = await dockerRequest('POST', `/v1.41/containers/${testDb.Id}/start`, null);
        console.log('Start status:', startResult.status);
      } else {
        console.log('✅ El contenedor ya está corriendo!');
      }
    } else {
      console.log('📦 Contenedor no existe. Creándolo...');
      
      const createResult = await dockerRequest('POST', '/v1.41/containers/create?name=utaxi_db_test', {
        Image: 'postgres:16-alpine',
        Env: [
          'POSTGRES_DB=utaxi_test',
          'POSTGRES_USER=utaxi',
          'POSTGRES_PASSWORD=utaxi123'
        ],
        HostConfig: {
          PortBindings: {
            '5432/tcp': [{ HostPort: '5437' }]
          }
        }
      });
      
      console.log('Create status:', createResult.status);
      
      if (createResult.status === 201) {
        const createData = JSON.parse(createResult.body);
        const startResult = await dockerRequest('POST', `/v1.41/containers/${createData.Id}/start`, null);
        console.log('Start status:', startResult.status);
        console.log('✅ Contenedor creado e iniciado!');
      } else {
        console.log('Error creating container:', createResult.body.substring(0, 200));
        
        // Intentar pull de la imagen primero
        console.log('Intentando pull de imagen postgres:16-alpine...');
        const pullResult = await dockerRequest('POST', '/v1.41/images/create?fromImage=postgres&tag=16-alpine', null);
        console.log('Pull status:', pullResult.status);
      }
    }
    
    // Esperar a que PostgreSQL esté listo
    console.log('\n⏳ Esperando que PostgreSQL esté listo...');
    const { PrismaClient } = require('@prisma/client');
    for (let i = 1; i <= 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const prisma = new PrismaClient({
          datasources: { db: { url: 'postgresql://utaxi:utaxi123@localhost:5437/utaxi_test' } }
        });
        await prisma.$connect();
        await prisma.$disconnect();
        console.log(`✅ PostgreSQL listo en ${i} segundos!`);
        break;
      } catch {
        process.stdout.write(`\r  Intento ${i}/30...`);
        if (i === 30) console.log('\n❌ PostgreSQL no respondió');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
