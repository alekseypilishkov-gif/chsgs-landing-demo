export type DebugViewMode = 'clay' | 'lit';
export type DebugModelSettings = {
  viewMode: DebugViewMode;
  original: boolean;
  ao: boolean;
  normals: boolean;
  reveal: boolean;
  accent: boolean;
  keyIntensity: number;
  accentIntensity: number;
};
export type DebugCupSettings = {
  yStart: number;
  yEnd: number;
  copyYStart: number;
  copyYEnd: number;
  x: number;
  scale: number;
  response: number;
  scrubStart: number;
  scrubEnd: number;
};
export type DebugThemeSettings = {
  windowEmissiveColor: string;
  windowEmissiveIntensity: number;
};
const DEBUG_STORAGE_KEY = 'chsgs-debug-model';
const DEBUG_CUP_STORAGE_KEY = 'chsgs-debug-cup-v2';
const DEBUG_THEME_STORAGE_KEY = 'chsgs-debug-theme';
const DEBUG_MODEL_PRESETS: Record<DebugViewMode, Omit<DebugModelSettings, 'viewMode'>> = {
  clay: { original: false, ao: true, normals: true, reveal: true, accent: false, keyIntensity: 2.8, accentIntensity: 140 },
  lit: { original: true, ao: false, normals: true, reveal: false, accent: true, keyIntensity: 4.4, accentIntensity: 380 },
};
export const DEBUG_CUP_DEFAULTS: DebugCupSettings = {
  yStart: -23,
  yEnd: 17,
  copyYStart: 3,
  copyYEnd: 11,
  x: -0.5,
  scale: 1,
  response: 10,
  scrubStart: 0,
  scrubEnd: 1,
};
export const DEBUG_THEME_DEFAULTS: DebugThemeSettings = {
  windowEmissiveColor: '#ffd39a',
  windowEmissiveIntensity: 2,
};
const CUP_KEYS = ['yStart', 'yEnd', 'copyYStart', 'copyYEnd', 'x', 'scale', 'response', 'scrubStart', 'scrubEnd'] as const;
const debugPanelInputs = (panel: HTMLElement) => Array.from(panel.querySelectorAll<HTMLInputElement>('input[data-debug]'));
const cupPanelInputs = (panel: HTMLElement) => Array.from(panel.querySelectorAll<HTMLInputElement>('input[data-cup]'));
const themePanelInputs = (panel: HTMLElement) => Array.from(panel.querySelectorAll<HTMLInputElement>('input[data-theme]'));
const readDebugInputs = (inputs: HTMLInputElement[]): DebugModelSettings => {
  const state: DebugModelSettings = { viewMode: 'clay', ...DEBUG_MODEL_PRESETS.clay };
  for (const input of inputs) {
    const key = input.dataset.debug;
    if (!key) continue;
    if (input.type === 'radio') {
      if (input.checked && (input.value === 'clay' || input.value === 'lit')) state.viewMode = input.value;
      continue;
    }
    if (input.type === 'range' && (key === 'keyIntensity' || key === 'accentIntensity')) {
      state[key] = Number(input.value);
      continue;
    }
    if (key === 'original' || key === 'ao' || key === 'normals' || key === 'reveal' || key === 'accent') state[key] = input.checked;
  }
  return state;
};
const writeDebugInputs = (inputs: HTMLInputElement[], state: DebugModelSettings): void => {
  for (const input of inputs) {
    const key = input.dataset.debug;
    if (!key) continue;
    if (input.type === 'radio') {
      input.checked = input.value === state.viewMode;
      continue;
    }
    if (input.type === 'range' && (key === 'keyIntensity' || key === 'accentIntensity')) {
      input.value = String(state[key]);
      continue;
    }
    if (key === 'original' || key === 'ao' || key === 'normals' || key === 'reveal' || key === 'accent') input.checked = state[key];
  }
};
const hydrateDebugState = (stored: Partial<DebugModelSettings> | null): DebugModelSettings => {
  const viewMode: DebugViewMode = stored?.viewMode === 'lit' ? 'lit' : 'clay';
  const base = { viewMode, ...DEBUG_MODEL_PRESETS[viewMode] };
  if (!stored) return base;
  return {
    viewMode,
    original: typeof stored.original === 'boolean' ? stored.original : base.original,
    ao: typeof stored.ao === 'boolean' ? stored.ao : base.ao,
    normals: typeof stored.normals === 'boolean' ? stored.normals : base.normals,
    reveal: typeof stored.reveal === 'boolean' ? stored.reveal : base.reveal,
    accent: typeof stored.accent === 'boolean' ? stored.accent : base.accent,
    keyIntensity: typeof stored.keyIntensity === 'number' && Number.isFinite(stored.keyIntensity) ? stored.keyIntensity : base.keyIntensity,
    accentIntensity: typeof stored.accentIntensity === 'number' && Number.isFinite(stored.accentIntensity) ? stored.accentIntensity : base.accentIntensity,
  };
};
const readCupInputs = (inputs: HTMLInputElement[]): DebugCupSettings => {
  const state = { ...DEBUG_CUP_DEFAULTS };
  for (const input of inputs) {
    const key = input.dataset.cup as typeof CUP_KEYS[number] | undefined;
    if (!key || !CUP_KEYS.includes(key)) continue;
    const value = Number(input.value);
    if (Number.isFinite(value)) state[key] = value;
  }
  return state;
};
const writeCupInputs = (inputs: HTMLInputElement[], state: DebugCupSettings): void => {
  for (const input of inputs) {
    const key = input.dataset.cup as typeof CUP_KEYS[number] | undefined;
    if (!key || !CUP_KEYS.includes(key)) continue;
    input.value = String(state[key]);
  }
};
const hydrateCupState = (stored: Partial<DebugCupSettings> | null): DebugCupSettings => {
  const state = { ...DEBUG_CUP_DEFAULTS };
  if (!stored) return state;
  for (const key of CUP_KEYS) {
    const value = stored[key];
    if (typeof value === 'number' && Number.isFinite(value)) state[key] = value;
  }
  return state;
};
const readThemeInputs = (inputs: HTMLInputElement[]): DebugThemeSettings => {
  const state = { ...DEBUG_THEME_DEFAULTS };
  for (const input of inputs) {
    if (input.dataset.theme === 'windowEmissiveColor' && /^#[0-9a-f]{6}$/i.test(input.value)) state.windowEmissiveColor = input.value;
    if (input.dataset.theme === 'windowEmissiveIntensity') {
      const value = Number(input.value);
      if (Number.isFinite(value)) state.windowEmissiveIntensity = value;
    }
  }
  return state;
};
const writeThemeInputs = (inputs: HTMLInputElement[], state: DebugThemeSettings): void => {
  for (const input of inputs) {
    if (input.dataset.theme === 'windowEmissiveColor') input.value = state.windowEmissiveColor;
    if (input.dataset.theme === 'windowEmissiveIntensity') input.value = String(state.windowEmissiveIntensity);
  }
};
const hydrateThemeState = (stored: Partial<DebugThemeSettings> | null): DebugThemeSettings => ({
  windowEmissiveColor: typeof stored?.windowEmissiveColor === 'string' && /^#[0-9a-f]{6}$/i.test(stored.windowEmissiveColor)
    ? stored.windowEmissiveColor
    : DEBUG_THEME_DEFAULTS.windowEmissiveColor,
  windowEmissiveIntensity: typeof stored?.windowEmissiveIntensity === 'number' && Number.isFinite(stored.windowEmissiveIntensity)
    ? Math.min(4, Math.max(0, stored.windowEmissiveIntensity))
    : DEBUG_THEME_DEFAULTS.windowEmissiveIntensity,
});
const formatRangeOutput = (input: HTMLInputElement): string => {
  const value = Number(input.value);
  const fraction = input.step.includes('.') ? input.step.replace(/^[0-9]*\./, '').length : 0;
  return fraction ? value.toFixed(fraction) : String(Math.round(value));
};
export function getDebugModelSettings(): DebugModelSettings {
  const panel = document.querySelector<HTMLElement>('#debug-panel');
  if (!panel) return { viewMode: 'clay', ...DEBUG_MODEL_PRESETS.clay };
  return readDebugInputs(debugPanelInputs(panel));
}
export function getDebugCupSettings(): DebugCupSettings {
  const panel = document.querySelector<HTMLElement>('#debug-panel');
  if (!panel) return { ...DEBUG_CUP_DEFAULTS };
  return readCupInputs(cupPanelInputs(panel));
}
export function getDebugThemeSettings(): DebugThemeSettings {
  const panel = document.querySelector<HTMLElement>('#debug-panel');
  if (!panel) return { ...DEBUG_THEME_DEFAULTS };
  return readThemeInputs(themePanelInputs(panel));
}

const DEBUG_TAB_STORAGE_KEY = 'chsgs-debug-tab';
type DebugTabId = 'model' | 'cup' | 'day_and_night';

export function debugDockMarkup(): string {
  return `
    <div class="debug-dock">
      <button id="debug-toggle" class="debug-dock__button" type="button" aria-label="Отладка" aria-expanded="false" aria-controls="debug-panel"></button>
      <div id="debug-panel" class="debug-dock__panel" hidden>
        <div class="debug-dock__tabs" role="tablist" aria-label="Отладка">
          <button class="debug-dock__tab" type="button" role="tab" id="debug-tab-model-btn" data-tab="model" aria-controls="debug-tab-model" aria-selected="true">Модель</button>
          <button class="debug-dock__tab" type="button" role="tab" id="debug-tab-cup-btn" data-tab="cup" aria-controls="debug-tab-cup" aria-selected="false" tabindex="-1">Кубок</button>
          <button class="debug-dock__tab" type="button" role="tab" id="debug-tab-day-and-night-btn" data-tab="day_and_night" aria-controls="debug-tab-day-and-night" aria-selected="false" tabindex="-1">day_and_night</button>
        </div>
        <div id="debug-tab-model" class="debug-dock__pane" role="tabpanel" aria-labelledby="debug-tab-model-btn">
          <fieldset class="debug-dock__group">
            <legend>Режим</legend>
            <div class="debug-dock__modes">
              <label class="debug-dock__mode"><input data-debug="viewMode" type="radio" name="debug-view-mode" value="clay" checked>Изначальный</label>
              <label class="debug-dock__mode"><input data-debug="viewMode" type="radio" name="debug-view-mode" value="lit">Подсветка</label>
            </div>
          </fieldset>
          <fieldset class="debug-dock__group">
            <legend>Модель</legend>
            <label class="debug-dock__row"><input data-debug="original" type="checkbox">Подсветка модели</label>
            <label class="debug-dock__row"><input data-debug="ao" type="checkbox" checked>Окклюзия</label>
            <label class="debug-dock__row"><input data-debug="normals" type="checkbox" checked>Карты нормалей</label>
            <label class="debug-dock__row"><input data-debug="reveal" type="checkbox" checked>Проявление курсором</label>
          </fieldset>
          <fieldset class="debug-dock__group">
            <legend>Свет</legend>
            <label class="debug-dock__row"><input data-debug="accent" type="checkbox">Источник света</label>
            <label class="debug-dock__slider"><span>Основной свет <output data-debug-output="keyIntensity">2.8</output></span><input data-debug="keyIntensity" type="range" min="0" max="6" step="0.05" value="2.8"></label>
            <label class="debug-dock__slider"><span>Свет курсора <output data-debug-output="accentIntensity">140</output></span><input data-debug="accentIntensity" type="range" min="0" max="400" step="5" value="140"></label>
          </fieldset>
        </div>
        <div id="debug-tab-cup" class="debug-dock__pane" role="tabpanel" aria-labelledby="debug-tab-cup-btn" hidden>
          <label class="debug-dock__slider"><span>Кубок вход Y <output data-cup-output="yStart">-23</output></span><input data-cup="yStart" type="range" min="-40" max="80" step="1" value="-23"></label>
          <label class="debug-dock__slider"><span>Кубок выход Y <output data-cup-output="yEnd">17</output></span><input data-cup="yEnd" type="range" min="-40" max="80" step="1" value="17"></label>
          <label class="debug-dock__slider"><span>Текст вход Y <output data-cup-output="copyYStart">3</output></span><input data-cup="copyYStart" type="range" min="-40" max="80" step="1" value="3"></label>
          <label class="debug-dock__slider"><span>Текст выход Y <output data-cup-output="copyYEnd">11</output></span><input data-cup="copyYEnd" type="range" min="-40" max="80" step="1" value="11"></label>
          <label class="debug-dock__slider"><span>Сдвиг X <output data-cup-output="x">-0.5</output></span><input data-cup="x" type="range" min="-20" max="20" step="0.5" value="-0.5"></label>
          <label class="debug-dock__slider"><span>Масштаб <output data-cup-output="scale">1.00</output></span><input data-cup="scale" type="range" min="0.6" max="1.8" step="0.01" value="1"></label>
          <label class="debug-dock__slider"><span>Инерция <output data-cup-output="response">10</output></span><input data-cup="response" type="range" min="1" max="30" step="0.5" value="10"></label>
          <label class="debug-dock__slider"><span>Старт видео <output data-cup-output="scrubStart">0.00</output></span><input data-cup="scrubStart" type="range" min="0" max="1" step="0.01" value="0"></label>
          <label class="debug-dock__slider"><span>Конец видео <output data-cup-output="scrubEnd">1.00</output></span><input data-cup="scrubEnd" type="range" min="0" max="1" step="0.01" value="1"></label>
        </div>
        <div id="debug-tab-day-and-night" class="debug-dock__pane" role="tabpanel" aria-labelledby="debug-tab-day-and-night-btn" hidden>
          <fieldset class="debug-dock__group">
            <legend>Окна ночью</legend>
            <label class="debug-dock__row">Emissive color <input data-theme="windowEmissiveColor" type="color" value="#ffd39a"></label>
            <label class="debug-dock__slider"><span>Emissive intensity <output data-theme-output="windowEmissiveIntensity">2.00</output></span><input data-theme="windowEmissiveIntensity" type="range" min="0" max="4" step="0.05" value="2"></label>
          </fieldset>
        </div>
      </div>
    </div>`;
}

export function initDebug(): void {
  const dock=document.querySelector<HTMLElement>('.debug-dock')!;
  const button=document.querySelector<HTMLButtonElement>('#debug-toggle')!;
  const panel=document.querySelector<HTMLElement>('#debug-panel')!;
  const tabs=Array.from(panel.querySelectorAll<HTMLButtonElement>('[role=tab][data-tab]'));
  const panes=new Map<DebugTabId, HTMLElement>([
    ['model', panel.querySelector('#debug-tab-model')!],
    ['cup', panel.querySelector('#debug-tab-cup')!],
    ['day_and_night', panel.querySelector('#debug-tab-day-and-night')!],
  ]);
  const setTab=(id: DebugTabId)=>{
    for(const tab of tabs){
      const selected=tab.dataset.tab===id;
      tab.setAttribute('aria-selected',String(selected));
      tab.tabIndex=selected?0:-1;
    }
    for(const [paneId,pane] of panes) pane.hidden=paneId!==id;
    try { localStorage.setItem(DEBUG_TAB_STORAGE_KEY, id); } catch { /* Storage may be disabled. */ }
  };
  const readStoredTab=(): DebugTabId=>{
    try {
      const stored=localStorage.getItem(DEBUG_TAB_STORAGE_KEY);
      if(stored==='cup'||stored==='model'||stored==='day_and_night') return stored;
    } catch { /* Storage may be disabled. */ }
    return 'model';
  };
  setTab(readStoredTab());
  for(const tab of tabs){
    tab.addEventListener('click',()=>{
      const id=tab.dataset.tab;
      if(id==='model'||id==='cup'||id==='day_and_night') setTab(id);
    });
    tab.addEventListener('keydown',e=>{
      if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return;
      e.preventDefault();
      const delta=e.key==='ArrowRight'?1:-1;
      const next=tabs[(tabs.indexOf(tab)+delta+tabs.length)%tabs.length];
      const id=next.dataset.tab;
      if(id==='model'||id==='cup'||id==='day_and_night'){ setTab(id); next.focus(); }
    });
  }
  const inputs=debugPanelInputs(panel);
  const cupInputs=cupPanelInputs(panel);
  const themeInputs=themePanelInputs(panel);
  const setOpen=(open:boolean)=>{button.setAttribute('aria-expanded',String(open));panel.hidden=!open;dock.classList.toggle('is-open',open);};
  button.addEventListener('click',()=>setOpen(button.getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){setOpen(false);button.focus();}});
  document.addEventListener('click',e=>{if(!(e.target as HTMLElement).closest('.debug-dock'))setOpen(false);});
  let stored: Partial<DebugModelSettings> | null = null;
  let storedCup: Partial<DebugCupSettings> | null = null;
  let storedTheme: Partial<DebugThemeSettings> | null = null;
  try { stored = JSON.parse(localStorage.getItem(DEBUG_STORAGE_KEY) ?? 'null') as Partial<DebugModelSettings> | null; } catch { stored = null; }
  try { storedCup = JSON.parse(localStorage.getItem(DEBUG_CUP_STORAGE_KEY) ?? 'null') as Partial<DebugCupSettings> | null; } catch { storedCup = null; }
  try { storedTheme = JSON.parse(localStorage.getItem(DEBUG_THEME_STORAGE_KEY) ?? 'null') as Partial<DebugThemeSettings> | null; } catch { storedTheme = null; }
  writeDebugInputs(inputs, hydrateDebugState(stored));
  writeCupInputs(cupInputs, hydrateCupState(storedCup));
  writeThemeInputs(themeInputs, hydrateThemeState(storedTheme));
  const syncOutputs=(rangeInputs: HTMLInputElement[], attr: 'debug' | 'cup' | 'theme')=>{
    for(const input of rangeInputs){
      if(input.type!=='range')continue;
      const key=attr==='debug' ? input.dataset.debug : attr==='cup' ? input.dataset.cup : input.dataset.theme;
      const output=panel.querySelector(`[data-${attr}-output="${key}"]`);
      if(output)output.textContent=formatRangeOutput(input);
    }
  };
  const emit=()=>{
    const state=readDebugInputs(inputs);
    syncOutputs(inputs,'debug');
    try { localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage may be disabled. */ }
    document.dispatchEvent(new CustomEvent('chsgs-debug-model',{detail:state}));
  };
  const emitCup=()=>{
    const state=readCupInputs(cupInputs);
    syncOutputs(cupInputs,'cup');
    try { localStorage.setItem(DEBUG_CUP_STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage may be disabled. */ }
    document.dispatchEvent(new CustomEvent('chsgs-debug-cup',{detail:state}));
  };
  const emitTheme=()=>{
    const state=readThemeInputs(themeInputs);
    syncOutputs(themeInputs,'theme');
    try { localStorage.setItem(DEBUG_THEME_STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage may be disabled. */ }
    document.dispatchEvent(new CustomEvent('chsgs-debug-theme',{detail:state}));
  };
  inputs.forEach(input=>input.addEventListener(input.type==='range'?'input':'change',()=>{
    if(input.dataset.debug==='viewMode'&&input.checked&&(input.value==='clay'||input.value==='lit')){
      writeDebugInputs(inputs,{viewMode:input.value,...DEBUG_MODEL_PRESETS[input.value]});
    }
    emit();
  }));
  cupInputs.forEach(input=>input.addEventListener('input',emitCup));
  themeInputs.forEach(input=>input.addEventListener(input.type==='range'?'input':'change',emitTheme));
  emit();
  emitCup();
  emitTheme();
}
