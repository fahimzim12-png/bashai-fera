// Touch (and mouse) controls: hold the LEFT half of the screen to steer left,
// the RIGHT half to steer right. Sliding a finger across the middle switches side.
import { PointerTracker } from './SteeringMixer.js';

export class PointerSource {
  constructor(element, bus) {
    this.el = element;
    this.bus = bus;
    this.tracker = new PointerTracker();
    this._d = (e) => {
      if (e.target.closest && e.target.closest('button, a, [data-ui]')) return;  // let buttons work
      this.tracker.down(e.pointerId, e.clientX, this._w());
      try { this.el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      this.bus.emit('input:device', e.pointerType === 'mouse' ? 'mouse' : 'touch');
      e.preventDefault();
    };
    this._m = (e) => this.tracker.move(e.pointerId, e.clientX, this._w());
    this._u = (e) => this.tracker.up(e.pointerId);
    this._ctx = (e) => e.preventDefault();   // no long-press menu on phones
  }
  _w() { return this.el.clientWidth || window.innerWidth; }
  attach() {
    this.el.addEventListener('pointerdown', this._d);
    this.el.addEventListener('pointermove', this._m);
    this.el.addEventListener('pointerup', this._u);
    this.el.addEventListener('pointercancel', this._u);
    this.el.addEventListener('lostpointercapture', this._u);
    this.el.addEventListener('contextmenu', this._ctx);
  }
  detach() {
    this.el.removeEventListener('pointerdown', this._d);
    this.el.removeEventListener('pointermove', this._m);
    this.el.removeEventListener('pointerup', this._u);
    this.el.removeEventListener('pointercancel', this._u);
    this.el.removeEventListener('lostpointercapture', this._u);
    this.el.removeEventListener('contextmenu', this._ctx);
  }
  clear() { this.tracker.clear(); }
}
