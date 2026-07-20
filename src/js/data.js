/* ================================================================
   CONSTANTS & STORAGE
================================================================ */
const STORAGE_KEY   = 'worship_songs_v1';
const SONGS_FILE_DB = 'worship_song_file_store';
const SONGS_FILE_STORE = 'handles';
const SONGS_FILE_KEY = 'songs-json';
const SONGS_FILE_NAME = 'worship-songs.json';
const SONGS_API_URL = '/api/songs';
const ADMIN_TOKEN_SESSION_KEY = 'worship_admin_token_v1';
const SONGS_PER_PAGE = 10;
const LANG_LABELS   = { arabizi:'Arabizi', arabic:'عربي', en:'English', fr:'Français' };
const LANG_FILTER_LABELS = {
  all:'All', arabizi:'Arabizi', arabic:'Arabic عربي', en:'English', fr:'Français'
};
const LANG_ORDER = ['arabic', 'arabizi', 'en', 'fr'];
const SECTION_LABELS = {
  verse:'Verse',
  chorus:'Chorus',
  prechorus:'Pre-chorus',
  bridge:'Bridge',
  intro:'Intro',
  outro:'Outro',
  other:'Other'
};

const DEFAULT_SONGS = [
  // Add starter songs here using the same shape exported by the dev panel JSON.
];

let SongsFileHandle = null;
let SharedSongsApiAvailable = false;

function cloneDefaultSongs() {
  return JSON.parse(JSON.stringify(DEFAULT_SONGS));
}

function dbLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : cloneDefaultSongs();
  } catch(e) {
    return cloneDefaultSongs();
  }
}
function dbSaveLocal(arr)  { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
function dbSave(arr) { return dbPersistSongs(arr, { promptForFile:false }); }

let DB = dbLoad();  // master song array

function cleanSlides(slides) {
  const out = { arabizi:[], arabic:[], en:[], fr:[] };
  for(const lang of Object.keys(out)) out[lang] = Array.isArray(slides?.[lang]) ? slides[lang] : [];
  return out;
}

function normalizeSong(song) {
  const slides = cleanSlides(song.slides);
  const mainLang = song.mainLang || (song.arabic ? 'arabic' : song.en ? 'en' : song.fr ? 'fr' : 'arabizi');
  const sections = Array.isArray(song.sections) ? song.sections : [];
  return {
    ...song,
    mainLang,
    hasArabizi: song.hasArabizi !== false,
    showLabels: !!song.showLabels,
    slides,
    sections
  };
}

DB = DB.map(normalizeSong);
dbSaveLocal(DB);

function dbJsonText(arr = DB) {
  return `${JSON.stringify(arr.map(normalizeSong), null, 2)}\n`;
}

function sharedSongsApiSupported() {
  return location.protocol !== 'file:' && 'fetch' in window;
}

function sharedSongsAdminToken() {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY) || '';
  } catch(e) {
    return '';
  }
}

function sharedSongsSetAdminToken(value) {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, value);
  } catch(e) {}
}

function sharedSongsClearAdminToken() {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY);
  } catch(e) {}
}

function sharedSongsAuthHeaders() {
  const token = sharedSongsAdminToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function askSharedSongsAdminToken() {
  const token = prompt('Admin password required to update the shared song library.')?.trim();
  if(!token) return false;
  sharedSongsSetAdminToken(token);
  return true;
}

async function sharedSongsRead() {
  if(!sharedSongsApiSupported()) return null;
  const response = await fetch(SONGS_API_URL, {
    cache: 'no-store',
    headers: { 'Accept': 'application/json' }
  });
  if(!response.ok) throw new Error('Shared song library is unavailable.');
  const parsed = await response.json();
  if(!Array.isArray(parsed)) throw new Error('Shared song library must contain an array.');
  SharedSongsApiAvailable = true;
  return parsed.map(normalizeSong);
}

async function sharedSongsWrite(arr) {
  if(!sharedSongsApiSupported()) return false;
  if(!SharedSongsApiAvailable) return false;

  for(let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(SONGS_API_URL, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...sharedSongsAuthHeaders()
      },
      body: dbJsonText(arr),
      cache: 'no-store'
    });

    if(response.status === 401 || response.status === 403) {
      sharedSongsClearAdminToken();
      if(askSharedSongsAdminToken()) continue;
      throw new Error('Admin password required to update shared songs.');
    }

    if(response.status === 503) {
      throw new Error('Shared song editing is not configured on the server.');
    }

    if(!response.ok) throw new Error('Shared song library could not be saved.');
    return true;
  }

  throw new Error('Admin password was not accepted.');
}

async function dbLoadFromSharedStore() {
  try {
    const songs = await sharedSongsRead();
    if(!songs) return false;
    DB = songs;
    dbSaveLocal(DB);
    return true;
  } catch(e) {
    SharedSongsApiAvailable = false;
    return false;
  }
}

function songFileApiSupported() {
  return 'showSaveFilePicker' in window && 'indexedDB' in window;
}

function songFileOpenStore(mode = 'readonly') {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SONGS_FILE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(SONGS_FILE_STORE);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      try {
        const tx = request.result.transaction(SONGS_FILE_STORE, mode);
        resolve({ db: request.result, tx, store: tx.objectStore(SONGS_FILE_STORE) });
      } catch(e) {
        request.result.close();
        reject(e);
      }
    };
  });
}

function songFileGetHandle() {
  if(SongsFileHandle) return Promise.resolve(SongsFileHandle);
  if(!songFileApiSupported()) return Promise.resolve(null);
  return new Promise(async resolve => {
    try {
      const { db, store } = await songFileOpenStore();
      const request = store.get(SONGS_FILE_KEY);
      request.onsuccess = () => {
        SongsFileHandle = request.result || null;
        db.close();
        resolve(SongsFileHandle);
      };
      request.onerror = () => { db.close(); resolve(null); };
    } catch(e) {
      resolve(null);
    }
  });
}

function songFileSetHandle(handle) {
  return new Promise(async (resolve, reject) => {
    try {
      const { db, tx, store } = await songFileOpenStore('readwrite');
      store.put(handle, SONGS_FILE_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    } catch(e) {
      reject(e);
    }
  });
}

async function songFileCanWrite(handle) {
  if(!handle) return false;
  const options = { mode: 'readwrite' };
  if(await handle.queryPermission(options) === 'granted') return true;
  return await handle.requestPermission(options) === 'granted';
}

async function songFileWrite(handle, arr = DB) {
  if(!await songFileCanWrite(handle)) throw new Error('No permission to write songs JSON file.');
  const writable = await handle.createWritable();
  await writable.write(dbJsonText(arr));
  await writable.close();
}

async function songFileRead(handle) {
  const file = await handle.getFile();
  const text = await file.text();
  if(!text.trim()) return [];
  const parsed = JSON.parse(text);
  if(!Array.isArray(parsed)) throw new Error('Songs JSON must contain an array.');
  return parsed.map(normalizeSong);
}

async function songFileChoose() {
  if(!songFileApiSupported()) {
    showToast('Your browser cannot auto-save JSON files. Use Export JSON instead.');
    return null;
  }
  const handle = await window.showSaveFilePicker({
    suggestedName: SONGS_FILE_NAME,
    types: [{
      description: 'Songs JSON',
      accept: { 'application/json': ['.json'] }
    }]
  });
  SongsFileHandle = handle;
  await songFileSetHandle(handle);
  return handle;
}

async function dbConnectJsonFile() {
  try {
    const handle = await songFileChoose();
    if(!handle) return false;
    await songFileWrite(handle, DB);
    showToast(`Connected ${handle.name || SONGS_FILE_NAME}`);
    return true;
  } catch(e) {
    if(e?.name !== 'AbortError') showToast('Could not connect JSON file.');
    return false;
  }
}

async function dbLoadFromJsonFile() {
  try {
    const handle = await songFileGetHandle();
    if(!handle) return false;
    if(await handle.queryPermission({ mode: 'read' }) !== 'granted') return false;
    DB = await songFileRead(handle);
    dbSaveLocal(DB);
    return true;
  } catch(e) {
    return false;
  }
}

async function dbPersistSongs(arr, options = {}) {
  const songs = arr.map(normalizeSong);
  dbSaveLocal(songs);

  try {
    if(await sharedSongsWrite(songs)) return true;
  } catch(e) {
    showToast(e?.message || 'Saved in this browser, but the shared library was not updated.');
    return false;
  }

  try {
    let handle = SongsFileHandle;
    if(!handle && options.promptForFile !== false) handle = await songFileChoose();
    if(handle) {
      await songFileWrite(handle, songs);
      return true;
    }
  } catch(e) {
    if(e?.name !== 'AbortError') showToast('Saved in browser, but JSON file was not updated.');
  }
  return false;
}

function songTitle(song, lang = song.mainLang) {
  const normalized = normalizeSong(song);
  return normalized[lang] || normalized[normalized.mainLang] || normalized.arabizi || normalized.arabic || normalized.en || normalized.fr || 'Untitled song';
}

function slideText(song, lang, index) {
  return cleanSlides(song.slides)[lang]?.[index] || '';
}

function slideSection(song, index) {
  return song.sections?.[index]?.type || 'verse';
}

function slideSectionLabel(song, index) {
  return SECTION_LABELS[slideSection(song, index)] || SECTION_LABELS.other;
}

function songSlideCount(song) {
  const slides = cleanSlides(song.slides);
  return Math.max(...Object.values(slides).map(a => a.length), 0);
}
