const crypto = require('crypto');
const { readSongs, writeSongs } = require('./songs-store');

const MAX_BODY_BYTES = 5 * 1024 * 1024;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, value, headers = {}) {
  send(res, status, `${JSON.stringify(value)}\n`, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  });
}

function requestBodyFromParsedValue(value) {
  if(typeof value === 'string') return value;
  if(Buffer.isBuffer(value)) return value.toString('utf8');
  if(value && typeof value === 'object') return JSON.stringify(value);
  return null;
}

function readRequestBody(req) {
  const parsed = requestBodyFromParsedValue(req.body);
  if(parsed !== null) return Promise.resolve(parsed);

  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', chunk => {
      size += chunk.length;
      if(size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function secureTokenEquals(received, expected) {
  const receivedBuffer = Buffer.from(String(received));
  const expectedBuffer = Buffer.from(String(expected));
  if(receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function requireAdminWrite(req, res) {
  const adminToken = process.env.ADMIN_TOKEN || '';
  const isProduction = process.env.NODE_ENV === 'production';

  if(!adminToken) {
    if(isProduction) {
      sendJson(res, 503, { error: 'Admin token is not configured.' });
      return false;
    }
    return true;
  }

  if(secureTokenEquals(bearerToken(req), adminToken)) return true;

  sendJson(res, 401, { error: 'Admin token required.' }, {
    'WWW-Authenticate': 'Bearer realm="worship-admin"'
  });
  return false;
}

async function handleSongsApi(req, res) {
  if(req.method === 'GET') {
    sendJson(res, 200, await readSongs());
    return;
  }

  if(req.method === 'PUT' || req.method === 'POST') {
    if(!requireAdminWrite(req, res)) return;
    const body = await readRequestBody(req);
    let songs;

    try {
      songs = body.trim() ? JSON.parse(body) : [];
    } catch(err) {
      sendJson(res, 400, { error: 'Invalid songs JSON.' });
      return;
    }

    await writeSongs(songs);
    sendJson(res, 200, { ok: true, count: songs.length });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed.' });
}

module.exports = {
  SECURITY_HEADERS,
  handleSongsApi,
  sendJson
};
