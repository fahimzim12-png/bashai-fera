// Full-screen panels (loading, ready, pause, end, graphics-paused). Buttons carry data-action="..."
// and are turned into bus events ("ui:start", "ui:resume", ...) so this file knows nothing about game rules.
const NAMES = ['loading', 'ready', 'pause', 'end', 'context'];

export class Overlays {
  constructor(bus) {
    this.bus = bus;
    this.el = {};
    for (const n of NAMES) this.el[n] = document.getElementById(`ov-${n}`);
    this.bar = document.getElementById('load-fill');
    this.loadText = document.getElementById('load-text');
    document.getElementById('app').addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (b) { e.preventDefault(); bus.emit(`ui:${b.dataset.action}`); }
    });
  }
  show(name) { for (const n of NAMES) this.el[n].hidden = n !== name; }
  hideAll() { for (const n of NAMES) this.el[n].hidden = true; }
  setProgress(fraction, textBn) {
    this.bar.style.transform = `scaleX(${Math.max(0.02, Math.min(1, fraction))})`;
    if (textBn) this.loadText.textContent = textBn;
  }
  setReadyInfo({ title, note }) {
    document.getElementById('ready-title-bn').textContent = title.bn;
    document.getElementById('ready-title-en').textContent = title.en;
    document.getElementById('ready-note').textContent = note;
  }
  focus(name) { const b = this.el[name] && this.el[name].querySelector('button[data-action]'); if (b) b.focus({ preventScroll: true }); }
}
