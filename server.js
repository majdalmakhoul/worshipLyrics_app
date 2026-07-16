const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const ROOT = __dirname;
const DEFAULT_SONGS_FILE = path.join(ROOT, 'worship-songs.json');
const SONGS_FILE = process.env.SONGS_FILE
  ? path.resolve(process.env.SONGS_FILE)
  : DEFAULT_SONGS_FILE;
const PORT = Number(process.env.PORT || 8080);
const MAX_BODY_BYTES = 5 * 1024 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, `${JSON.stringify(value)}\n`, {
    'Content-Type': 'application/json; charset=utf-8'
  });
}

async function readSongs() {
  await ensureSongsFile();
  try {
    const raw = await fs.readFile(SONGS_FILE, 'utf8');
    if(!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed)) throw new Error('Song library must be an array.');
    return parsed;
  } catch(err) {
    if(err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeSongs(songs) {
  if(!Array.isArray(songs)) throw new Error('Song library must be an array.');
  await fs.mkdir(path.dirname(SONGS_FILE), { recursive: true });
  const tmp = `${SONGS_FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(songs, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, SONGS_FILE);
}

async function ensureSongsFile() {
  try {
    await fs.access(SONGS_FILE);
    return;
  } catch(err) {
    if(err.code !== 'ENOENT') throw err;
  }

  await fs.mkdir(path.dirname(SONGS_FILE), { recursive: true });
  let seed = '[]\n';

  if(SONGS_FILE !== DEFAULT_SONGS_FILE) {
    try {
      const raw = await fs.readFile(DEFAULT_SONGS_FILE, 'utf8');
      seed = raw.trim() ? raw : seed;
    } catch(err) {
      if(err.code !== 'ENOENT') throw err;
    }
  }

  await fs.writeFile(SONGS_FILE, seed.endsWith('\n') ? seed : `${seed}\n`, 'utf8');
}

function readRequestBody(req) {
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

async function handleSongsApi(req, res) {
  if(req.method === 'GET') {
    sendJson(res, 200, await readSongs());
    return;
  }

  if(req.method === 'PUT' || req.method === 'POST') {
    const body = await readRequestBody(req);
    const songs = body.trim() ? JSON.parse(body) : [];
    await writeSongs(songs);
    sendJson(res, 200, { ok: true, count: songs.length });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed.' });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const requested = decodedPath === '/' ? '/index.html' : decodedPath;
  const filePath = path.normalize(path.join(ROOT, requested));
  const relativePath = path.relative(ROOT, filePath);

  if(relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const cacheControl = filePath.endsWith('index.html')
      ? 'no-store'
      : 'public, max-age=3600';
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': cacheControl
    });
    res.end(data);
  } catch(err) {
    if(err.code === 'ENOENT') {
      send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
    throw err;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if(requestUrl.pathname.endsWith('/api/songs')) {
      await handleSongsApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch(err) {
    console.error(err);
    sendJson(res, 500, { error: 'Server error.' });
  }
});

server.listen(PORT, () => {
  console.log(`Worship Lyrics server running at http://localhost:${PORT}`);
});
