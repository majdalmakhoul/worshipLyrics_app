let SS = { song:null, slides:[], index:0, lang:'arabizi' };
let ssFitFrame = null;

/* ================================================================
   SLIDESHOW
================================================================ */
function openSlideshow(id, startIndex, e) {
  if(e) e.stopPropagation();
  const song  = DB.find(s=>s.id===id);
  if(!song) return;
  const lang  = openSongLang[id] || songLangs(song)[0] || 'arabizi';
  const slides = cleanSlides(song.slides)[lang] || [];
  if(slides.length === 0) { showToast('No lyrics available in this language.'); return; }
  SS = { song, slides, index:startIndex||0, lang };
  ssRenderAll();
  document.getElementById('slideshow').classList.add('active');
  document.body.style.overflow = 'hidden';
  // Go fullscreen
  const el = document.getElementById('slideshow');
  if(el.requestFullscreen) el.requestFullscreen().catch(()=>{});
  else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

function ssClose() {
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  document.getElementById('slideshow').classList.remove('active');
  document.body.style.overflow = '';
}

function ssAdv()         { ssStep(1); }
function ssStep(dir, e)  { if(e) e.stopPropagation(); ssGo(SS.index+dir); }
function ssGo(i)         { SS.index=Math.max(0,Math.min(SS.slides.length-1,i)); ssRenderAll(); }

function ssSwitchLang(lang) {
  const langs = songLangs(SS.song);
  if(!langs.includes(lang)) return;
  SS.lang   = lang;
  SS.slides = cleanSlides(SS.song.slides)[lang] || [];
  SS.index  = Math.min(SS.index, SS.slides.length-1);
  ssRenderAll();
}

function ssRenderAll() {
  // Slide text
  const el = document.getElementById('ssText');
  el.textContent = SS.slides[SS.index] || '';
  el.className   = 'ss-slide-text' + (SS.lang==='arabic'?' arabic':'');

  const label = document.getElementById('ssSectionLabel');
  label.textContent = slideSectionLabel(SS.song, SS.index);
  label.classList.toggle('visible', !!SS.song.showLabels);

  // Title
  const suffix = SS.lang !== SS.song.mainLang && SS.song[SS.lang] ? ` - ${SS.song[SS.lang]}` : '';
  document.getElementById('ssTitle').textContent = songTitle(SS.song) + suffix;

  // Lang tabs - only langs with content
  const langs = songLangs(SS.song);
  document.getElementById('ssLangTabs').innerHTML = langs.map(l=>`
    <button class="ss-lang-tab${SS.lang===l?' active':''}" onclick="ssSwitchLang('${l}')">${LANG_LABELS[l]}</button>`).join('');

  // Nav buttons
  document.getElementById('ssPrev').disabled    = SS.index===0;
  document.getElementById('ssNextBtn').disabled = SS.index===SS.slides.length-1;

  // Progress
  document.getElementById('ssProgress').textContent = `${SS.index+1} / ${SS.slides.length}`;

  ssScheduleFit();

  // Push to projection
  if(Proj.active && Proj.win && !Proj.win.closed) projPush();
}

function ssScheduleFit() {
  if(ssFitFrame) cancelAnimationFrame(ssFitFrame);
  ssFitFrame = requestAnimationFrame(() => {
    ssFitFrame = null;
    ssFitText();
  });
}

function ssFitText() {
  const slideshow = document.getElementById('slideshow');
  const stage = document.getElementById('ssStage');
  const text = document.getElementById('ssText');
  if(!slideshow?.classList.contains('active') || !stage || !text) return;

  const stageRect = stage.getBoundingClientRect();
  if(stageRect.width < 1 || stageRect.height < 1) return;

  const label = document.getElementById('ssSectionLabel');
  const labelHeight = label?.classList.contains('visible') ? label.getBoundingClientRect().height + Math.max(12, stageRect.height * 0.025) : 0;
  const marginX = Math.max(28, Math.min(110, stageRect.width * 0.08));
  const marginY = Math.max(24, Math.min(90, stageRect.height * 0.08));
  const maxWidth = Math.max(220, stageRect.width - (marginX * 2));
  const maxHeight = Math.max(120, stageRect.height - (marginY * 2) - labelHeight);
  const scale = typeof appearanceLyricsScale === 'function' ? appearanceLyricsScale() : 1;
  const languageMax = SS.lang === 'arabic' ? 86 : 80;
  const preferred = Math.max(18, Math.min(
    languageMax * scale,
    stageRect.width * 0.13 * scale,
    stageRect.height * 0.16 * scale
  ));
  const minSize = Math.max(14, Math.min(26, Math.min(stageRect.width, stageRect.height) * 0.04));

  text.style.maxWidth = `${maxWidth}px`;
  text.style.fontSize = `${preferred}px`;

  let low = minSize;
  let high = Math.max(minSize, preferred);
  let best = minSize;

  for(let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    text.style.fontSize = `${mid}px`;
    const fits = text.scrollWidth <= maxWidth + 1 && text.scrollHeight <= maxHeight + 1;
    if(fits) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  text.style.fontSize = `${Math.floor(best)}px`;
}
