const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_SONGS_FILE = path.join(ROOT, 'worship-songs.json');

let blobSdkPromise = null;

function songsStorageMode() {
  return (process.env.SONGS_STORAGE || 'file').trim().toLowerCase();
}

function useBlobStorage() {
  const mode = songsStorageMode();
  return mode === 'vercel-blob' || mode === 'blob';
}

function songsFilePath() {
  return process.env.SONGS_FILE
    ? path.resolve(process.env.SONGS_FILE)
    : DEFAULT_SONGS_FILE;
}

function songsBlobPath() {
  return process.env.SONGS_BLOB_PATH || 'worship-songs.json';
}

function songsBlobAccess() {
  return (process.env.SONGS_BLOB_ACCESS || 'private').trim().toLowerCase();
}

function songsBlobToken() {
  return process.env.SONGS_BLOB_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '';
}

function songsBlobStoreId() {
  return process.env.SONGS_BLOB_STORE_ID || process.env.BLOB_STORE_ID || '';
}

function parseSongsJson(raw) {
  if(!raw.trim()) return [];
  const parsed = JSON.parse(raw);
  if(!Array.isArray(parsed)) throw new Error('Song library must be an array.');
  return parsed;
}

function songsBlobOptions(extra = {}) {
  const access = songsBlobAccess();
  const token = songsBlobToken();
  const storeId = songsBlobStoreId();

  if(access !== 'private' && access !== 'public') {
    throw new Error('SONGS_BLOB_ACCESS must be "private" or "public".');
  }

  return {
    access,
    ...(token ? { token } : {}),
    ...(storeId ? { storeId } : {}),
    ...extra
  };
}

async function blobSdk() {
  if(!blobSdkPromise) blobSdkPromise = import('@vercel/blob');
  return blobSdkPromise;
}

async function readSongsFromBlob() {
  const { get } = await blobSdk();
  const result = await get(songsBlobPath(), songsBlobOptions());
  if(!result || result.statusCode === 404) return [];
  if(result.statusCode !== 200 || !result.stream) {
    throw new Error('Song library blob could not be read.');
  }

  const raw = await new Response(result.stream).text();
  return parseSongsJson(raw);
}

async function writeSongsToBlob(songs) {
  if(!Array.isArray(songs)) throw new Error('Song library must be an array.');
  const { put } = await blobSdk();
  await put(songsBlobPath(), `${JSON.stringify(songs, null, 2)}\n`, songsBlobOptions({
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60
  }));
}

async function ensureSongsFile() {
  const songsFile = songsFilePath();

  try {
    await fs.access(songsFile);
    return;
  } catch(err) {
    if(err.code !== 'ENOENT') throw err;
  }

  await fs.mkdir(path.dirname(songsFile), { recursive: true });
  let seed = '[]\n';

  if(songsFile !== DEFAULT_SONGS_FILE) {
    try {
      const raw = await fs.readFile(DEFAULT_SONGS_FILE, 'utf8');
      seed = raw.trim() ? raw : seed;
    } catch(err) {
      if(err.code !== 'ENOENT') throw err;
    }
  }

  await fs.writeFile(songsFile, seed.endsWith('\n') ? seed : `${seed}\n`, 'utf8');
}

async function readSongsFromFile() {
  const songsFile = songsFilePath();
  await ensureSongsFile();

  try {
    const raw = await fs.readFile(songsFile, 'utf8');
    return parseSongsJson(raw);
  } catch(err) {
    if(err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeSongsToFile(songs) {
  if(!Array.isArray(songs)) throw new Error('Song library must be an array.');
  const songsFile = songsFilePath();
  await fs.mkdir(path.dirname(songsFile), { recursive: true });
  const tmp = `${songsFile}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(songs, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, songsFile);
}

async function readSongs() {
  return useBlobStorage() ? readSongsFromBlob() : readSongsFromFile();
}

async function writeSongs(songs) {
  return useBlobStorage() ? writeSongsToBlob(songs) : writeSongsToFile(songs);
}

module.exports = {
  parseSongsJson,
  readSongs,
  writeSongs
};
