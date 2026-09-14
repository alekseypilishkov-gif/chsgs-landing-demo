export function initTheme(): void {
  const button = document.querySelector<HTMLButtonElement>('#theme-toggle')!;
  const update = () => {const light=document.documentElement.dataset.theme==='light'; button.setAttribute('aria-pressed',String(light));button.setAttribute('aria-label',light?'Тёмная тема':'Светлая тема');document.dispatchEvent(new CustomEvent('chsgs-theme',{detail:light?'light':'dark'}));};
  button.addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='light'?'dark':'light';try{localStorage.setItem('chsgs-theme',document.documentElement.dataset.theme);}catch{/* Storage may be disabled. */}update();});update();
}
