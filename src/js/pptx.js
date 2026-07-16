/* ================================================================
   POWERPOINT IMPORT
================================================================ */
const PPTX_DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const PPTX_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
let pendingPptxLang = null;

async function pptxChooseFile() {
  const lang = await askLyricsTargetLang('Import PowerPoint');
  if(!lang) return;
  pendingPptxLang = lang;
  document.getElementById('pptxFileInput')?.click();
}

async function handlePptxImport(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if(!file) return;

  const btn = document.getElementById('btnImportPptx');
  const meta = document.getElementById('pptxImportMeta');
  const previousMeta = meta?.textContent || '';

  try {
    if(btn) btn.disabled = true;
    if(meta) meta.textContent = 'Reading PowerPoint...';

    if(!/\.pptx$/i.test(file.name)) {
      if(meta) meta.textContent = previousMeta;
      showToast('Choose a .pptx PowerPoint file.');
      return;
    }

    const slides = await pptxExtractSlides(file);
    if(!slides.length || !slides.some(slide => slide.trim())) {
      if(meta) meta.textContent = previousMeta;
      showToast('No slide text found in that PowerPoint.');
      return;
    }

    if(!pptxCanReplaceBuilder()) {
      const ok = confirm(`Replace current slide builder with ${slides.length} PowerPoint slide${slides.length === 1 ? '' : 's'}?`);
      if(!ok) {
        if(meta) meta.textContent = previousMeta;
        return;
      }
    }

    const lang = pendingPptxLang || await askLyricsTargetLang('Import PowerPoint');
    pendingPptxLang = null;
    if(!lang) {
      if(meta) meta.textContent = previousMeta;
      return;
    }
    pptxActivateSmartLang(lang);
    pptxPopulateBuilder(slides, lang, file.name);

    if(meta) meta.textContent = `${slides.length} slide${slides.length === 1 ? '' : 's'} imported into ${LANG_LABELS[lang]}.`;
    showToast(`Imported ${slides.length} PowerPoint slide${slides.length === 1 ? '' : 's'}`);
  } catch(err) {
    console.error(err);
    showToast(pptxErrorMessage(err));
    if(meta) meta.textContent = previousMeta;
  } finally {
    pendingPptxLang = null;
    if(btn) btn.disabled = false;
  }
}

function pptxCanReplaceBuilder() {
  if(typeof devCanReplaceSlidesBuilder === 'function') return devCanReplaceSlidesBuilder();
  const entries = Array.from(document.querySelectorAll('.slide-entry'));
  if(entries.length === 0) return true;
  return entries.every(entry => LANG_ORDER.every(lang => {
    const field = entry.querySelector(`[data-field="${lang}"]`);
    return !field || !field.value.trim();
  }));
}

function pptxActivateSmartLang(lang) {
  if(typeof switchSmartLangTo === 'function') {
    switchSmartLangTo(lang);
    return;
  }
  const tab = document.querySelector(`[data-smart-lang="${lang}"]`);
  if(tab && smartActiveLang !== lang) switchSmartLang(lang, tab);
}

function pptxPopulateBuilder(slides, lang, fileName) {
  if(typeof devPopulateSlidesForLang === 'function') devPopulateSlidesForLang(slides, lang);
  else {
    document.getElementById('slidesBuilder').innerHTML = '';
    devSlideCount = 0;

    for(const slide of slides) {
      const data = { arabizi:'', arabic:'', en:'', fr:'', section:'verse' };
      data[lang] = slide;
      devAddSlide(data);
    }
  }

  const titleField = document.getElementById(pptxTitleFieldId(lang));
  if(titleField && !titleField.value.trim()) titleField.value = pptxTitleFromFileName(fileName);

  devSyncLanguageOptions();
}

function pptxTitleFieldId(lang) {
  return ({ arabizi:'fArabizi', arabic:'fArabic', en:'fEn', fr:'fFr' })[lang] || 'fArabizi';
}

function pptxTitleFromFileName(name) {
  return String(name || 'Imported PowerPoint')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Imported PowerPoint';
}

function pptxErrorMessage(err) {
  if(err?.message?.includes('deflate')) {
    return 'This browser cannot unzip that PowerPoint file.';
  }
  if(err?.message?.includes('encrypted')) {
    return 'Encrypted PowerPoint files are not supported.';
  }
  return 'Could not import that PowerPoint file.';
}

async function pptxExtractSlides(file) {
  const zip = pptxOpenZip(await file.arrayBuffer());
  const paths = await pptxSlidePaths(zip);
  const slides = [];

  for(const path of paths) {
    const xml = await zip.text(path);
    slides.push(pptxSlideText(xml));
  }

  return slides;
}

async function pptxSlidePaths(zip) {
  try {
    const presentationXml = await zip.text('ppt/presentation.xml');
    const relsXml = await zip.text('ppt/_rels/presentation.xml.rels');
    const presentation = pptxParseXml(presentationXml);
    const rels = pptxPresentationRelationships(relsXml);
    const orderedPaths = Array.from(presentation.getElementsByTagName('*'))
      .filter(el => pptxLocalName(el) === 'sldId')
      .map(el => el.getAttributeNS(PPTX_REL_NS, 'id') || el.getAttribute('r:id'))
      .map(id => rels.get(id))
      .filter(path => path && zip.has(path));

    if(orderedPaths.length) return orderedPaths;
  } catch(e) {}

  return zip.list('ppt/slides/')
    .filter(path => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((a, b) => pptxSlideNumber(a) - pptxSlideNumber(b));
}

function pptxPresentationRelationships(xml) {
  const doc = pptxParseXml(xml);
  const map = new Map();

  Array.from(doc.getElementsByTagName('*'))
    .filter(el => pptxLocalName(el) === 'Relationship')
    .forEach(el => {
      const id = el.getAttribute('Id');
      const type = el.getAttribute('Type') || '';
      const target = el.getAttribute('Target') || '';
      if(id && target && /\/slide$/i.test(type)) {
        map.set(id, pptxResolvePath('ppt', target));
      }
    });

  return map;
}

function pptxResolvePath(base, target) {
  if(target.startsWith('/')) return target.replace(/^\/+/, '');
  const parts = `${base}/${target}`.split('/');
  const out = [];

  for(const part of parts) {
    if(!part || part === '.') continue;
    if(part === '..') out.pop();
    else out.push(part);
  }

  return out.join('/');
}

function pptxSlideNumber(path) {
  return Number(path.match(/slide(\d+)\.xml$/i)?.[1] || 0);
}

function pptxSlideText(xml) {
  const doc = pptxParseXml(xml);
  const paragraphs = Array.from(doc.getElementsByTagNameNS(PPTX_DRAWING_NS, 'p'));
  const lines = [];

  for(const paragraph of paragraphs) {
    const line = pptxParagraphText(paragraph).trim();
    if(line) lines.push(line);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function pptxParagraphText(paragraph) {
  const parts = [];

  function walk(node) {
    if(node.nodeType !== Node.ELEMENT_NODE) return;
    if(node.namespaceURI === PPTX_DRAWING_NS && pptxLocalName(node) === 't') {
      parts.push(node.textContent || '');
      return;
    }
    if(node.namespaceURI === PPTX_DRAWING_NS && pptxLocalName(node) === 'br') {
      parts.push('\n');
    }
    Array.from(node.childNodes).forEach(walk);
  }

  walk(paragraph);
  return parts.join('').replace(/\u000b/g, '\n');
}

function pptxParseXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if(doc.getElementsByTagName('parsererror').length) {
    throw new Error('PowerPoint XML could not be parsed.');
  }
  return doc;
}

function pptxLocalName(el) {
  return el.localName || el.nodeName.split(':').pop();
}

function pptxOpenZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const eocd = pptxFindEndOfCentralDirectory(view);
  const totalEntries = view.getUint16(eocd + 10, true);
  const centralDirectoryOffset = view.getUint32(eocd + 16, true);
  const entries = new Map();
  let offset = centralDirectoryOffset;

  for(let i = 0; i < totalEntries; i++) {
    if(view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('Invalid PowerPoint zip directory.');
    }

    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    const path = new TextDecoder('utf-8').decode(bytes.slice(nameStart, nameEnd)).replace(/\\/g, '/');

    entries.set(path, { flags, method, compressedSize, localHeaderOffset });
    offset = nameEnd + extraLength + commentLength;
  }

  return {
    has(path) {
      return entries.has(path);
    },
    list(prefix = '') {
      return Array.from(entries.keys()).filter(path => path.startsWith(prefix));
    },
    async text(path) {
      const entry = entries.get(path);
      if(!entry) throw new Error(`Missing PowerPoint file: ${path}`);
      const data = await pptxZipEntryBytes(view, bytes, entry);
      return new TextDecoder('utf-8').decode(data);
    }
  };
}

function pptxFindEndOfCentralDirectory(view) {
  const min = Math.max(0, view.byteLength - 0xffff - 22);
  for(let offset = view.byteLength - 22; offset >= min; offset--) {
    if(view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error('Invalid PowerPoint file.');
}

async function pptxZipEntryBytes(view, bytes, entry) {
  if(entry.flags & 1) throw new Error('PowerPoint file is encrypted.');
  if(view.getUint32(entry.localHeaderOffset, true) !== 0x04034b50) {
    throw new Error('Invalid PowerPoint zip entry.');
  }

  const fileNameLength = view.getUint16(entry.localHeaderOffset + 26, true);
  const extraLength = view.getUint16(entry.localHeaderOffset + 28, true);
  const dataStart = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);

  if(entry.method === 0) return compressed;
  if(entry.method === 8) return pptxInflateRaw(compressed);
  throw new Error('Unsupported PowerPoint zip compression.');
}

async function pptxInflateRaw(bytes) {
  if(!('DecompressionStream' in window)) {
    throw new Error('deflate-raw decompression is not available.');
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
