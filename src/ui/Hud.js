// The in-game HUD (plain HTML over the canvas, so Bangla text renders perfectly).
// DOM is touched only when a value actually changes: DOM writes are expensive on phones.
import { bnNumber } from './format.js';

export class Hud {
  constructor(route) {
    this.route = route;
    this.root = document.getElementById('hud');
    this.fill = document.getElementById('hud-bar-fill');
    this.bar = document.getElementById('hud-bar');
    this.placeBn = document.getElementById('hud-place-bn');
    this.placeEn = document.getElementById('hud-place-en');
    this.dist = document.getElementById('hud-dist');
    this.total = document.getElementById('hud-total');
    this.touchHint = document.getElementById('touch-hint');
    this._seg = -1; this._pct = -1; this._m = -1;
    this.total.textContent = `${bnNumber(route.length)} মি`;
    for (const m of route.progressMarks) {                     // dots on the progress bar
      const dot = document.createElement('i');
      dot.className = 'mark'; dot.style.left = `${(m.s / route.length) * 100}%`;
      dot.title = `${m.label.bn} · ${m.label.en}`;
      this.bar.appendChild(dot);
    }
  }
  show(v) { this.root.hidden = !v; }
  update(s) {
    const r = this.route;
    const i = r.segmentIndexAt(s);
    if (i !== this._seg) {
      this._seg = i;
      this.placeBn.textContent = r.segments[i].name.bn;
      this.placeEn.textContent = r.segments[i].name.en;
    }
    const pct = Math.round((s / r.length) * 500) / 500;
    if (pct !== this._pct) { this._pct = pct; this.fill.style.transform = `scaleX(${pct})`; }
    const m = Math.floor(s);
    if (m !== this._m) { this._m = m; this.dist.textContent = bnNumber(m); }
  }
  showTouchHint(v) { this.touchHint.classList.toggle('show', v); }
}
