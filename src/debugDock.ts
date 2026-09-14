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
const DEBUG_STORAGE_KEY = 'chsgs-debug-model';
const DEBUG_MODEL_PRESETS: Record<DebugViewMode, Omit<DebugModelSettings, 'viewMode'>> = {
  clay: { original: false, ao: true, normals: true, reveal: true, accent: false, keyIntensity: 2.8, accentIntensity: 140 },
  lit: { original: true, ao: false, normals: true, reveal: false, accent: true, keyIntensity: 4.4, accentIntensity: 380 },
};
const debugPanelInputs = (panel: HTMLElement) => Array.from(panel.querySelectorAll<HTMLInputElement>('input[data-debug]'));
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
export function getDebugModelSettings(): DebugModelSettings {
  const panel = document.querySelector<HTMLElement>('#debug-panel');
  if (!panel) return { viewMode: 'clay', ...DEBUG_MODEL_PRESETS.clay };
  return readDebugInputs(debugPanelInputs(panel));
}

export function debugDockMarkup(): string {
  return `
    <div class="debug-dock">
      <button id="debug-toggle" class="debug-dock__button" type="button" aria-label="Отладка" aria-expanded="false" aria-controls="debug-panel"></button>
      <div id="debug-panel" class="debug-dock__panel" hidden>
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
    </div>`;
}

export function initDebug(): void {
  const dock=document.querySelector<HTMLElement>('.debug-dock')!;
  const button=document.querySelector<HTMLButtonElement>('#debug-toggle')!;
  const panel=document.querySelector<HTMLElement>('#debug-panel')!;
  const inputs=debugPanelInputs(panel);
  const setOpen=(open:boolean)=>{button.setAttribute('aria-expanded',String(open));panel.hidden=!open;dock.classList.toggle('is-open',open);};
  button.addEventListener('click',()=>setOpen(button.getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){setOpen(false);button.focus();}});
  document.addEventListener('click',e=>{if(!(e.target as HTMLElement).closest('.debug-dock'))setOpen(false);});
  let stored: Partial<DebugModelSettings> | null = null;
  try { stored = JSON.parse(localStorage.getItem(DEBUG_STORAGE_KEY) ?? 'null') as Partial<DebugModelSettings> | null; } catch { stored = null; }
  writeDebugInputs(inputs, hydrateDebugState(stored));
  const emit=()=>{
    const state=readDebugInputs(inputs);
    for(const input of inputs){
      if(input.type!=='range')continue;
      const output=panel.querySelector(`[data-debug-output="${input.dataset.debug}"]`);
      if(output)output.textContent=Number(input.value).toFixed(input.step.includes('.')?2:0);
    }
    try { localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage may be disabled. */ }
    document.dispatchEvent(new CustomEvent('chsgs-debug-model',{detail:state}));
  };
  inputs.forEach(input=>input.addEventListener(input.type==='range'?'input':'change',()=>{
    if(input.dataset.debug==='viewMode'&&input.checked&&(input.value==='clay'||input.value==='lit')){
      writeDebugInputs(inputs,{viewMode:input.value,...DEBUG_MODEL_PRESETS[input.value]});
    }
    emit();
  }));
  emit();
}
