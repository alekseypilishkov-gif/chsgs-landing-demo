import { factory } from '../factoryContent';

export function initVideo(): void {
  document.querySelector('#video-play')!.addEventListener('click',()=>{
    const frame=document.createElement('iframe');frame.src=factory.video;frame.title='Видео о заводе ЧСГС';frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';document.querySelector('.video-frame')!.replaceChildren(frame);frame.focus();
  });
}
