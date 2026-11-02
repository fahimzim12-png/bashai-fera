// Developer overlay: open the game with ?debug=1 (or press the ` key). Screenshot it when reporting performance.
export class DebugOverlay {
  constructor(el) { this.el = el; this.enabled = false; this._t = 0; }
  set(on) { this.enabled = on; this.el.hidden = !on; }
  toggle() { this.set(!this.enabled); }
  update(now, info) {
    if (!this.enabled || now - this._t < 250) return;      // refresh 4x per second
    this._t = now;
    const i = info;
    this.el.textContent = [
      `fps ${i.fps.toFixed(0)}   frame ${i.frameMs.toFixed(1)} ms`,
      `tier ${i.tier}  scale ${i.scale.toFixed(2)}  px-ratio ${i.pixelRatio.toFixed(2)}`,
      `canvas ${i.w}x${i.h}  cap ${i.cap ? i.cap + ' fps' : 'none'}  adapt ${i.adaptive ? 'on' : 'off'}`,
      `draw calls ${i.calls}   triangles ${i.triangles}`,
      `geometries ${i.geometries}  textures ${i.textures}`,
      `chunks ${i.chunks}  build last ${i.buildLast.toFixed(1)} ms  max ${i.buildMax.toFixed(1)} ms`,
      `s ${i.s.toFixed(1)} m   x ${i.x.toFixed(2)} m   ${i.segment}`,
      `state ${i.state}   device ${i.device}`,
      i.change ? `last quality change: ${i.change.kind} -> ${i.change.tier} @${i.change.scale} (${i.change.reason})` : 'no quality changes',
      `gpu ${i.gpu}`,
      i.heap ? `js heap ${i.heap} MB` : '',
    ].filter(Boolean).join('\n');
  }
}
