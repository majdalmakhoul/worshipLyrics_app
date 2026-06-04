let SS = { song:null, slides:[], index:0, lang:'arabizi' };

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
  // Open projection window
  projOpen();
}

function ssClose() {
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  document.getElementById('slideshow').classList.remove('active');
  document.body.style.overflow = '';
  projClose();
}

function ssAdv()         { ssStep(1); }
function ssStep(dir, e)  { if(e) e.stopPropagation(); ssGo(SS.index+dir); }
function ssGo(i)         { SS.index=Math.max(0,Math.min(SS.slides.length-1,i)); ssRenderAll(); }
function ssOpenProjectionView(e) { if(e) e.stopPropagation(); projOpen(); }

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

  const nextEl = document.getElementById('ssNextText');
  const nextText = SS.slides[SS.index + 1] || '';
  nextEl.textContent = nextText || 'End of song';
  nextEl.className = 'ss-next-text' + (SS.lang==='arabic'?' arabic':'') + (nextText ? '' : ' ss-next-empty');

  const label = document.getElementById('ssSectionLabel');
  label.textContent = slideSectionLabel(SS.song, SS.index);
  label.classList.toggle('visible', !!SS.song.showLabels);

  // Title
  const suffix = SS.lang !== SS.song.mainLang && SS.song[SS.lang] ? ` - ${SS.song[SS.lang]}` : '';
  document.getElementById('ssTitle').textContent = songTitle(SS.song) + suffix;

  // Lang tabs ? only langs with content
  const langs = songLangs(SS.song);
  document.getElementById('ssLangTabs').innerHTML = langs.map(l=>`
    <button class="ss-lang-tab${SS.lang===l?' active':''}" onclick="ssSwitchLang('${l}')">${LANG_LABELS[l]}</button>`).join('');

  // Nav buttons
  document.getElementById('ssPrev').disabled    = SS.index===0;
  document.getElementById('ssNextBtn').disabled = SS.index===SS.slides.length-1;

  // Progress
  document.getElementById('ssProgress').textContent = `${SS.index+1} / ${SS.slides.length}`;
  ssUpdateProjectionStatus();

  // Tray
  ssBuildTray();

  // Push to projection
  if(Proj.active && Proj.win && !Proj.win.closed) projPush();
}

function ssBuildTray() {
  document.getElementById('ssTray').innerHTML = SS.slides.map((slide,i)=>`
    <div class="ss-tray__item${i===SS.index?' active':''}" onclick="ssGo(${i})">
      <span class="ss-tray__num">${SS.song.showLabels ? slideSectionLabel(SS.song, i) : 'Slide'} ${i+1}</span>${escHtml(slide)}
    </div>`).join('');
  // Scroll active item into view
  const tray = document.getElementById('ssTray');
  const active = tray.querySelector('.ss-tray__item.active');
  if(active) active.scrollIntoView({inline:'nearest', behavior:'smooth'});
}

function ssUpdateProjectionStatus() {
  const el = document.getElementById('ssProjStatus');
  if(!el) return;
  el.textContent = Proj.active && Proj.win && !Proj.win.closed ? 'Slideshow view open' : 'Presenter only';
}
