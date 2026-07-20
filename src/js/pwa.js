/* ================================================================
   INSTALLABLE WEB APP
================================================================ */
let DeferredInstallPrompt = null;

function pwaIsStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function pwaIsIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function pwaCanShowInstallButton() {
  return !pwaIsStandalone() && (!!DeferredInstallPrompt || pwaIsIos());
}

function pwaUpdateInstallButton() {
  const btn = document.getElementById('pwaInstallBtn');
  if(!btn) return;
  btn.hidden = !pwaCanShowInstallButton();
}

function pwaOpenIosInstallGuide() {
  const guide = document.getElementById('iosInstallGuide');
  if(!guide) {
    showToast('On iPhone or iPad, use Share, then Add to Home Screen.');
    return;
  }
  guide.classList.add('active');
}

function pwaCloseIosInstallGuide() {
  document.getElementById('iosInstallGuide')?.classList.remove('active');
}

async function pwaInstallClick() {
  if(DeferredInstallPrompt) {
    DeferredInstallPrompt.prompt();
    const choice = await DeferredInstallPrompt.userChoice;
    DeferredInstallPrompt = null;
    pwaUpdateInstallButton();
    if(choice?.outcome === 'accepted') showToast('App installed.');
    return;
  }

  if(pwaIsIos()) {
    pwaOpenIosInstallGuide();
  }
}

function wirePwaControls() {
  document.getElementById('pwaInstallBtn')?.addEventListener('click', pwaInstallClick);
  document.getElementById('iosInstallCloseBtn')?.addEventListener('click', pwaCloseIosInstallGuide);
  document.getElementById('iosInstallGuide')?.addEventListener('click', e => {
    if(e.target.id === 'iosInstallGuide') pwaCloseIosInstallGuide();
  });

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    DeferredInstallPrompt = e;
    pwaUpdateInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    DeferredInstallPrompt = null;
    pwaUpdateInstallButton();
    showToast('App installed.');
  });

  pwaUpdateInstallButton();
}

function registerServiceWorker() {
  if(!('serviceWorker' in navigator)) return;
  if(location.protocol === 'file:') return;

  navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(err => {
    console.warn('Service worker registration failed.', err);
  });
}
