import { getDebugCupSettings, type DebugCupSettings } from '../debugDock';

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Scroll-scrubbed award cup: progress drives currentTime, extra Y lags the page. */
export class AwardCup {
  private readonly art = document.querySelector<HTMLElement>('.award-art')!;
  private readonly copy = document.querySelector<HTMLElement>('.achievement-copy')!;
  private readonly videos = Array.from(document.querySelectorAll<HTMLVideoElement>('.award-cup'));
  private settings = getDebugCupSettings();
  private time = 0;
  private lastSeek = 0;

  constructor(private reduced: MediaQueryList) {
    for (const video of this.videos) {
      video.muted = true;
      video.playsInline = true;
      video.preload = 'none';
      video.pause();
      video.addEventListener('loadedmetadata', () => {
        this.time = Math.min(this.time, this.duration);
      });
    }
    const section = document.querySelector('#achievements');
    if (section) {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.attachSources();
        observer.disconnect();
      }, { rootMargin: '200% 0px' });
      observer.observe(section);
    }
    document.addEventListener('chsgs-debug-cup', (event: Event) => {
      this.settings = (event as CustomEvent<DebugCupSettings>).detail ?? this.settings;
    });
  }

  private attachSources(): void {
    for (const video of this.videos) {
      const src = video.dataset.src;
      if (!src || video.getAttribute('src') === src) continue;
      video.src = src;
      video.load();
    }
  }

  private get duration(): number {
    const ready = this.videos.find((video) => Number.isFinite(video.duration) && video.duration > 0);
    return ready?.duration ?? 8;
  }

  update(progress: number, dt: number, viewportHeight: number): void {
    const reduce = this.reduced.matches;
    const span = Math.max(0.001, this.settings.scrubEnd - this.settings.scrubStart);
    const local = clamp((progress - this.settings.scrubStart) / span);
    const target = reduce ? 0 : local * this.duration * 0.999;
    const response = reduce ? 40 : this.settings.response;
    this.time += (target - this.time) * (1 - Math.exp(-response * dt));
    const now = performance.now();
    if (now - this.lastSeek > 32) {
      let sought = false;
      for (const video of this.videos) {
        if (video.readyState >= 1 && Math.abs(video.currentTime - this.time) > 1 / 48) {
          video.currentTime = this.time;
          sought = true;
        }
      }
      if (sought) this.lastSeek = now;
    }
    if (reduce) {
      this.art.style.transform = 'none';
      this.copy.style.top = '';
      return;
    }
    const y = (this.settings.yStart + (this.settings.yEnd - this.settings.yStart) * progress) * viewportHeight / 100;
    const header = document.querySelector<HTMLElement>('.site-header');
    const pin = (header?.getBoundingClientRect().bottom ?? 88) + 24;
    const drift = (this.settings.copyYStart + (this.settings.copyYEnd - this.settings.copyYStart) * progress) * viewportHeight / 100;
    this.art.style.transform = `translate3d(${this.settings.x}vw, ${y}px, 0) scale(${this.settings.scale})`;
    this.copy.style.top = `${pin + drift}px`;
  }
}
