// The heartbeat. Game RULES advance in fixed 1/60 s steps (steady, reproducible, fair collisions later).
// DRAWING happens once per display frame, optionally capped (30 fps on weak phones to save heat/battery),
// and receives `alpha` (0..1) so motion is smoothly interpolated between the last two rule steps.
export class Loop {
  constructor({ update, render, step, maxSteps, maxDelta, getTargetFps = () => 0 }) {
    this.update = update; this.render = render;
    this.step = step; this.maxSteps = maxSteps; this.maxDelta = maxDelta;
    this.getTargetFps = getTargetFps;
    this.acc = 0; this.last = null; this.lastRender = null; this.running = false; this._raf = 0;
    this._tick = (now) => this._frame(now);
  }
  start() { if (this.running) return; this.running = true; this.resetTime(); this._raf = requestAnimationFrame(this._tick); }
  stop() { this.running = false; cancelAnimationFrame(this._raf); }
  resetTime() { this.last = null; this.lastRender = null; this.acc = 0; }

  _frame(now) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._tick);
    if (this.last === null) { this.last = now; this.lastRender = now; return; }
    const dt = Math.min((now - this.last) / 1000, this.maxDelta);
    this.last = now;

    this.acc += dt;
    let n = 0;
    while (this.acc >= this.step && n < this.maxSteps) { this.update(this.step); this.acc -= this.step; n++; }
    if (n === this.maxSteps) this.acc = 0;           // fell far behind: drop the backlog instead of spiralling

    const fps = this.getTargetFps();
    const interval = fps ? 1000 / fps : 0;
    if (interval && now - this.lastRender < interval - 2) return;   // frame cap: skip drawing this time
    const frameMs = now - this.lastRender;
    this.lastRender = now;
    this.render(this.acc / this.step, Math.min(frameMs / 1000, 0.1), frameMs, now);
  }
}
