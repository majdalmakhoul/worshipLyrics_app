const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { SECURITY_HEADERS, handleSongsApi, sendJson } = require('./src/server/songs-api');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8080);

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
    ...SECURITY_HEADERS,
    ...headers
  });
  res.end(body);
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
      'Cache-Control': cacheControl,
      ...SECURITY_HEADERS
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Worship Lyrics server running on port ${PORT}`);
});
