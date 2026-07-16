let Proj = { win:null, active:false };

/* Screen state */
let Screens = { list:[], chosen:null, permAsked:false };

/* ================================================================
   SCREEN DETECTION  ? Window Management API  (Chrome 100+)
   Falls back silently; picker shows only when >1 screen found.
================================================================ */
async function screensRequestPermission() {
  if (!('getScreenDetails' in window)) return;
  try {
    const details = await window.getScreenDetails();
    Screens.list    = Array.from(details.screens);
    Screens.chosen  = Screens.chosen || details.screens.find(s => !s.isPrimary) || details.screens.find(s => s.isPrimary) || details.screens[0];
    Screens.permAsked = true;
    details.addEventListener('screenschange', () => {
      Screens.list   = Array.from(details.screens);
      if (!Screens.list.includes(Screens.chosen)) {
        Screens.chosen = details.screens.find(s => !s.isPrimary) || details.screens.find(s => s.isPrimary) || details.screens[0];
      }
      render(); // refresh screen pickers
    });
  } catch(e) {
    Screens.permAsked = true; // permission denied ? won't ask again
  }
}

function screenLabel(scr) {
  if (scr.label && scr.label.trim()) return scr.label;
  const tag = scr.isPrimary ? 'Primary' : 'External';
  return `${tag} display`;
}

function screenResolution(scr) {
  if(!scr) return `${window.screen.width}x${window.screen.height}`;
  return `${scr.width || window.screen.width}x${scr.height || window.screen.height}`;
}

function screenPosition(scr) {
  if(!scr) return 'current browser display';
  const left = Number.isFinite(scr.availLeft) ? scr.availLeft : scr.left;
  const top = Number.isFinite(scr.availTop) ? scr.availTop : scr.top;
  return `position ${left || 0}, ${top || 0}`;
}

/* ================================================================
   PROJECTION WINDOW
================================================================ */
function projOpen() {
  if(Proj.win && !Proj.win.closed) Proj.win.close();

  let left=window.screenX + 80, top=window.screenY + 80, w=1280, h=720;
  if(Screens.list.length>1 && Screens.chosen) {
    left=Number.isFinite(Screens.chosen.availLeft) ? Screens.chosen.availLeft : Screens.chosen.left;
    top=Number.isFinite(Screens.chosen.availTop) ? Screens.chosen.availTop : Screens.chosen.top;
    w=Screens.chosen.availWidth || Screens.chosen.width;
    h=Screens.chosen.availHeight || Screens.chosen.height;
  } else if(Screens.permAsked && Screens.list.length === 1 && Screens.list[0]) {
    left=Number.isFinite(Screens.list[0].availLeft) ? Screens.list[0].availLeft : Screens.list[0].left;
    top=Number.isFinite(Screens.list[0].availTop) ? Screens.list[0].availTop : Screens.list[0].top;
    w=Screens.list[0].availWidth || Screens.list[0].width;
    h=Screens.list[0].availHeight || Screens.list[0].height;
  }

  Proj.win = window.open('','worship-proj',
    `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=yes`);

  if(!Proj.win) {
    showToast('Pop-up blocked - allow pop-ups and try again');
    return;
  }

  Proj.active = true;
  Proj.win.document.open();
  Proj.win.document.write(projHTML());
  Proj.win.document.close();
  try {
    Proj.win.moveTo(left, top);
    Proj.win.resizeTo(w, h);
  } catch(e) {}

  // Push first slide after fonts load, then request fullscreen
  setTimeout(() => {
    if(Proj.win && !Proj.win.closed) {
      projPush();
      try { Proj.win.document.documentElement.requestFullscreen?.(); } catch(e){}
    }
  }, 900);

  const poll = setInterval(()=>{
    if(Proj.win?.closed){ Proj.active=false; Proj.win=null; clearInterval(poll); }
  }, 1000);
}

function projClose() {
  Proj.active=false;
  if(Proj.win && !Proj.win.closed) Proj.win.close();
  Proj.win=null;
}

function projPush() {
  if(!Proj.win||Proj.win.closed){ projClose(); return; }
  Proj.win.postMessage({
    type:'slide',
    text:SS.slides[SS.index],
    rtl:SS.lang==='arabic',
    label:SS.song.showLabels ? slideSectionLabel(SS.song, SS.index) : '',
    scale:typeof appearanceLyricsScale === 'function' ? appearanceLyricsScale() : 1
  }, '*');
}

function projCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return (value || fallback).replace(/[<>]/g, '');
}

function projHTML() {
  const bg = projCssVar('--projection-bg', '#1a2e40');
  const text = projCssVar('--projection-text', '#ffffff');
  const muted = projCssVar('--projection-muted', 'rgba(255,255,255,.62)');
  const lyricFont = projCssVar('--font-lyrics', "'Cormorant Garamond', serif");
  const arabicFont = projCssVar('--font-arabic', "'Cormorant Garamond', serif");
  const lyricScale = Math.min(1.5, Math.max(0.7, Number(projCssVar('--lyrics-size-scale', '1')) || 1));
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:${bg};display:flex;flex-direction:column;gap:2rem;align-items:center;justify-content:center;overflow:hidden;cursor:none}
  #label{display:none;font-family:Arial,sans-serif;font-size:clamp(.9rem,1.6vw,1.4rem);font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${muted}}
  #label.visible{display:block}
  #s{font-family:${lyricFont};font-size:clamp(2.2rem,5.5vw,5rem);color:${text};text-align:center;line-height:1.75;white-space:pre-line;max-width:88%;overflow-wrap:anywhere;transition:opacity .2s ease}
  #s.rtl{direction:rtl;font-family:${arabicFont}}
</style></head><body>
<div id="label"></div>
<div id="s">&#9834;</div>
<script>
  const el=document.getElementById('s');
  const label=document.getElementById('label');
  let lyricScale=${lyricScale};
  function fitSlide(){
    const labelVisible=label.classList.contains('visible');
    const labelHeight=labelVisible?label.getBoundingClientRect().height+Math.max(12,window.innerHeight*.025):0;
    const marginX=Math.max(32,Math.min(120,window.innerWidth*.08));
    const marginY=Math.max(28,Math.min(96,window.innerHeight*.08));
    const maxWidth=Math.max(220,window.innerWidth-(marginX*2));
    const maxHeight=Math.max(120,window.innerHeight-(marginY*2)-labelHeight);
    const languageMax=el.classList.contains('rtl')?86:80;
    const preferred=Math.max(18,Math.min(languageMax*lyricScale,window.innerWidth*.13*lyricScale,window.innerHeight*.16*lyricScale));
    const minSize=Math.max(14,Math.min(26,Math.min(window.innerWidth,window.innerHeight)*.04));
    el.style.maxWidth=maxWidth+'px';
    el.style.fontSize=preferred+'px';
    let low=minSize;
    let high=Math.max(minSize,preferred);
    let best=minSize;
    for(let i=0;i<12;i++){
      const mid=(low+high)/2;
      el.style.fontSize=mid+'px';
      const fits=el.scrollWidth<=maxWidth+1&&el.scrollHeight<=maxHeight+1;
      if(fits){best=mid;low=mid;}else{high=mid;}
    }
    el.style.fontSize=Math.floor(best)+'px';
  }
  window.addEventListener('load',()=>{ try{document.documentElement.requestFullscreen();}catch(e){} fitSlide(); });
  window.addEventListener('resize',fitSlide);
  window.addEventListener('message',e=>{
    if(!e.data||e.data.type!=='slide')return;
    el.style.opacity='0';
    setTimeout(()=>{
      lyricScale=Number(e.data.scale)||lyricScale;
      label.textContent=e.data.label||'';
      label.classList.toggle('visible',!!e.data.label);
      el.textContent=e.data.text;
      el.classList.toggle('rtl',!!e.data.rtl);
      fitSlide();
      el.style.opacity='1';
    },180);
  });
<\/script></body></html>`;
}
