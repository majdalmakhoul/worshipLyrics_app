/* ================================================================
   ENTRY POINT & EVENT WIRING
================================================================ */
let AppMenuLastFocus = null;
let DevAccessPromptResolve = null;
let DevAccessLastFocus = null;
let DevAccessRequestRunning = false;

function appMenuIsOpen() {
  return document.getElementById('appMenu')?.classList.contains('active');
}

function appMenuOpen() {
  const menu = document.getElementById('appMenu');
  const drawer = menu?.querySelector('.app-menu__drawer');
  const openBtn = document.getElementById('appMenuOpenBtn');
  const closeBtn = document.getElementById('appMenuCloseBtn');
  if(!menu) return;

  AppMenuLastFocus = document.activeElement;
  drawer?.removeAttribute('inert');
  menu.classList.add('active');
  menu.setAttribute('aria-hidden', 'false');
  openBtn?.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  closeBtn?.focus({ preventScroll: true });
}

function appMenuClose() {
  const menu = document.getElementById('appMenu');
  const drawer = menu?.querySelector('.app-menu__drawer');
  const openBtn = document.getElementById('appMenuOpenBtn');
  if(!menu) return;

  menu.classList.remove('active');
  menu.setAttribute('aria-hidden', 'true');
  drawer?.setAttribute('inert', '');
  openBtn?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';

  if(AppMenuLastFocus && typeof AppMenuLastFocus.focus === 'function') {
    AppMenuLastFocus.focus({ preventScroll: true });
  }
  AppMenuLastFocus = null;
}

function closeScreenPickerDropdowns() {
  document.querySelectorAll('.screen-picker__dropdown').forEach(dropdown => dropdown.classList.remove('open'));
}

function devAccessPromptIsOpen() {
  return document.getElementById('devAccessPrompt')?.classList.contains('active');
}

function devAccessOpen(errorText = '') {
  const prompt = document.getElementById('devAccessPrompt');
  const input = document.getElementById('devAccessToken');
  const error = document.getElementById('devAccessError');
  if(!prompt || !input) return Promise.resolve(null);

  DevAccessLastFocus = document.activeElement;
  input.value = '';
  if(error) error.textContent = errorText;
  prompt.classList.add('active');
  document.body.style.overflow = 'hidden';
  input.focus({ preventScroll: true });

  return new Promise(resolve => {
    DevAccessPromptResolve = resolve;
  });
}

function devAccessClose(token = null) {
  document.getElementById('devAccessPrompt')?.classList.remove('active');
  if(!document.getElementById('devPanel')?.classList.contains('active')) document.body.style.overflow = '';

  const resolve = DevAccessPromptResolve;
  DevAccessPromptResolve = null;
  if(resolve) resolve(token);

  if(DevAccessLastFocus && typeof DevAccessLastFocus.focus === 'function') {
    DevAccessLastFocus.focus({ preventScroll: true });
  }
  DevAccessLastFocus = null;
}

function devAccessSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('devAccessToken');
  const error = document.getElementById('devAccessError');
  const token = input?.value.trim() || '';
  if(!token) {
    if(error) error.textContent = 'Enter the modification password.';
    input?.focus({ preventScroll: true });
    return;
  }
  devAccessClose(token);
}

function devAccessCancel() {
  devAccessClose(null);
}

async function openDevPanelWithAccess() {
  if(DevAccessRequestRunning) return;
  if(typeof devOpen !== 'function') return;

  if(document.getElementById('devPanel')?.classList.contains('active')) {
    devClose();
    return;
  }

  if(appMenuIsOpen()) appMenuClose();

  DevAccessRequestRunning = true;
  let errorText = '';

  try {
    for(let attempt = 0; attempt < 2; attempt++) {
      const token = await devAccessOpen(errorText);
      if(!token) return;

      const accepted = await sharedSongsVerifyAdminToken(token);
      if(accepted) {
        sharedSongsSetAdminToken(token);
        if(typeof devGrantAccessForNextOpen === 'function') devGrantAccessForNextOpen();
        devOpen();
        return;
      }

      sharedSongsClearAdminToken();
      errorText = 'Password was not accepted.';
    }

    showToast('Password was not accepted.');
  } catch(err) {
    console.error(err);
    sharedSongsClearAdminToken();
    showToast(err?.message || 'Could not verify the modification password.');
  } finally {
    DevAccessRequestRunning = false;
  }
}

function handleGlobalKeydown(e) {
  if(document.getElementById('slideshow').classList.contains('active')) {
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); ssStep(1); }
    else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); ssStep(-1); }
    else if(e.key === 'Escape') ssClose();
    return;
  }

  if(e.key === 'Escape' && appMenuIsOpen()) {
    appMenuClose();
    return;
  }

  if(e.key === 'Escape' && devAccessPromptIsOpen()) {
    devAccessCancel();
    return;
  }

  if(e.key === 'Escape' && document.getElementById('appearancePanel')?.classList.contains('active')) {
    appearanceClose();
    return;
  }

  if(e.key === 'Escape' && document.getElementById('lyricsLangPrompt')?.classList.contains('active')) {
    cancelLyricsPromptLang();
    return;
  }

  if(e.key === 'Escape' && document.getElementById('devPanel').classList.contains('active')) {
    devClose();
    return;
  }

}

function handleFullscreenChange() {
  if(!document.fullscreenElement) {
    document.getElementById('slideshow').classList.remove('active');
    document.body.style.overflow = '';
    projClose();
    return;
  }
  ssScheduleFit();
}

function wireAppMenuControls() {
  document.getElementById('appMenuOpenBtn')?.addEventListener('click', appMenuOpen);
  document.getElementById('appMenuCloseBtn')?.addEventListener('click', appMenuClose);
  document.getElementById('appMenuScrim')?.addEventListener('click', appMenuClose);
}

function wireDevAccessControls() {
  document.getElementById('devAccessBtn')?.addEventListener('click', openDevPanelWithAccess);
  document.getElementById('devAccessForm')?.addEventListener('submit', devAccessSubmit);
  document.getElementById('devAccessCancel')?.addEventListener('click', devAccessCancel);
  document.getElementById('devAccessPrompt')?.addEventListener('click', e => {
    if(e.target.id === 'devAccessPrompt') devAccessCancel();
  });
}

function wireSearchControls() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearBtn');

  searchInput.addEventListener('input', e => {
    currentPage = 1;
    clearBtn.classList.toggle('visible', e.target.value.length > 0);
    render();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentPage = 1;
    render();
    clearBtn.classList.remove('visible');
  });
}

function wireSlideshowControls() {
  document.querySelector('.ss-close')?.addEventListener('click', ssClose);
  document.querySelector('.ss-pane--current')?.addEventListener('click', ssAdv);
  document.getElementById('ssPrev')?.addEventListener('click', e => ssStep(-1, e));
  document.getElementById('ssNextBtn')?.addEventListener('click', e => ssStep(1, e));
  window.addEventListener('resize', ssScheduleFit);
  window.addEventListener('orientationchange', ssScheduleFit);
}

function handleDevSaveClick() {
  try {
    const result = devSaveSong();
    if(result?.catch) {
      result.catch(err => {
        console.error(err);
        showToast('Could not save song.');
      });
    }
  } catch(err) {
    console.error(err);
    showToast('Could not save song.');
  }
}

function wireDevPanelControls() {
  document.querySelector('.dev-modal__close')?.addEventListener('click', devClose);
  document.getElementById('devTabAdd')?.addEventListener('click', () => devSwitchTab('add'));
  document.getElementById('devTabManage')?.addEventListener('click', () => devSwitchTab('manage'));
  document.getElementById('devSaveTop')?.addEventListener('click', handleDevSaveClick);
  document.getElementById('devSaveFooter')?.addEventListener('click', handleDevSaveClick);
  document.getElementById('devResetBtn')?.addEventListener('click', devResetForm);
  document.getElementById('devJsonFileBtn')?.addEventListener('click', devConnectJsonFile);
  document.getElementById('devExportBtn')?.addEventListener('click', devExport);
  document.getElementById('devAddSlideBtn')?.addEventListener('click', () => devAddSlide());
  if(typeof pptxChooseFile === 'function' && typeof handlePptxImport === 'function') {
    document.getElementById('btnImportPptx')?.addEventListener('click', pptxChooseFile);
    document.getElementById('pptxFileInput')?.addEventListener('change', handlePptxImport);
  } else {
    document.querySelector('.pptx-import')?.classList.add('is-hidden');
  }
  document.getElementById('fMainLang')?.addEventListener('change', () => {
    devSyncLanguageOptions();
    switchSmartLangTo(document.getElementById('fMainLang').value);
  });
  document.getElementById('fHasArabizi')?.addEventListener('change', devSyncLanguageOptions);
  document.getElementById('btnParse')?.addEventListener('click', runSmartParse);
  document.getElementById('lyricsLangPromptConfirm')?.addEventListener('click', confirmLyricsPromptLang);
  document.getElementById('lyricsLangPromptCancel')?.addEventListener('click', cancelLyricsPromptLang);

  document.getElementById('smartLangTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('[data-smart-lang]');
    if(!tab) return;
    switchSmartLang(tab.dataset.smartLang, tab);
  });
}

async function initApp() {
  wireAppMenuControls();
  wireDevAccessControls();
  wireAppearanceControls();
  wirePwaControls();
  wireSearchControls();
  wireSlideshowControls();
  wireDevPanelControls();
  document.addEventListener('click', closeScreenPickerDropdowns);
  window.addEventListener('keydown', handleGlobalKeydown, { capture: true });
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  const loadedSharedSongs = await dbLoadFromSharedStore();
  if(!loadedSharedSongs) await dbLoadFromJsonFile();
  buildLangFilter();
  render();
  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', initApp);
