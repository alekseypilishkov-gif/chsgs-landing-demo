import { factory, official, type Chapter, type Metric } from './factoryContent';
import './siteChrome.css';
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type RevealKind = 'label'|'heading'|'body'|'ui'|'card'|'media';
const reveal = (kind: RevealKind, delay=0) => `class="reveal" data-reveal="${kind}"${delay ? ` style="--reveal-delay:${delay.toFixed(2)}s"` : ''}`;
const image = (c: Chapter, kind?: RevealKind, delay=0) => c.image ? `<figure${kind ? ` ${reveal(kind,delay)}` : ''}><img src="${import.meta.env.BASE_URL}media/${c.image}" alt="${esc(c.alt)}" width="1200" height="760" loading="lazy" decoding="async"></figure>` : '';
const nav = [['about','О заводе'],['production','Производство'],['quality','Качество'],['service','Сервис'],['achievements','Достижения'],['clients','Клиенты']];
const navItems = (className = '') => nav.map(([id,label])=>`<a${className ? ` class="${className}"` : ''} href="#${id}">${esc(label)}</a>`).join('');
const number = (m: Metric, n=m.value) => `${m.prefix ?? ''}${Math.round(n).toLocaleString('ru-RU')}${m.suffix ?? ''}`;
const icon = {
  search: '<svg class="ld-site-header__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.524 12.689L15.834 14.998C15.942 15.109 16.001 15.259 16 15.414C15.999 15.569 15.936 15.717 15.827 15.827C15.717 15.936 15.569 15.999 15.414 16C15.259 16.001 15.109 15.942 14.998 15.834L12.688 13.524C11.179 14.817 9.228 15.476 7.243 15.361C5.259 15.246 3.397 14.368 2.046 12.909C0.696 11.451 -0.037 9.526 0.001 7.539C0.04 5.552 0.846 3.657 2.251 2.251C3.657 0.846 5.552 0.04 7.539 0.001C9.526 -0.037 11.451 0.696 12.909 2.046C14.368 3.397 15.246 5.259 15.361 7.243C15.476 9.228 14.817 11.179 13.524 12.688ZM7.687 14.191C9.412 14.191 11.066 13.506 12.286 12.286C13.506 11.066 14.191 9.412 14.191 7.687C14.191 5.962 13.506 4.308 12.286 3.088C11.066 1.868 9.412 1.183 7.687 1.183C5.962 1.183 4.308 1.868 3.088 3.088C1.868 4.308 1.183 5.962 1.183 7.687C1.183 9.412 1.868 11.066 3.088 12.286C4.308 13.506 5.962 14.191 7.687 14.191Z" transform="translate(4 4)" fill="currentColor"/></svg>',
  angle: '<svg class="ld-site-header__angle" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M0.72 0L0 0.719L5.141 5.859L0.001 11L0.72 11.719L6.22 6.219L6.563 5.859L6.22 5.5L0.72 0Z" transform="translate(5.765 2.141)" fill="currentColor"/></svg>',
  burger: '<svg class="ld-site-header__icon ld-site-header__icon--burger" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M0 0.5C0 0.367 0.053 0.24 0.146 0.146C0.24 0.053 0.367 0 0.5 0L17.5 0C17.633 0 17.76 0.053 17.854 0.146C17.947 0.24 18 0.367 18 0.5C18 0.633 17.947 0.76 17.854 0.854C17.76 0.947 17.633 1 17.5 1L0.5 1C0.367 1 0.24 0.947 0.146 0.854C0.053 0.76 0 0.633 0 0.5ZM0 7C0 6.867 0.053 6.74 0.146 6.646C0.24 6.553 0.367 6.5 0.5 6.5L17.5 6.5C17.633 6.5 17.76 6.553 17.854 6.646C17.947 6.74 18 6.867 18 7C18 7.133 17.947 7.26 17.854 7.354C17.76 7.447 17.633 7.5 17.5 7.5L0.5 7.5C0.367 7.5 0.24 7.447 0.146 7.354C0.053 7.26 0 7.133 0 7ZM0 13.5C0 13.367 0.053 13.24 0.146 13.146C0.24 13.053 0.367 13 0.5 13L17.5 13C17.633 13 17.76 13.053 17.854 13.146C17.947 13.24 18 13.367 18 13.5C18 13.633 17.947 13.76 17.854 13.854C17.76 13.947 17.633 14 17.5 14L0.5 14C0.367 14 0.24 13.947 0.146 13.854C0.053 13.76 0 13.633 0 13.5Z" transform="translate(3 5)" fill="currentColor" fill-rule="evenodd"/></svg>',
  close: '<svg class="ld-site-header__icon ld-site-header__icon--close" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18.75 6.31L17.69 5.25L12 10.94L6.31 5.25L5.25 6.31L10.94 12L5.25 17.69L6.31 18.75L12 13.06L17.69 18.75L18.75 17.69L13.06 12L18.75 6.31Z" fill="currentColor"/></svg>',
  user: '<svg class="ld-site-header__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v1.5h16V18c0-2.66-5.33-4-8-4z" fill="currentColor"/></svg>',
  vk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.78 17.5h1.18s.36-.04.54-.24c.17-.18.16-.53.16-.53s-.02-1.62.73-1.86c.74-.23 1.69 1.56 2.7 2.25.76.52 1.34.41 1.34.41l2.69-.04s1.4-.09.74-1.19c-.06-.09-.4-.84-2.06-2.38-1.74-1.61-1.51-1.35.59-4.14.128-.1.7-2.64 1.96-3.74.38-.27.26-.45.26-.45l-2.86.04s-.42-.06-.74.16c-.31.21-.5.71-.5.71s-.91 2.42-2.12 4c-1.28 1.66-1.79 1.75-2 1.64-.49-.24-.37-1-.37-1.53V8.3c.01-.5-.16-.81-.5-.98-.27-.13-.71-.18-1.32-.17-1.01.01-1.66.06-2.09.37-.28.21-.5.67-.1.7.5.04.82.2 1 .38.23.24.22.79.22.79s.13 2.07-.31 2.32c-.3.18-.71-.18-1.6-1.81-.45-.83-.79-1.76-.79-1.76s-.07-.16-.19-.25c-.15-.11-.36-.15-.36-.15l-2.72.04s-.41.01-.56.19c-.13.16-.01.49-.01.49s2.15 5.03 4.58 7.56c2.23 2.32 4.77 2.17 4.77 2.17"/></svg>',
  yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12z"/></svg>',
  tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.9 4.4 18.6 20c-.2 1.1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.2-8.3c.4-.4-.1-.6-.6-.2l-11.4 7.2-4.9-1.5c-1.1-.4-1.1-1.1.2-1.6L20.3 3c.9-.3 1.7.2 1.6 1.4z"/></svg>',
} as const;
const socialIcon = (id: string) => id === 'vk' ? icon.vk : id === 'yt' ? icon.yt : icon.tg;
const footerLinks = (links: readonly string[][], extra = '', legal = false) =>
  `<ul class="ld-site-footer__list${legal ? ' ld-site-footer__legal-links' : ''}${extra}">${links.map(([label, href]) => `<li><a class="ld-site-footer__link${legal ? ' ld-site-footer__link--accent' : ''}" ${label?.startsWith('Пользовательское') ? 'id="user-agreement" ' : ''}href="${href}">${esc(label ?? '')}</a></li>`).join('')}</ul>`;

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

export function mountLanding(): void {
  document.querySelector('#app')!.innerHTML = `
    <a class="skip-link" href="#production">Перейти к содержанию</a>
    <header class="site-header ld-site-header ld-site-header--without-cart" data-surface="content">
      <div class="ld-site-header__glass-bar" aria-hidden="true"></div>
      <div class="ld-site-header__bar">
        <a class="ld-site-header__catalog ld-site-header__button" href="${factory.catalogRoot}"><span class="ld-site-header__catalog-label">Каталог</span>${icon.angle}</a>
        <a class="ld-site-header__search ld-site-header__icon-button" href="${factory.search}" aria-label="Поиск">${icon.search}</a>
        <a class="ld-site-header__logo" href="${official}/" aria-label="LD"><img src="${import.meta.env.BASE_URL}media/ld-logo.svg" width="79" height="48" alt=""></a>
        <button id="menu-toggle" class="ld-site-header__burger ld-site-header__icon-button" type="button" aria-label="Меню" aria-expanded="false" aria-controls="main-nav" aria-haspopup="true">${icon.burger}${icon.close}</button>
        <a class="ld-site-header__user ld-site-header__icon-button" href="${factory.profile}" aria-label="Личный кабинет">${icon.user}</a>
      </div>
      <nav id="main-nav" class="ld-site-header__panel" hidden aria-label="Разделы страницы">${navItems()}</nav>
    </header>
    <button id="theme-toggle" class="theme-dock" type="button" aria-label="Светлая тема" aria-pressed="false"><span aria-hidden="true">◐</span></button>
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
    </div>
    <nav class="hero-nav" aria-label="Навигация">${navItems()}</nav>
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
    <footer id="contacts" class="site-footer ld-site-footer">
      <div class="ld-site-footer__inner">
        <div class="ld-site-footer__main">
          <section class="ld-site-footer__contacts" aria-label="Контакты">
            <a class="ld-site-footer__logo-link" ${reveal('ui')} href="${official}/" aria-label="ЛД — сайт производителя"><img class="ld-site-footer__logo" src="${import.meta.env.BASE_URL}media/ld-logo.svg" width="79" height="48" alt="ЛД"></a>
            <address class="ld-site-footer__address" ${reveal('body',.12)}>
              <a class="ld-site-footer__contact-line ld-site-footer__contact-line--phone" href="${factory.phoneLink}">${factory.phone}</a>
              <span class="ld-site-footer__contact-line ld-site-footer__contact-line--schedule">${factory.hours}</span>
              <span class="ld-site-footer__contact-line ld-site-footer__contact-line--address ld-site-footer__contact-line--address-desktop">${factory.address}</span>
              <span class="ld-site-footer__contact-line ld-site-footer__contact-line--address ld-site-footer__contact-line--address-compact">${factory.addressShort}</span>
              <a class="ld-site-footer__contact-line ld-site-footer__contact-line--email ld-site-footer__link ld-site-footer__link--accent" href="mailto:${factory.email}">${factory.email}</a>
            </address>
            <div class="ld-site-footer__socials" ${reveal('ui',.24)} aria-label="Социальные сети">
              <span class="ld-site-footer__social-title">Мы в соцсетях</span>
              <div class="ld-site-footer__social-list">${factory.socials.map(s=>`<a class="ld-site-footer__social-icon" href="${s.href}" aria-label="${esc(s.label)}" rel="noopener noreferrer">${socialIcon(s.id)}</a>`).join('')}</div>
            </div>
          </section>
          <div class="ld-site-footer__navigation">
            <nav class="ld-site-footer__nav ld-site-footer__nav--desktop" aria-label="Основная навигация">${footerLinks(factory.footerPrimary)}</nav>
            <nav class="ld-site-footer__nav ld-site-footer__nav--desktop" aria-label="Дополнительная навигация">${footerLinks(factory.footerSecondary)}</nav>
            <nav class="ld-site-footer__compact-nav" aria-label="Навигация футера">${footerLinks(factory.footerPrimary,' ld-site-footer__list--compact')}${footerLinks(factory.footerSecondary,' ld-site-footer__list--compact')}</nav>
          </div>
        </div>
        <div class="ld-site-footer__divider" aria-hidden="true"></div>
        <div class="ld-site-footer__legal">
          <div class="ld-site-footer__legal-column" ${reveal('body',.12)}>
            <p class="ld-site-footer__legal-text">© 2026 ООО ТД «ЛД». Все права защищены законом об авторском праве, копирование информации без разрешения правообладателя запрещено.</p>
            <div class="ld-site-footer__feedback-wrap"><a class="ld-site-footer__link ld-site-footer__link--accent" href="${official}/siteld/" target="_blank" rel="noopener noreferrer">Сообщить о проблеме в работе сайта</a></div>
          </div>
          ${footerLinks(factory.footerLegal, ' ld-site-footer__legal-links--desktop', true)}
          ${footerLinks(factory.footerLegal, ' ld-site-footer__legal-links--compact', true)}
          <p class="ld-site-footer__legal-text" ${reveal('body',.24)}>Предложения на сайте не являются публичной офертой. Информация на сайте о товаре носит рекламный характер и расценивается как приглашение делать оферты на основании п. 1 ст. 437 Гражданского кодекса РФ.</p>
        </div>
      </div>
    </footer>`;
  initTheme(); initMenu(); initClients(); initVideo(); initDebug();
}

function initTheme(): void {
  const button = document.querySelector<HTMLButtonElement>('#theme-toggle')!;
  const update = () => {const light=document.documentElement.dataset.theme==='light'; button.setAttribute('aria-pressed',String(light));button.setAttribute('aria-label',light?'Тёмная тема':'Светлая тема');document.dispatchEvent(new CustomEvent('chsgs-theme',{detail:light?'light':'dark'}));};
  button.addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='light'?'dark':'light';try{localStorage.setItem('chsgs-theme',document.documentElement.dataset.theme);}catch{/* Storage may be disabled. */}update();});update();
}
function initMenu(): void {
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
function initDebug(): void {
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

