import { factory, official } from '../factoryContent';
import { debugDockMarkup } from '../debugDock';
import { esc, footerLinks, icon, image, navItems, number, reveal, socialIcon } from './html';

export function headerMarkup(): string {
  return `
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
    ${debugDockMarkup()}
    <nav class="hero-nav" aria-label="Навигация">${navItems()}</nav>
    <div id="viewer" role="img" aria-label="Интерактивная трёхмерная модель завода ЧСГС. Поворот — горизонтальным перетаскиванием."></div>
    <div id="status" role="status" aria-live="polite"><div class="loader-content"><img src="${import.meta.env.BASE_URL}media/ld-logo.svg" width="79" height="48" alt="ЛД"><p>ЧЕЛЯБИНСКСПЕЦГРАЖДАНСТРОЙ</p><div class="load-track"><span id="load-bar"></span></div><span id="load-label">Загружаем завод</span></div></div>`;
}

export function aboutMarkup(): string {
  return `
      <section id="about" class="hero-stage" aria-labelledby="hero-title">
        <div class="hero-sticky">
          <div class="hero-heading"><p class="eyebrow hero-enter">01 / ЗАВОД ПОЛНОГО ЦИКЛА</p><h1 id="hero-title" class="hero-enter">${factory.title.map(s=>`<span>${s}</span>`).join('')}</h1></div>
          <div class="hero-copy"><p class="hero-subtitle hero-enter">${factory.subtitle}</p><div class="hero-description hero-enter"><p>${factory.description}</p><p>${factory.descriptionMore}</p></div></div>
          <div class="hero-bottom hero-enter"><a href="#metrics">Завод в цифрах <span aria-hidden="true">↓</span></a><span>Поверните завод перетаскиванием</span><span>ЧЕЛЯБИНСК / РОССИЯ</span></div>
          <div id="metrics" class="metrics" aria-labelledby="metrics-title"><h2 id="metrics-title" class="eyebrow metric-reveal">МАСШТАБ ПРОИЗВОДСТВА</h2><div class="metric-grid">${factory.metrics.map((m,i)=>`<article class="metric metric-reveal"><span class="metric-number" aria-label="${number(m)}"><span aria-hidden="true" data-counter="${i}">${number(m)}</span></span><h3>${m.label}</h3>${i===5?`<a href="${factory.catalog}">${m.description} ↗</a>`:`<p>${m.description}</p>`}</article>`).join('')}</div></div>
        </div>
      </section>`;
}

export function productionMarkup(): string {
  return `
      <section id="production" class="section solid overlay-section" aria-labelledby="production-title"><div class="section-content">
        <div class="section-heading"><p class="eyebrow" ${reveal('label')}>02 / ПРОИЗВОДСТВО</p><h2 id="production-title" ${reveal('heading',.12)}>Технологический парк<br>и глубина производства</h2><p class="section-intro" ${reveal('body',.24)}>${factory.productionIntro}</p></div>
        ${factory.production.map((c,i)=>`<article class="production-chapter">${image(c,'media')}<div class="chapter-copy"><span class="chapter-index" ${reveal('label',.10)}>0${i+1} / 05</span><h3 ${reveal('heading',.22)}>${c.title}</h3><p ${reveal('body',.34)}>${c.text}</p></div></article>`).join('')}
      </div></section>`;
}

export function qualityMarkup(): string {
  return `
      <section id="quality" class="section quality-section" aria-labelledby="quality-title">
        <div class="quality-body"><aside class="quality-aside"><div class="section-heading"><p class="eyebrow" ${reveal('label')}>03 / КАЧЕСТВО</p><h2 id="quality-title" ${reveal('heading',.12)}>Модернизация продукции<br>и <em>100%</em> контроль качества</h2></div><div class="quality-model-space"></div></aside><div class="quality-chapters">${factory.quality.map((c,i)=>`<article class="quality-chapter"><span class="chapter-index" ${reveal('label')}>0${i+1} / 04</span><h3 ${reveal('heading',.12)}>${c.title}</h3><p ${reveal('body',.24)}>${c.text}</p>${image(c,'media',.36)}</article>`).join('')}</div></div>
      </section>`;
}

export function serviceMarkup(): string {
  return `
      <section id="service" class="section solid service-section overlay-section" aria-labelledby="service-title"><div class="section-content">
        <div class="section-heading"><p class="eyebrow" ${reveal('label')}>04 / СЕРВИС</p><h2 id="service-title" ${reveal('heading',.12)}>Сервисная поддержка<br>и гарантийные обязательства</h2></div>
        <div class="service-list">${factory.service.map(c=>`<article class="service-row"><strong ${reveal('card')}>${c.value}</strong><h3 ${reveal('heading',.12)}>${c.title}</h3><p ${reveal('body',.24)}>${c.text}</p></article>`).join('')}</div>
        <a class="text-link" ${reveal('ui')} href="mailto:${factory.email}">Связаться с заводом <span aria-hidden="true">↗</span></a>
      </div></section>`;
}

export function videoMarkup(): string {
  return `
      <section id="video" class="section solid video-section" aria-labelledby="video-title"><div class="section-heading"><p class="eyebrow" ${reveal('label')}>05 / ИЗНУТРИ</p><h2 id="video-title" ${reveal('heading',.12)}>Видео о заводе</h2></div><div class="video-frame" ${reveal('media',.24)}><button id="video-play" aria-label="Смотреть видео о заводе"><img src="${import.meta.env.BASE_URL}media/video-poster.png" width="1736" height="976" loading="lazy" alt="Производство ЧСГС — кадр из презентации завода"><span class="play-caption"><span class="play-symbol" aria-hidden="true">▶</span>Смотреть видео о заводе</span></button></div><a class="video-external" ${reveal('ui',.12)} href="${factory.videoPage}" target="_blank" rel="noopener noreferrer">Открыть на RUTUBE ↗</a></section>`;
}

export function achievementsMarkup(): string {
  return `
      <section id="achievements" class="section solid achievements-section" aria-labelledby="achievements-title"><div class="award-art" aria-hidden="true"><video class="award-cup award-cup--dark" muted playsinline preload="auto" disablepictureinpicture><source src="${import.meta.env.BASE_URL}media/cup.mp4" type="video/mp4"></video><video class="award-cup award-cup--light" muted playsinline preload="auto" disablepictureinpicture><source src="${import.meta.env.BASE_URL}media/cup-white.mp4" type="video/mp4"></video></div><div class="achievement-copy-track"><div class="achievement-copy"><p class="eyebrow" ${reveal('label')}>06 / МАСШТАБ ПРИСУТСТВИЯ</p><h2 id="achievements-title" ${reveal('heading',.12)}>Глобальное присутствие<br>и достижения</h2><h3 ${reveal('heading',.24)}>${factory.awardTitle}</h3><p ${reveal('body',.36)}>${factory.awardText}</p><div class="global-metrics">${factory.achievements.map((m,i)=>`<div ${reveal('card',i*.12)}><strong>${m.value}</strong><p>${m.label}</p></div>`).join('')}</div></div></div></section>`;
}

export function clientsMarkup(): string {
  return `
      <section id="clients" class="section solid clients-section" aria-labelledby="clients-title"><div class="section-heading"><p class="eyebrow" ${reveal('label')}>07 / НАМ ДОВЕРЯЮТ</p><h2 id="clients-title" ${reveal('heading',.12)}>Продукция завода используется крупными клиентами</h2></div><div id="clients-content"></div></section>`;
}

export function catalogMarkup(): string {
  return `
      <section id="catalog" class="section catalog-section" aria-labelledby="catalog-title"><p class="eyebrow" ${reveal('label')}>08 / ПРОДУКЦИЯ ЧСГС</p><h2 id="catalog-title" ${reveal('heading',.12)}>От производства —<br>к вашему проекту.</h2><a class="catalog-cta" ${reveal('ui',.24)} href="${factory.catalog}"><span>Изучить каталог<br>стальных шаровых кранов</span><span aria-hidden="true">↗</span></a></section>`;
}

export function footerMarkup(): string {
  return `
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
}

export function landingMarkup(): string {
  return `${headerMarkup()}
    <main>
      ${aboutMarkup()}
      ${productionMarkup()}
      ${qualityMarkup()}
      ${serviceMarkup()}
      ${videoMarkup()}
      ${achievementsMarkup()}
      ${clientsMarkup()}
      ${catalogMarkup()}
    </main>
    ${footerMarkup()}`;
}
