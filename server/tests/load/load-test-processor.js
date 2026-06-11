const http = require('http');

const LOAD_USER = { email: 'load-test@uta.edu.ec', password: 'LoadTest123!' };

// Token cacheado — se obtiene una vez y se reutiliza en todos los VUs
let cachedToken = '';
let tokenPromise = null;

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: {} });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getToken() {
  if (cachedToken) return Promise.resolve(cachedToken);
  if (tokenPromise) return tokenPromise;

  tokenPromise = postJson('/api/auth/login', LOAD_USER).then((res) => {
    if (res.status === 200 && res.body.accessToken) {
      cachedToken = res.body.accessToken;
      return cachedToken;
    }
    console.warn(`[load-test] login falló con status ${res.status}`);
    return '';
  });

  return tokenPromise;
}

async function loginAndGetToken(context, ee) {
  context.vars.token = await getToken().catch(() => '');
}

module.exports = { loginAndGetToken };
