/* ================================================================
   ENTRY POINT & EVENT WIRING
================================================================ */
function closeScreenPickerDropdowns() {
  document.querySelectorAll('.screen-picker__dropdown').forEach(dropdown => dropdown.classList.remove('open'));
}

function handleGlobalKeydown(e) {
  if(document.getElementById('slideshow').classList.contains('active')) {
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); ssStep(1); }
    else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); ssStep(-1); }
    else if(e.key === 'Escape') ssClose();
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

  if((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    document.getElementById('devPanel').classList.contains('active') ? devClose() : devOpen();
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
  wireAppearanceControls();
  wirePwaControls();
  wireSearchControls();
  wireSlideshowControls();
  wireDevPanelControls();
  document.addEventListener('click', closeScreenPickerDropdowns);
  document.addEventListener('keydown', handleGlobalKeydown);
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  const loadedSharedSongs = await dbLoadFromSharedStore();
  if(!loadedSharedSongs) await dbLoadFromJsonFile();
  buildLangFilter();
  render();
  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', initApp);
