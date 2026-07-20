/* ================================================================
   APP STATE
================================================================ */
let activeLangFilter = 'all';
let currentPage      = 1;
let openSongId       = null;
let openSongLang     = {};   // songId ? displayed lang key

/* ================================================================
   RENDER ? MAIN LIST
================================================================ */
function buildLangFilter() {
  document.getElementById('langFilter').innerHTML =
    Object.entries(LANG_FILTER_LABELS).map(([key, label]) => `
      <button class="lang-filter__btn${activeLangFilter===key?' active':''}"
              onclick="setLangFilter('${key}')">${label}</button>`).join('');
}

function setLangFilter(lang) {
  activeLangFilter = lang;
  currentPage = 1;
  buildLangFilter();
  render();
}

function getFilteredSorted() {
  const q = document.getElementById('searchInput').value.trim();

  let results = DB.map(s => {
    const { score, fuzzy } = scoreSong(s, q);
    return { ...s, _score:score, _fuzzy:fuzzy };
  }).filter(s => {
    if(s._score <= 0.3) return false;
    if(activeLangFilter !== 'all' && !songHasLang(s, activeLangFilter)) return false;
    return true;
  }).sort((a,b) => b._score - a._score);

  return { results, query: q };
}

function render() {
  const { results, query } = getFilteredSorted();
  const q = query;

  const meta = document.getElementById('resultsMeta');
  meta.textContent = results.length === 0 ? '' : q
    ? `${results.length} result${results.length!==1?'s':''} for "${q}"`
    : `${results.length} song${results.length!==1?'s':''}`;

  const list = document.getElementById('songList');

  if(DB.length === 0) {
    list.innerHTML = emptyHTML('?','No songs yet','Songs will appear here once added to the library.');
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  if(results.length === 0) {
    list.innerHTML = emptyHTML('?','No songs found','Try a different spelling or language.');
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  // Paginate
  const totalPages = Math.ceil(results.length / SONGS_PER_PAGE);
  currentPage = Math.min(currentPage, totalPages);
  const pageItems = results.slice((currentPage-1)*SONGS_PER_PAGE, currentPage*SONGS_PER_PAGE);

  list.innerHTML = pageItems.map(s => songCardHTML(s)).join('');
  renderPagination(totalPages);
}

function emptyHTML(icon, title, hint) {
  return `<div class="empty-state">
    <span class="empty-state__icon">${icon}</span>
    <p class="empty-state__title">${title}</p>
    <p class="empty-state__hint">${hint}</p>
  </div>`;
}

/* ================================================================
   PAGINATION
================================================================ */
function renderPagination(total) {
  const pg = document.getElementById('pagination');
  if(total <= 1){ pg.innerHTML=''; return; }

  const pages = paginationRange(currentPage, total);
  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''} aria-label="Previous page">&lsaquo;</button>`;
  for(const p of pages) {
    if(p==='...') html+=`<span class="page-ellipsis">&hellip;</span>`;
    else html+=`<button class="page-btn${p===currentPage?' active':''}" onclick="goPage(${p})" aria-label="Page ${p}">${p}</button>`;
  }
  html+=`<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===total?'disabled':''} aria-label="Next page">&rsaquo;</button>`;
  pg.innerHTML = html;
}

function paginationRange(cur, total) {
  if(total<=7) return Array.from({length:total},(_,i)=>i+1);
  const pages=[];
  if(cur<=4) { for(let i=1;i<=5;i++) pages.push(i); pages.push('...'); pages.push(total); }
  else if(cur>=total-3){ pages.push(1); pages.push('...'); for(let i=total-4;i<=total;i++) pages.push(i); }
  else { pages.push(1); pages.push('...'); for(let i=cur-1;i<=cur+1;i++) pages.push(i); pages.push('...'); pages.push(total); }
  return pages;
}

function goPage(p) {
  currentPage = p;
  render();
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ================================================================
   SONG CARD HTML
================================================================ */
function songCardHTML(s) {
  const isOpen   = openSongId === s.id;
  const catMod   = s.category || 'praise';
  const titleLang = s.mainLang || 'arabizi';
  const primaryTitle = songTitle(s);
  const titleRowLangs = [titleLang, 'arabic'].filter((lang, index, arr) => s[lang] && arr.indexOf(lang) === index);
  const secondaryTitles = LANG_ORDER
    .filter(l => !titleRowLangs.includes(l) && s[l])
    .map(l => ({ lang:l, title:s[l] }))
    .filter(Boolean);
  return `<article class="song-card${isOpen?' open':''}" id="card-${s.id}" role="listitem">
    <div class="song-card__header" onclick="toggleSong(${s.id})" onkeydown="songCardKey(event,${s.id})" role="button" tabindex="0" aria-expanded="${isOpen}">
      <div class="song-card__dot" aria-hidden="true"></div>
      <div class="song-card__titles">
        <div class="song-card__title-row">
          ${titleRowLangs.map(lang => `
            <span class="song-card__title song-card__title--${lang}">${escHtml(lang === titleLang ? primaryTitle : s[lang])}</span>
          `).join('')}
        </div>
        <div class="song-card__sub">
          ${secondaryTitles.map(({ lang, title }) => `
            <span class="song-card__secondary song-card__secondary--${lang}">${escHtml(title)}</span>
          `).join('')}
        </div>
      </div>
      <div class="song-card__meta">
        ${s._fuzzy?`<span class="badge badge--fuzzy">closest</span>`:''}
        <span class="badge badge--${catMod}">${catMod}</span>
        <svg class="song-card__chevron" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
    ${isOpen ? lyricsPageHTML(s) : ''}
  </article>`;
}

function toggleSong(id) {
  openSongId = openSongId===id ? null : id;
  if(!openSongLang[id]) openSongLang[id] = songLangs(DB.find(s=>s.id===id))[0] || 'arabizi';
  render();
}

function songCardKey(e, id) {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  toggleSong(id);
}

/* ================================================================
   LYRICS PAGE (expanded card view)
================================================================ */
function lyricsPageHTML(s) {
  const langs     = songLangs(s);
  const lang      = openSongLang[s.id] || langs[0] || 'arabizi';
  const isArabic  = lang==='arabic';
  const isArabizi = lang==='arabizi';
  const slides    = cleanSlides(s.slides)[lang] || [];
  const fullText  = slides.join('\n\n');

  // Language tabs ? only show langs with content
  const langTabs = langs.map(l=>`
    <button class="lang-strip__tab${lang===l?' active':''}"
            onclick="setSongLang(${s.id},'${l}',event)">${LANG_LABELS[l]}</button>`).join('');

  // Slide chips
  const chips = slides.map((slide,i)=>`
    <span class="slide-chip" onclick="openSlideshow(${s.id},${i},event)"
          title="${escHtml(slide.split('\n')[0])}">${s.showLabels ? `${slideSectionLabel(s, i)} ` : 'Slide '}${i+1}</span>`).join('');

  // Screen picker
  const screenPickerHTML = buildScreenPickerHTML(s.id);

  return `<div class="lyrics-page">
    <div class="lang-strip">${langTabs}</div>
    <div class="present-bar">
      <button class="btn-present" onclick="openSlideshow(${s.id},0,event)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg>
        Present fullscreen
      </button>
      ${screenPickerHTML}
    </div>
    <div class="lyrics-full">
      <div class="lyrics-full__text${isArabic?' arabic':isArabizi?' arabizi':''}">${escHtml(fullText)}</div>
    </div>
    <div class="slide-chips">${chips}</div>
  </div>`;
}

function setSongLang(id, lang, e) {
  e.stopPropagation();
  openSongLang[id] = lang;
  render();
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ================================================================
   SCREEN PICKER HTML
================================================================ */
function buildScreenPickerHTML(songId) {
  const hasMulti = Screens.list.length > 1;

  // Label for the button
  let btnLabel, btnClass='screen-picker__btn';
  if(!Screens.permAsked && 'getScreenDetails' in window) {
    btnLabel='Detect displays';
  } else if(!hasMulti) {
    btnLabel=Screens.list[0] ? `${screenLabel(Screens.list[0])} ${screenResolution(Screens.list[0])}` : 'This screen';
  } else {
    btnLabel = Screens.chosen ? `${screenLabel(Screens.chosen)} ${screenResolution(Screens.chosen)}` : 'Choose display';
    btnClass += ' multi-screen';
  }

  const dropdownItems = hasMulti ? Screens.list.map((scr,i)=>`
    <div class="screen-option${scr===Screens.chosen?' selected':''}"
         onclick="chooseScreen(${i},${songId},event)">
      <div class="screen-option__dot"></div>
      <div>
        <div class="screen-option__name">${screenLabel(scr)}</div>
        <div class="screen-option__sub">${scr.isPrimary?'Primary ? ':''}${screenResolution(scr)} ? ${screenPosition(scr)}</div>
      </div>
    </div>`).join('') : '';

  return `<div class="screen-picker" id="spWrap-${songId}">
    <button class="${btnClass}" id="spBtn-${songId}"
            onclick="screenPickerClick(${songId},event)"
            title="${hasMulti?'Choose display to project on':''}">
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      <span id="spLabel-${songId}">${btnLabel}</span>
      ${hasMulti?`<svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>`:''}
    </button>
    <div class="screen-picker__dropdown" id="spDd-${songId}">
      ${dropdownItems}
    </div>
  </div>`;
}

async function screenPickerClick(songId, e) {
  e.stopPropagation();
  if(!Screens.permAsked && 'getScreenDetails' in window) {
    // First click: request permission
    const btn = document.getElementById(`spBtn-${songId}`);
    btn.classList.add('requesting');
    await screensRequestPermission();
    btn.classList.remove('requesting');
    render(); // re-render with detected screens
    return;
  }
  if(Screens.list.length > 1) {
    const dd = document.getElementById(`spDd-${songId}`);
    if(dd) dd.classList.toggle('open');
  }
}

function chooseScreen(index, songId, e) {
  e.stopPropagation();
  Screens.chosen = Screens.list[index];
  document.getElementById(`spDd-${songId}`)?.classList.remove('open');
  render();
  showToast(`Will project to: ${screenLabel(Screens.chosen)} ${screenResolution(Screens.chosen)}`);
}

/* ================================================================
   SMART LYRICS PARSER
================================================================ */
let smartActiveLang = 'arabizi';
let lyricsLangPromptResolve = null;
let lyricsLangPromptSelected = null;

function switchSmartLang(lang, tabEl) {
  if(!LANG_ORDER.includes(lang)) return;
  smartActiveLang = lang;
  document.querySelectorAll('.smart-lang-tab').forEach(t=>t.classList.remove('active'));
  tabEl.classList.add('active');
  ['rawArabizi','rawArabic','rawEn','rawFr'].forEach(id=>document.getElementById(id).style.display='none');
  const map = {arabizi:'rawArabizi',arabic:'rawArabic',en:'rawEn',fr:'rawFr'};
  document.getElementById(map[lang]).style.display='block';
}

function switchSmartLangTo(lang) {
  const tab = document.querySelector(`[data-smart-lang="${lang}"]`);
  if(tab) switchSmartLang(lang, tab);
  else if(LANG_ORDER.includes(lang)) smartActiveLang = lang;
}

function smartRawId(lang) {
  return ({ arabizi:'rawArabizi', arabic:'rawArabic', en:'rawEn', fr:'rawFr' })[lang];
}

function currentFormMainLang() {
  return document.getElementById('fMainLang')?.value || 'arabic';
}

function preferredLyricsLang() {
  return LANG_ORDER.includes(currentFormMainLang()) ? currentFormMainLang() : smartActiveLang;
}

function askLyricsTargetLang(actionLabel) {
  const prompt = document.getElementById('lyricsLangPrompt');
  if(!prompt) return Promise.resolve(preferredLyricsLang());

  lyricsLangPromptSelected = preferredLyricsLang();
  document.getElementById('lyricsLangPromptTitle').textContent = `${actionLabel}: choose lyrics language`;
  renderLyricsLangPromptOptions();
  prompt.classList.add('active');

  return new Promise(resolve => {
    lyricsLangPromptResolve = resolve;
  });
}

function renderLyricsLangPromptOptions() {
  const options = document.getElementById('lyricsLangPromptOptions');
  options.innerHTML = LANG_ORDER.map(lang => `
    <button class="lang-prompt__option${lyricsLangPromptSelected===lang?' active':''}"
            type="button"
            onclick="chooseLyricsPromptLang('${lang}')">${LANG_LABELS[lang]}</button>
  `).join('');
}

function chooseLyricsPromptLang(lang) {
  if(!LANG_ORDER.includes(lang)) return;
  lyricsLangPromptSelected = lang;
  renderLyricsLangPromptOptions();
}

function closeLyricsLangPrompt(lang) {
  document.getElementById('lyricsLangPrompt')?.classList.remove('active');
  const resolve = lyricsLangPromptResolve;
  lyricsLangPromptResolve = null;
  if(lang) switchSmartLangTo(lang);
  if(resolve) resolve(lang || null);
}

function confirmLyricsPromptLang() {
  closeLyricsLangPrompt(lyricsLangPromptSelected || preferredLyricsLang());
}

function cancelLyricsPromptLang() {
  closeLyricsLangPrompt(null);
}

function devCanReplaceSlidesBuilder() {
  const entries = Array.from(document.querySelectorAll('.slide-entry'));
  if(entries.length === 0) return true;
  return entries.every(entry => LANG_ORDER.every(lang => {
    const field = entry.querySelector(`[data-field="${lang}"]`);
    return !field || !field.value.trim();
  }));
}

function devPopulateSlidesForLang(slides, lang) {
  document.getElementById('slidesBuilder').innerHTML = '';
  devSlideCount = 0;

  for(const slide of slides) {
    const data = { arabizi:'', arabic:'', en:'', fr:'', section:'verse' };
    data[lang] = slide;
    devAddSlide(data);
  }
}

async function runSmartParse() {
  const btn = document.getElementById('btnParse');
  try {
    const lang = await askLyricsTargetLang('Auto-split lyrics');
    if(!lang) return;

    const rawInput = document.getElementById(smartRawId(lang));
    const text = rawInput?.value.trim() || '';

    if(!text) {
      showToast(`Paste ${LANG_LABELS[lang]} lyrics first.`);
      return;
    }

    btn.disabled = true;

    const slides = await parseLyricsForLang(text, lang);
    if(slides.length === 0) { showToast('Could not split lyrics. Try pasting more text.'); return; }

    if(!devCanReplaceSlidesBuilder()) {
      const ok = confirm(`Replace current slide builder with ${slides.length} ${LANG_LABELS[lang]} slide${slides.length === 1 ? '' : 's'}?`);
      if(!ok) return;
    }

    devPopulateSlidesForLang(slides, lang);
    showToast(`Split ${slides.length} ${LANG_LABELS[lang]} slide${slides.length === 1 ? '' : 's'}`);
  } finally {
    btn.disabled = false;
  }
}

async function parseLyricsForLang(text, lang) {
  return fallbackSplit(text, lang);
}

/* Pure local splitter: honor blank lines and common section labels, max 4 lines per slide. */
function fallbackSplit(text, lang) {
  const labelRe = /^(verse|v|chorus|ch|refrain|pre[-\s]?chorus|bridge|intro|outro|tag|ending|couplet)\s*\d*\s*[:.)-]?$/i;
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trim());

  const sections = [];
  let current = [];

  for(const line of lines) {
    if(!line || labelRe.test(line)) {
      if(current.length) {
        sections.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if(current.length) sections.push(current);

  const slides = [];
  for(const section of sections) {
    for(let i=0;i<section.length;i+=4) {
      slides.push(section.slice(i,i+4).join('\n'));
    }
  }
  return slides;
}

/* ================================================================
   DEV PANEL
================================================================ */let devEditingId   = null;
let devSlideCount  = 0;

function devOpen()  { devResetForm(); devSwitchTab('add'); document.getElementById('devPanel').classList.add('active'); document.body.style.overflow='hidden'; }
function devClose() { document.getElementById('devPanel').classList.remove('active'); document.body.style.overflow=''; }

function devSwitchTab(tab) {
  document.getElementById('devTabAdd').classList.toggle('active',    tab==='add');
  document.getElementById('devTabManage').classList.toggle('active', tab==='manage');
  document.getElementById('devContentAdd').style.display    = tab==='add'    ? 'block':'none';
  document.getElementById('devContentManage').style.display = tab==='manage' ? 'block':'none';
  if(tab==='manage') devRenderManager();
}

function sectionOptions(selected) {
  return Object.entries(SECTION_LABELS)
    .map(([value,label]) => `<option value="${value}"${value===selected?' selected':''}>${label}</option>`)
    .join('');
}

function devSyncLanguageOptions() {
  const mainLang = document.getElementById('fMainLang').value;
  const hasArabizi = document.getElementById('fHasArabizi').checked;
  const arabiziDisabled = mainLang === 'arabic' && !hasArabizi;
  document.getElementById('arabiziToggleWrap').style.display = mainLang === 'arabic' ? 'flex' : 'none';
  document.getElementById('fArabizi').disabled = arabiziDisabled;
  document.querySelectorAll('[data-field="arabizi"]').forEach(el => { el.disabled = arabiziDisabled; });
}

function devAddSlide(data) {
  devSlideCount++;
  const d = data || {arabizi:'',arabic:'',en:'',fr:'',section:'verse'};
  const div = document.createElement('div');
  div.className = 'slide-entry';
  div.innerHTML = `
    <div class="slide-entry__header">
      <span class="slide-entry__num">Slide ${document.querySelectorAll('.slide-entry').length+1}</span>
      <select class="slide-entry__section" data-field="section" aria-label="Slide section">${sectionOptions(d.section || d.type || 'verse')}</select>
      <button class="slide-entry__remove" onclick="devRemoveSlide(this)">&times;</button>
    </div>
    <div class="slide-entry__grid">
      <div><div class="slide-entry__label">Arabizi</div><textarea class="slide-entry__textarea" data-field="arabizi" placeholder="Arabizi?">${escHtml(d.arabizi)}</textarea></div>
      <div><div class="slide-entry__label">Arabic عربي</div><textarea class="slide-entry__textarea rtl" data-field="arabic" placeholder="عربي…">${escHtml(d.arabic)}</textarea></div>
      <div><div class="slide-entry__label">English</div><textarea class="slide-entry__textarea" data-field="en" placeholder="English?">${escHtml(d.en)}</textarea></div>
      <div><div class="slide-entry__label">Français</div><textarea class="slide-entry__textarea" data-field="fr" placeholder="Français…">${escHtml(d.fr)}</textarea></div>
    </div>`;
  document.getElementById('slidesBuilder').appendChild(div);
  devRenumber();
  devSyncLanguageOptions();
}

function devRemoveSlide(btn) { btn.closest('.slide-entry').remove(); devRenumber(); }
function devRenumber() {
  document.querySelectorAll('.slide-entry').forEach((el,i) => {
    el.querySelector('.slide-entry__num').textContent = `Slide ${i+1}`;
  });
}

function devResetForm() {
  devEditingId = null; devSlideCount = 0;
  ['fArabizi','fArabic','fEn','fFr'].forEach(id => document.getElementById(id).value='');
  document.getElementById('fCat').value='praise';
  document.getElementById('fMainLang').value='arabic';
  document.getElementById('fHasArabizi').checked=true;
  document.getElementById('fShowLabels').checked=false;
  document.getElementById('slidesBuilder').innerHTML='';
  document.getElementById('devTitle').textContent='Add Song';
  document.getElementById('devEditNote').textContent='';
  // Clear raw inputs
  ['rawArabizi','rawArabic','rawEn','rawFr'].forEach(id=>document.getElementById(id).value='');
  devAddSlide(); devAddSlide(); // 2 blank slides to start
  devSyncLanguageOptions();
  switchSmartLangTo(currentFormMainLang());
}

function devLoadSong(song) {
  song = normalizeSong(song);
  devEditingId = song.id;
  document.getElementById('fCat').value    = song.category;
  document.getElementById('fMainLang').value= song.mainLang;
  document.getElementById('fHasArabizi').checked = song.hasArabizi;
  document.getElementById('fShowLabels').checked = song.showLabels;
  document.getElementById('fArabizi').value= song.arabizi;
  document.getElementById('fArabic').value = song.arabic||'';
  document.getElementById('fEn').value     = song.en||'';
  document.getElementById('fFr').value     = song.fr||'';
  document.getElementById('slidesBuilder').innerHTML='';
  devSlideCount=0;
  const len = Math.max(...Object.values(song.slides).map(a=>a.length), 0);
  for(let i=0;i<len;i++) devAddSlide({
    arabizi: song.slides.arabizi?.[i]||'',
    arabic:  song.slides.arabic?.[i] ||'',
    en:      song.slides.en?.[i]     ||'',
    fr:      song.slides.fr?.[i]     ||'',
    section: song.sections?.[i]?.type || 'verse',
  });
  document.getElementById('devTitle').textContent   = 'Edit Song';
  document.getElementById('devEditNote').textContent = `Editing: ${songTitle(song)}`;
  devSyncLanguageOptions();
  switchSmartLangTo(currentFormMainLang());
  devSwitchTab('add');
}

async function devSaveSong() {
  const mainLang = document.getElementById('fMainLang').value;
  const hasArabizi = mainLang === 'arabic' ? document.getElementById('fHasArabizi').checked : true;
  const showLabels = document.getElementById('fShowLabels').checked;
  const arabizi  = hasArabizi || mainLang === 'arabizi' ? document.getElementById('fArabizi').value.trim() : '';
  const arabic   = document.getElementById('fArabic').value.trim();
  const en       = document.getElementById('fEn').value.trim();
  const fr       = document.getElementById('fFr').value.trim();
  const category = document.getElementById('fCat').value;
  const titles = { arabizi, arabic, en, fr };
  if(!titles[mainLang]) { showToast(`Please enter the ${LANG_LABELS[mainLang]} title.`); return; }

  const entries = document.querySelectorAll('.slide-entry');
  const slides  = { arabizi:[], arabic:[], en:[], fr:[] };
  const sections = [];
  entries.forEach(entry => {
    for(const lang of Object.keys(slides)) {
      slides[lang].push(lang === 'arabizi' && !hasArabizi ? '' : entry.querySelector(`[data-field="${lang}"]`).value.trim());
    }
    sections.push({ type: entry.querySelector('[data-field="section"]').value || 'verse' });
  });

  if(!slides[mainLang]?.some(Boolean)) {
    showToast(`Please enter at least one ${LANG_LABELS[mainLang]} lyric slide.`);
    return;
  }

  let saveAction = 'added';
  if(devEditingId !== null) {
    const idx = DB.findIndex(s=>s.id===devEditingId);
    if(idx!==-1) DB[idx] = {id:devEditingId, category, mainLang, hasArabizi, showLabels, arabizi, arabic, en, fr, slides, sections};
    saveAction = 'updated';
  } else {
    const newId = DB.length>0 ? Math.max(...DB.map(s=>s.id))+1 : 1;
    DB.push({ id:newId, category, mainLang, hasArabizi, showLabels, arabizi, arabic, en, fr, slides, sections });
  }

  const savedShared = await dbSave(DB);
  showToast(savedShared
    ? `"${titles[mainLang]}" ${saveAction} in shared library`
    : `"${titles[mainLang]}" ${saveAction} on this device only`);
  devResetForm();
  render();
}

function devRenderManager() {
  document.getElementById('managerCount').textContent = `${DB.length} song${DB.length!==1?'s':''} in library`;
  const list = document.getElementById('managerList');
  if(DB.length===0){ list.innerHTML=`<div class="manager-empty">No songs yet.</div>`; return; }
  list.innerHTML = [...DB]
    .sort((a,b)=>songTitle(a).localeCompare(songTitle(b)))
    .map(s=>`
      <div class="manager-row">
        <div class="manager-row__info">
          <div class="manager-row__title">${escHtml(songTitle(s))}</div>
          <div class="manager-row__sub">${[s.arabic,s.en].filter(Boolean).join(' ? ')} ? ${s.category} ? ${songSlideCount(s)} slides</div>
        </div>
        <div class="manager-row__actions">
          <button class="btn-edit"   onclick="devEditSong(${s.id})">Edit</button>
          <button class="btn-delete" onclick="devDeleteSong(${s.id})">Delete</button>
        </div>
      </div>`).join('');
}

function devEditSong(id)   { const s=DB.find(s=>s.id===id); if(s) devLoadSong(s); }
async function devDeleteSong(id) {
  const s=DB.find(s=>s.id===id); if(!s) return;
  if(!confirm(`Delete "${songTitle(s)}"? This cannot be undone.`)) return;
  DB=DB.filter(x=>x.id!==id);
  const savedShared = await dbSave(DB);
  showToast(savedShared
    ? `"${songTitle(s)}" deleted from shared library`
    : `"${songTitle(s)}" deleted on this device only`);
  devRenderManager(); render();
}

async function devConnectJsonFile() {
  await dbConnectJsonFile();
  devRenderManager();
}

function devExport() {
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='worship-songs.json'; a.click(); URL.revokeObjectURL(a.href);
  showToast('Exported worship-songs.json');
}

/* ================================================================
   TOAST
================================================================ */
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>t.classList.remove('show'), 2800);
}
