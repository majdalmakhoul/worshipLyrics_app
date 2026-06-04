/* ================================================================
   CONSTANTS & STORAGE
================================================================ */
const STORAGE_KEY   = 'worship_songs_v1';
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
function dbSave(arr)  { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

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
