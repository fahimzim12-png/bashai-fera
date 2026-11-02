// The player simulation (no graphics): automatic forward walking along the route,
// player-controlled sideways steering. Runs in fixed 1/60 s steps.
//
// Future systems plug in through `speedScale` and `steerScale` (e.g. a stumble sets
// steerScale to 0 for a moment). No such effects exist yet.
import { CONFIG } from '../core/Config.js';
import { clamp, lerp } from '../core/MathUtil.js';

export class PlayerController {
  constructor({ length, walkableAt, speedMul = 1, cfg = CONFIG.player }) {
    this.cfg = cfg;
    this.length = length;
    this.walkableAt = walkableAt;
    this.speedMul = speedMul;
    this.speedScale = 1;
    this.steerScale = 1;
    this._w = { min: -1, max: 1 };
    this.s = 0; this.x = 0; this.vx = 0; this.phase = 0; this.finished = false;
    this.prev = { s: 0, x: 0, vx: 0, phase: 0 };
  }

  reset(x = 0, s = 0) {
    this.s = s; this.x = x; this.vx = 0; this.phase = 0; this.finished = false;
    this._store();
  }

  _store() { const p = this.prev; p.s = this.s; p.x = this.x; p.vx = this.vx; p.phase = this.phase; }

  /** Advance one fixed step. `steer` is -1..+1. Returns true on the step the route end is reached. */
  update(dt, steer) {
    this._store();
    if (this.finished) { this.vx = 0; return false; }
    const c = this.cfg;

    // sideways motion: accelerate toward the wanted speed, brake when no input
    const wanted = clamp(steer, -1, 1) * this.steerScale * c.lateralMaxSpeed;
    const a = steer !== 0 ? c.lateralAccel : c.lateralBrake;
    this.vx += clamp(wanted - this.vx, -a * dt, a * dt);
    this.x += this.vx * dt;

    // automatic forward walking
    const step = c.forwardSpeed * this.speedMul * this.speedScale * dt;
    this.s = Math.min(this.length, this.s + step);
    this.phase += step * c.strideRate;

    // stay inside the walkable strip at the new position
    const w = this.walkableAt(this.s, this._w);
    if (this.x < w.min) { this.x = w.min; if (this.vx < 0) this.vx = 0; }
    if (this.x > w.max) { this.x = w.max; if (this.vx > 0) this.vx = 0; }

    if (this.s >= this.length) { this.finished = true; return true; }
    return false;
  }

  /** State blended between the last two fixed steps (smooth on any refresh rate). */
  interpolate(alpha, out = {}) {
    const p = this.prev;
    out.s = lerp(p.s, this.s, alpha);
    out.x = lerp(p.x, this.x, alpha);
    out.vx = lerp(p.vx, this.vx, alpha);
    out.phase = lerp(p.phase, this.phase, alpha);
    return out;
  }
}
