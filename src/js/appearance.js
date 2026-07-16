/* ================================================================
   USER APPEARANCE SETTINGS
================================================================ */
const APPEARANCE_KEY = 'worship_appearance_v1';
const APPEARANCE_DEFAULT = {
  theme: 'classic',
  font: 'elegant',
  density: 'comfortable',
  design: 'soft'
};

const APPEARANCE_GROUPS = [
  {
    key: 'theme',
    label: 'Theme',
    choices: [
      { value:'classic', label:'Classic', swatches:['#8BBFC4', '#1a2e40', '#ffffff'] },
      { value:'garden', label:'Garden', swatches:['#66a182', '#44346b', '#fffaf2'] },
      { value:'rosewood', label:'Rosewood', swatches:['#b45f76', '#28545a', '#fff8fb'] },
      { value:'night', label:'Night', swatches:['#d7c66f', '#11120f', '#f7f1d7'] }
    ]
  },
  {
    key: 'font',
    label: 'Fonts',
    choices: [
      { value:'elegant', label:'Elegant', sample:'Aa' },
      { value:'modern', label:'Modern', sample:'Aa' },
      { value:'readable', label:'Readable', sample:'Aa' },
      { value:'serif', label:'Serif', sample:'Aa' }
    ]
  },
  {
    key: 'density',
    label: 'Spacing',
    choices: [
      { value:'compact', label:'Compact', sample:'III' },
      { value:'comfortable', label:'Comfort', sample:'II' },
      { value:'large', label:'Large', sample:'I' }
    ]
  },
  {
    key: 'design',
    label: 'Cards',
    choices: [
      { value:'soft', label:'Soft', sample:'[]' },
      { value:'outlined', label:'Outlined', sample:'||' },
      { value:'plain', label:'Plain', sample:'_' }
    ]
  }
];

let Appearance = appearanceLoad();
appearanceApply(Appearance);

function appearanceLoad() {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    return appearanceNormalize(raw ? JSON.parse(raw) : APPEARANCE_DEFAULT);
  } catch(e) {
    return { ...APPEARANCE_DEFAULT };
  }
}

function appearanceNormalize(settings) {
  const normalized = { ...APPEARANCE_DEFAULT, ...settings };
  for(const group of APPEARANCE_GROUPS) {
    if(!group.choices.some(choice => choice.value === normalized[group.key])) {
      normalized[group.key] = APPEARANCE_DEFAULT[group.key];
    }
  }
  return normalized;
}

function appearanceSave() {
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(Appearance));
}

function appearanceApply(settings = Appearance) {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.font = settings.font;
  root.dataset.density = settings.density;
  root.dataset.design = settings.design;
}

function appearanceOpen() {
  appearanceRenderControls();
  document.getElementById('appearancePanel')?.classList.add('active');
}

function appearanceClose() {
  document.getElementById('appearancePanel')?.classList.remove('active');
}

function appearanceReset() {
  Appearance = { ...APPEARANCE_DEFAULT };
  appearanceSave();
  appearanceApply();
  appearanceRenderControls();
}

function appearanceSet(key, value) {
  const group = APPEARANCE_GROUPS.find(item => item.key === key);
  if(!group || !group.choices.some(choice => choice.value === value)) return;
  Appearance = { ...Appearance, [key]: value };
  appearanceSave();
  appearanceApply();
  appearanceRenderControls();
}

function appearanceRenderControls() {
  const el = document.getElementById('appearanceOptions');
  if(!el) return;

  el.innerHTML = APPEARANCE_GROUPS.map(group => `
    <section class="appearance-group">
      <div class="appearance-group__label">${group.label}</div>
      <div class="appearance-group__choices">
        ${group.choices.map(choice => appearanceChoiceHTML(group, choice)).join('')}
      </div>
    </section>
  `).join('');
}

function appearanceChoiceHTML(group, choice) {
  const active = Appearance[group.key] === choice.value;
  return `<button class="appearance-choice${active ? ' active' : ''}"
                  type="button"
                  aria-pressed="${active}"
                  onclick="appearanceSet('${group.key}','${choice.value}')">
    ${choice.swatches ? appearanceSwatchesHTML(choice.swatches) : `<span class="appearance-choice__sample">${choice.sample}</span>`}
    <span class="appearance-choice__label">${choice.label}</span>
  </button>`;
}

function appearanceSwatchesHTML(swatches) {
  return `<span class="appearance-choice__swatches">
    ${swatches.map(color => `<span style="background:${color}"></span>`).join('')}
  </span>`;
}

function wireAppearanceControls() {
  document.getElementById('appearanceOpenBtn')?.addEventListener('click', appearanceOpen);
  document.getElementById('appearanceCloseBtn')?.addEventListener('click', appearanceClose);
  document.getElementById('appearanceDoneBtn')?.addEventListener('click', appearanceClose);
  document.getElementById('appearanceResetBtn')?.addEventListener('click', appearanceReset);
}
