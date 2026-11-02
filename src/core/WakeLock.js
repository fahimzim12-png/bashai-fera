// Keeps the phone screen from dimming/locking mid-journey (where the browser supports it).
export class WakeLock {
  constructor() { this.sentinel = null; this.wanted = false; }
  async acquire() {
    this.wanted = true;
    if (!('wakeLock' in navigator) || this.sentinel) return;
    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => { this.sentinel = null; });
    } catch (_) { /* denied or unsupported: harmless */ }
  }
  release() {
    this.wanted = false;
    if (this.sentinel) { this.sentinel.release().catch(() => {}); this.sentinel = null; }
  }
  /** Browsers drop the lock when the tab is hidden: take it again when we come back. */
  reacquireIfWanted() { if (this.wanted && !this.sentinel) this.acquire(); }
}
