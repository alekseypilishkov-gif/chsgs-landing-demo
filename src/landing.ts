import { factory, official, type Chapter, type Metric } from './factoryContent';
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type RevealKind = 'label'|'heading'|'body'|'ui'|'card'|'media';
const reveal = (kind: RevealKind, delay=0) => `class="reveal" data-reveal="${kind}"${delay ? ` style="--reveal-delay:${delay.toFixed(2)}s"` : ''}`;
const image = (c: Chapter, kind?: RevealKind, delay=0) => c.image ? `<figure${kind ? ` ${reveal(kind,delay)}` : ''}><img src="${import.meta.env.BASE_URL}media/${c.image}" alt="${esc(c.alt)}" width="1200" height="760" loading="lazy" decoding="async"></figure>` : '';
const nav = [['about','О заводе'],['production','Производство'],['quality','Качество'],['service','Сервис'],['achievements','Достижения'],['clients','Клиенты']];
const number = (m: Metric, n=m.value) => `${m.prefix ?? ''}${Math.round(n).toLocaleString('ru-RU')}${m.suffix ?? ''}`;

export function mountLanding(): void {
  document.querySelector('#app')!.innerHTML = `
    <a class="skip-link" href="#production">Перейти к содержанию</a>
    <header class="site-header">
      <a class="brand" href="${official}/" aria-label="ЛД — сайт производителя"><img src="${import.meta.env.BASE_URL}media/ld-logo.svg" width="79" height="48" alt="ЛД"></a>
      <span class="header-factory">ЗАВОД ЧСГС</span>
      <nav id="main-nav" aria-label="Разделы страницы">${nav.map(([id,label])=>`<a href="#${id}">${label}</a>`).join('')}</nav>
      <button id="theme-toggle" class="icon-button" type="button" aria-label="Светлая тема" aria-pressed="false"><span aria-hidden="true">◐</span></button>
      <button id="menu-toggle" class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="main-nav"><span></span><span></span></button>
    </header>
    <div id="viewer" role="img" aria-label="Интерактивная трёхмерная модель завода ЧСГС. Поворот — горизонтальным перетаскиванием."></div>
    <div id="status" role="status" aria-live="polite"><div class="loader-content"><img src="${import.meta.env.BASE_URL}media/ld-logo.svg" width="79" height="48" alt="ЛД"><p>ЧЕЛЯБИНСКСПЕЦГРАЖДАНСТРОЙ</p><div class="load-track"><span id="load-bar"></span></div><span id="load-label">Загружаем завод</span></div></div>
    <main>
      <section id="about" class="hero-stage" aria-labelledby="hero-title">
        <div class="hero-sticky">
          <div class="hero-heading"><p class="eyebrow hero-enter">01 / ЗАВОД ПОЛНОГО ЦИКЛА</p><h1 id="hero-title" class="hero-enter">${factory.title.map(s=>`<span>${s}</span>`).join('')}</h1></div>
          <div class="hero-copy"><p class="hero-subtitle hero-enter">${factory.subtitle}</p><div class="hero-description hero-enter"><p>${factory.description}</p><p>${factory.descriptionMore}</p></div></div>
          <div class="hero-bottom hero-enter"><a href="#metrics">Завод в цифрах <span aria-hidden="true">↓</span></a><span>Поверните завод перетаскиванием</span><span>ЧЕЛЯБИНСК / РОССИЯ</span></div>
          <div id="metrics" class="metrics" aria-labelledby="metrics-title"><h2 id="metrics-title" class="eyebrow metric-reveal">МАСШТАБ ПРОИЗВОДСТВА</h2><div class="metric-grid">${factory.metrics.map((m,i)=>`<article class="metric metric-reveal"><span class="metric-number" aria-label="${number(m)}"><span aria-hidden="true" data-counter="${i}">${number(m)}</span></span><h3>${m.label}</h3>${i===5?`<a href="${factory.catalog}">${m.description} ↗</a>`:`<p>${m.description}</p>`}</article>`).join('')}</div></div>
        </div>
      </section>
      <section id="production" class="section solid overlay-section" aria-labelledby="production-title"><div class="section-content">
        <div class="section-heading"><p class="eyebrow" ${reveal('label')}>02 / ПРОИЗВОДСТВО</p><h2 id="production-title" ${reveal('heading',.12)}>Технологический парк<br>и глубина производства</h2><p class="section-intro" ${reveal('body',.24)}>${factory.productionIntro}</p></div>
        ${factory.production.map((c,i)=>`<article class="production-chapter">${image(c,'media')}<div class="chapter-copy"><span class="chapter-index" ${reveal('label',.10)}>0${i+1} / 05</span><h3 ${reveal('heading',.22)}>${c.title}</h3><p ${reveal('body',.34)}>${c.text}</p></div></article>`).join('')}
      </div></section>
      <section id="quality" class="section quality-section" aria-labelledby="quality-title">
        <div class="quality-body"><aside class="quality-aside"><div class="section-heading"><p class="eyebrow" ${reveal('label')}>03 / КАЧЕСТВО</p><h2 id="quality-title" ${reveal('heading',.12)}>Модернизация продукции<br>и <em>100%</em> контроль качества</h2></div><div class="quality-model-space"></div></aside><div class="quality-chapters">${factory.quality.map((c,i)=>`<article class="quality-chapter"><span class="chapter-index" ${reveal('label')}>0${i+1} / 04</span><h3 ${reveal('heading',.12)}>${c.title}</h3><p ${reveal('body',.24)}>${c.text}</p>${image(c,'media',.36)}</article>`).join('')}</div></div>
      </section>
      <section id="service" class="section solid service-section overlay-section" aria-labelledby="service-title"><div class="section-content">
        <div class="section-heading"><p class="eyebrow" ${reveal('label')}>04 / СЕРВИС</p><h2 id="service-title" ${reveal('heading',.12)}>Сервисная поддержка<br>и гарантийные обязательства</h2></div>
        <div class="service-list">${factory.service.map(c=>`<article class="service-row"><strong ${reveal('card')}>${c.value}</strong><h3 ${reveal('heading',.12)}>${c.title}</h3><p ${reveal('body',.24)}>${c.text}</p></article>`).join('')}</div>
        <a class="text-link" ${reveal('ui')} href="mailto:${factory.email}">Связаться с заводом <span aria-hidden="true">↗</span></a>
      </div></section>
      <section id="video" class="section solid video-section" aria-labelledby="video-title"><div class="section-heading"><p class="eyebrow" ${reveal('label')}>05 / ИЗНУТРИ</p><h2 id="video-title" ${reveal('heading',.12)}>Видео о заводе</h2></div><div class="video-frame" ${reveal('media',.24)}><button id="video-play" aria-label="Смотреть видео о заводе"><img src="${import.meta.env.BASE_URL}media/video-poster.png" width="1736" height="976" loading="lazy" alt="Производство ЧСГС — кадр из презентации завода"><span class="play-caption"><span class="play-symbol" aria-hidden="true">▶</span>Смотреть видео о заводе</span></button></div><a class="video-external" ${reveal('ui',.12)} href="${factory.videoPage}" target="_blank" rel="noopener noreferrer">Открыть на RUTUBE ↗</a></section>
      <section id="achievements" class="section solid achievements-section" aria-labelledby="achievements-title"><div class="award-art" aria-hidden="true"><div class="award-placeholder award-large" data-award="primary"><span>ЛД / ДОСТИЖЕНИЯ</span><span>Место для<br>наградной графики</span><small>01</small></div><div class="award-placeholder award-small" data-award="secondary"><span>ЧСГС</span><span>Место для<br>наградной графики</span><small>02</small></div></div><div class="achievement-copy"><p class="eyebrow" ${reveal('label')}>06 / МАСШТАБ ПРИСУТСТВИЯ</p><h2 id="achievements-title" ${reveal('heading',.12)}>Глобальное присутствие<br>и достижения</h2><h3 ${reveal('heading',.24)}>${factory.awardTitle}</h3><p ${reveal('body',.36)}>${factory.awardText}</p><div class="global-metrics">${factory.achievements.map((m,i)=>`<div ${reveal('card',i*.12)}><strong>${m.value}</strong><p>${m.label}</p></div>`).join('')}</div></div></section>
      <section id="clients" class="section solid clients-section" aria-labelledby="clients-title"><div class="section-heading"><p class="eyebrow" ${reveal('label')}>07 / НАМ ДОВЕРЯЮТ</p><h2 id="clients-title" ${reveal('heading',.12)}>Продукция завода используется крупными клиентами</h2></div><div id="clients-content"></div></section>
      <section id="catalog" class="section catalog-section" aria-labelledby="catalog-title"><p class="eyebrow" ${reveal('label')}>08 / ПРОДУКЦИЯ ЧСГС</p><h2 id="catalog-title" ${reveal('heading',.12)}>От производства —<br>к вашему проекту.</h2><a class="catalog-cta" ${reveal('ui',.24)} href="${factory.catalog}"><span>Изучить каталог<br>стальных шаровых кранов</span><span aria-hidden="true">↗</span></a></section>
    </main>
    <footer id="contacts" class="section site-footer"><div class="footer-top"><a class="brand" ${reveal('ui')} href="${official}/" aria-label="ЛД — сайт производителя"><img src="${import.meta.env.BASE_URL}media/ld-logo.svg" width="79" height="48" alt="ЛД"></a><p ${reveal('body',.12)}>ЧелябинскСпецГражданСтрой<br>Завод полного цикла</p><div class="footer-contact" ${reveal('body',.24)}><a href="${factory.phoneLink}">${factory.phone}</a><span>${factory.hours}</span><a href="mailto:${factory.email}">${factory.email}</a></div><a class="back-top" ${reveal('ui',.36)} href="#about">Наверх ↑</a></div><div class="footer-links" ${reveal('ui',.12)}><a href="${official}/politika_konfidencial_nosti/">Политика конфиденциальности</a><a href="${official}/politika_ispolzovania_fajlov_cookies/">Политика использования cookie-файлов</a><a id="user-agreement" href="${official}/polzovatelskoe_soglasenie">Пользовательское соглашение</a></div><p class="footer-legal" ${reveal('body',.24)}>© 2026 ООО ТД «ЛД». Все права защищены законом об авторском праве, копирование информации без разрешения правообладателя запрещено.</p><p class="footer-legal" ${reveal('body',.36)}>Предложения на сайте не являются публичной офертой. Информация на сайте о товаре носит рекламный характер и расценивается как приглашение делать оферты на основании п. 1 ст. 437 Гражданского кодекса РФ.</p></footer>`;
  initTheme(); initMenu(); initClients(); initVideo();
}

function initTheme(): void {
  const button = document.querySelector<HTMLButtonElement>('#theme-toggle')!;
  const update = () => {const light=document.documentElement.dataset.theme==='light'; button.setAttribute('aria-pressed',String(light));button.setAttribute('aria-label',light?'Тёмная тема':'Светлая тема');document.dispatchEvent(new CustomEvent('chsgs-theme',{detail:light?'light':'dark'}));};
  button.addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='light'?'dark':'light';try{localStorage.setItem('chsgs-theme',document.documentElement.dataset.theme);}catch{/* Storage may be disabled. */}update();});update();
}
function initMenu(): void {
  const button=document.querySelector<HTMLButtonElement>('#menu-toggle')!;const nav=document.querySelector<HTMLElement>('#main-nav')!;
  const close=()=>{button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Открыть меню');nav.classList.remove('is-open');};
  button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');nav.classList.toggle('is-open',open);});
  nav.addEventListener('click',e=>{if((e.target as HTMLElement).closest('a'))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('is-open')){close();button.focus();}});
  document.addEventListener('click',e=>{if(!(e.target as HTMLElement).closest('.site-header'))close();});
}
function initVideo(): void {
  document.querySelector('#video-play')!.addEventListener('click',()=>{
    const frame=document.createElement('iframe');frame.src=factory.video;frame.title='Видео о заводе ЧСГС';frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';document.querySelector('.video-frame')!.replaceChildren(frame);frame.focus();
  });
}
function initClients(): void {
  const host=document.querySelector('#clients-content')!;
  if(!factory.clientGroups.length){host.innerHTML=`<p class="clients-notice" ${reveal('body')}>Объекты и партнёры ЧСГС</p><div class="client-tabs" ${reveal('ui',.12)} role="tablist" aria-label="Партнёры"><button role="tab" aria-selected="true" id="client-tab-source" aria-controls="client-panel-source">Объекты и партнёры</button><button role="tab" aria-selected="false" tabindex="-1" id="client-tab-network" aria-controls="client-panel-network">Дилерская сеть</button></div><div id="client-panel-source" class="client-panel" role="tabpanel" aria-labelledby="client-tab-source"><div class="client-placeholder-grid">${[1,2,3,4].map((i,index)=>`<div class="client-placeholder" ${reveal('card',.24+index*.12)}>Партнёр <span>0${i}</span><small>Логотип уточняется</small></div>`).join('')}</div><a class="text-link" ${reveal('ui',.36)} href="${official}/info_ld_plants/chsgs/">Объекты и партнёры на сайте ЛД ↗</a></div><div id="client-panel-network" class="client-panel" role="tabpanel" aria-labelledby="client-tab-network" hidden><p class="network-number">200+</p><p>Дилеров в России и за рубежом</p><a class="text-link" href="${official}/contacts/">Найти представителя ЛД ↗</a></div>`;}
  else {host.innerHTML=`<div class="client-tabs" ${reveal('ui',.12)} role="tablist" aria-label="Категории клиентов">${factory.clientGroups.map((g,i)=>`<button role="tab" id="client-tab-${g.id}" aria-controls="client-panel-${g.id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${esc(g.title)}</button>`).join('')}</div>${factory.clientGroups.map((g,i)=>`<div id="client-panel-${g.id}" class="client-panel" role="tabpanel" aria-labelledby="client-tab-${g.id}" ${i?'hidden':''}><div class="client-grid">${g.clients.map((c,index)=>`<div class="client-logo" ${reveal('card',.24+index*.12)}>${c.image?`<img src="${c.image}" width="240" height="100" loading="lazy" alt="${esc(c.name)}">`:`<span>${esc(c.name)}</span>`}</div>`).join('')}</div></div>`).join('')}`;}
  const tabs=Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));const activate=(i:number)=>tabs.forEach((tab,j)=>{tab.setAttribute('aria-selected',String(i===j));tab.tabIndex=i===j?0:-1;const panel=document.getElementById(tab.getAttribute('aria-controls')!)!;panel.hidden=i!==j;if(i===j){panel.querySelectorAll('.reveal').forEach(element=>element.classList.add('is-revealed'));panel.classList.remove('client-panel-enter');void panel.clientWidth;panel.classList.add('client-panel-enter');}});
  tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>activate(i));tab.addEventListener('keydown',e=>{let next=i;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();activate(next);tabs[next]!.focus();});});
}

export { number as formatMetric };

