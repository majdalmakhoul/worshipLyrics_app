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
    label:SS.song.showLabels ? slideSectionLabel(SS.song, SS.index) : ''
  }, '*');
}

function projHTML() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:#1a2e40;display:flex;flex-direction:column;gap:2rem;align-items:center;justify-content:center;overflow:hidden;cursor:none}
  #label{display:none;font-family:Arial,sans-serif;font-size:clamp(.9rem,1.6vw,1.4rem);font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.58)}
  #label.visible{display:block}
  #s{font-family:'Cormorant Garamond',serif;font-size:clamp(2.2rem,5.5vw,5rem);color:#fff;text-align:center;line-height:1.75;white-space:pre-line;max-width:88%;padding:2rem;transition:opacity .2s ease}
  #s.rtl{direction:rtl}
</style></head><body>
<div id="label"></div>
<div id="s">&#9834;</div>
<script>
  const el=document.getElementById('s');
  const label=document.getElementById('label');
  window.addEventListener('load',()=>{ try{document.documentElement.requestFullscreen();}catch(e){} });
  window.addEventListener('message',e=>{
    if(!e.data||e.data.type!=='slide')return;
    el.style.opacity='0';
    setTimeout(()=>{
      label.textContent=e.data.label||'';
      label.classList.toggle('visible',!!e.data.label);
      el.textContent=e.data.text;
      el.classList.toggle('rtl',!!e.data.rtl);
      el.style.opacity='1';
    },180);
  });
<\/script></body></html>`;
}
