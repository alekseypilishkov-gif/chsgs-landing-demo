/** A light desktop wheel filter that preserves native touch and keyboard scroll. */
export class SmoothPageScroll {
  // About 0.13 interpolation at 60 fps: present input stays direct while the
  // remaining travel settles with a short, restrained continuation.
  private readonly response = 8.5;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private target = window.scrollY;
  private current = window.scrollY;
  private frame = 0;
  private lastTime = 0;
  private lastWritten = window.scrollY;

  constructor() {
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('scroll', this.onNativeScroll, { passive: true });
    this.reduced.addEventListener('change', this.onMotionPreferenceChange);
  }

  private onMotionPreferenceChange = (): void => {
    if (!this.reduced.matches) return;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.target = this.current = window.scrollY;
  };

  private onNativeScroll = (): void => {
    if (Math.abs(window.scrollY - this.lastWritten) > 1) this.target = this.current = window.scrollY;
  };

  private onWheel = (event: WheelEvent): void => {
    if (this.reduced.matches || event.ctrlKey || document.body.classList.contains('is-loading')) return;
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (!maximum) return;
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1;
    const delta = (event.shiftKey ? event.deltaX : event.deltaY) * unit;
    if (!delta) return;
    const next = Math.max(0, Math.min(maximum, this.target + delta));
    if (next === this.target) return;
    event.preventDefault();
    this.target = next;
    this.current = window.scrollY;
    if (!this.frame) { this.lastTime = performance.now(); this.frame = requestAnimationFrame(this.tick); }
  };

  private tick = (now: number): void => {
    const dt = Math.min(.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.current += (this.target - this.current) * (1 - Math.exp(-this.response * dt));
    this.lastWritten = this.current;
    window.scrollTo(0, this.current);
    if (Math.abs(this.target - this.current) < .25) {
      this.current = this.target;
      this.lastWritten = this.target;
      window.scrollTo(0, this.target);
      this.frame = 0;
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };
}
