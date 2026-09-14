export function initMenu(): void {
  const header=document.querySelector<HTMLElement>('.ld-site-header')!;
  const button=document.querySelector<HTMLButtonElement>('#menu-toggle')!;
  const nav=document.querySelector<HTMLElement>('#main-nav')!;
  const setOpen=(open:boolean)=>{button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Закрыть меню':'Меню');button.classList.toggle('ld-site-header__burger--open',open);header.classList.toggle('ld-site-header--panel-open',open);nav.classList.toggle('is-open',open);nav.hidden=!open;document.body.classList.toggle('is-menu-open',open);};
  const close=()=>setOpen(false);
  button.addEventListener('click',()=>setOpen(button.getAttribute('aria-expanded')!=='true'));
  nav.addEventListener('click',e=>{if((e.target as HTMLElement).closest('a'))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('is-open')){close();button.focus();}});
  document.addEventListener('click',e=>{if(!(e.target as HTMLElement).closest('.site-header'))close();});
}
