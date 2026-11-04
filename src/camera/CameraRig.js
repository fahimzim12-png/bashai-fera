// Cinematic third-person camera v2 (Milestone 4).
// The rig no longer glues itself to the walker: position and look-target ride separate
// critically-damped springs, a time-coherent handheld sway keeps the frame alive, steering
// earns a small roll + lateral drift, near misses deliver a short FOV punch + shake, and
// progress marks trigger landmark reveal dollies (any input skips them). The opening shot
// is a 3.5-second arc that settles into the follow. Control is NEVER modified by the
// camera: every cinematic layer is additive and capped.
// NOTE: THREE is imported by relative path (not the 'three' import map) because this module
// is unit-tested in Node, where bare-package resolution would need an install. The relative
// path works identically in the browser and pins the tests to the same vendored copy.
import * as THREE from '../../vendor/three/three.module.js';
import { CONFIG } from '../core/Config.js';
import { clamp, lerp } from '../core/MathUtil.js';
import { computeVerticalFov } from './fov.js';

const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

export class CameraRig {
  constructor(route, cfg = CONFIG.camera) {
    this.route = route;
    this.cfg = cfg;
    this.camera = new THREE.PerspectiveCamera(cfg.vFovBase, 16 / 9, cfg.near, cfg.far);
    this.sCam = 0; this.xCam = 0;
    this._vS = 0; this._vX = 0;                       // spring velocities
    this._lookS = 0; this._lookX = 0;
    this._p = {}; this._l = {};
    this._shake = 0; this._punch = 0; this._time = 0;
    this._prevS = null; this._speed = 0;
    this._reveal = null; this._firedMarks = new Set();
    this._introT = -1;                                // <0 = not playing / finished
    this._swaySeed = (route.id.length % 7) * 0.931;   // deterministic per route
  }

  /** Impulse from near misses / impacts; decays exponentially in update(). */
  addShake(amp) { this._shake = Math.min(1, this._shake + amp); }

  /** Short FOV punch on near misses (decays fast, capped). */
  punch(amp) { this._punch = Math.min(1, this._punch + amp * 0.6); }

  /** Play the opening dolly once (skipped automatically after introTime). */
  playIntro() { this._introT = 0; }

  resize(aspect) {
    this.camera.aspect = aspect;
    this._applyFov();
    // tan(half horizontal FOV): how wide the view is at 1 m distance (used to keep the player on screen)
    this._tanH = Math.tan((this.camera.fov * Math.PI) / 360) * aspect;
  }

  _applyFov(speedRatio = 0) {
    const base = computeVerticalFov(this.camera.aspect, this.cfg);
    const kick = this.cfg.fovKick * clamp(speedRatio, 0, 1.3) + this.cfg.fovPunch * this._punch;
    this.camera.fov = clamp(base + kick, 40, this.cfg.vFovMax + 6);
    this.camera.updateProjectionMatrix();
  }

  // Narrow (portrait) views see very little sideways. Never let the player drift further sideways from the
  // camera than half of what the lens can show at the player's distance, otherwise he walks off-screen.
  _keepPlayerInView(player) {
    const maxOff = this.cfg.distance * (this._tanH || 1) * 0.55;
    const off = player.x - this.xCam;
    if (off > maxOff) this.xCam = player.x - maxOff;
    else if (off < -maxOff) this.xCam = player.x + maxOff;
  }

  /** Jump instantly (start of a run / restart) so the camera never swoops in from elsewhere. */
  snap(player) {
    this.sCam = player.s - this.cfg.distance;
    this.xCam = player.x * this.cfg.followLateral;
    this._lookS = player.s + this.cfg.lookAhead;
    this._lookX = this.xCam;
    this._vS = this._vX = 0;
    this._prevS = player.s;
    this._reveal = null; this._firedMarks.clear();
    this._introT = -1;
    this._keepPlayerInView(player);
    this._apply(player, 0, 0);
  }

  update(player, dt, opts = {}) {
    const c = this.cfg;
    const d = Math.max(1e-4, dt);
    this._time += d;

    // forward speed estimate (drives FOV kick + height dip)
    if (this._prevS !== null) this._speed = lerp(this._speed, Math.abs(player.s - this._prevS) / d, 0.15);
    this._prevS = player.s;
    const speedRatio = clamp(this._speed / CONFIG.player.forwardSpeed, 0, 1.3);

    // decay cinematic impulses
    this._shake = this._shake > 0.003 ? this._shake * Math.exp(-d * 4.5) : 0;
    this._punch = this._punch > 0.004 ? this._punch * Math.exp(-d * 6) : 0;

    const steer = clamp(opts.steer || 0, -1, 1);

    // ---- landmark reveals: trigger just before each progress mark -------------------------
    if (!this._reveal && this._introT < 0) {
      for (let i = 0; i < this.route.progressMarks.length; i++) {
        const mark = this.route.progressMarks[i];
        if (this._firedMarks.has(i)) continue;
        if (player.s >= mark.s - 26 && player.s < mark.s + 4) {
          this._reveal = { i, t: 0 };
          this._firedMarks.add(i);
          break;
        }
      }
    }
    let revealPull = 0, revealLook = 0;
    if (this._reveal) {
      if (Math.abs(steer) > 0.4) { this._reveal = null; }       // input skips the reveal
      else {
        this._reveal.t += d;
        const t = this._reveal.t / c.revealTime;
        if (t >= 1) this._reveal = null;
        else {
          revealPull = Math.sin(Math.PI * clamp(t, 0, 1)) * (c.revealDistance - c.distance);
          revealLook = Math.sin(Math.PI * clamp(t, 0, 1));
        }
      }
    }

    // ---- opening dolly ---------------------------------------------------------------------
    let introPos = null;
    if (this._introT >= 0) {
      if (Math.abs(steer) > 0.4) { this._introT = -1; }
      else {
        this._introT += d;
        const t = this._introT / c.introTime;
        if (t >= 1) { this._introT = -1; }
        else {
          const e = easeOut(t);
          introPos = {
            s: player.s + 6.5 - 11.1 * e,
            lat: player.x + 3.2 * (1 - e),
            h: 1.45 + (c.height - 1.45) * e,
          };
        }
      }
    }

    // ---- spring follow ----------------------------------------------------------------------
    const dist = c.distance + speedRatio * 0.4 + revealPull;
    const targetS = player.s - dist;
    const targetX = player.x * c.followLateral + steer * c.steerDrift;
    this._spring('sCam', '_vS', targetS, d);
    this._spring('xCam', '_vX', targetX, d);
    this._keepPlayerInView(player);

    // look target rides its own faster spring; lead into lateral motion
    const lookTargetS = player.s + c.lookAhead;
    const lookTargetX = lerp(this.xCam, player.x + (player.vx || 0) * 0.3, 0.4);
    this._springLook(lookTargetS, lookTargetX, d);

    this._apply(player, speedRatio, steer, introPos, revealLook);
  }

  _spring(key, vKey, target, dt) {
    const k = this.cfg.springK, cD = 2 * Math.sqrt(k) * 0.95;
    this[vKey] += (target - this[key]) * k * dt;
    this[vKey] *= Math.exp(-cD * dt);
    this[key] += this[vKey] * dt;
  }

  _springLook(targetS, targetX, dt) {
    const k = this.cfg.lookSpringK, cD = 2 * Math.sqrt(k) * 0.95;
    this._vLS = (this._vLS || 0) + (targetS - this._lookS) * k * dt;
    this._vLX = (this._vLX || 0) + (targetX - this._lookX) * k * dt;
    const e = Math.exp(-cD * dt);
    this._vLS *= e; this._vLX *= e;
    this._lookS += this._vLS * dt;
    this._lookX += this._vLX * dt;
  }

  _apply(player, speedRatio, steer, introPos = null, revealLook = 0) {
    const c = this.cfg, sp = this.route.space;
    const height = c.height - speedRatio * 0.15;
    let px, py, pz;
    if (introPos) {
      const w = sp.toWorld(introPos.s, introPos.lat, this._p);
      px = w.x; py = introPos.h; pz = w.z;
    } else {
      const w = sp.toWorld(this.sCam, this.xCam, this._p);
      px = w.x; py = height; pz = w.z;
    }
    this.camera.position.set(px, py, pz);

    // look target: normally ahead of the walker; reveals lift the gaze toward the landmark
    let lx = this._lookX, ls = this._lookS, lh = c.lookHeight;
    if (revealLook > 0) {
      const mark = this.route.progressMarks[this._reveal ? this._reveal.i : this.route.progressMarks.length - 1];
      if (mark) {
        const mw = sp.toWorld(mark.s, this.xCam * 0.5, this._l);
        lx = lerp(lx, mw.x, revealLook * 0.55);
        ls = lerp(ls, mark.s, revealLook * 0.5);
        lh = lerp(lh, 3.2, revealLook * 0.6);
      }
    }
    sp.toWorld(ls, lx, this._l);
    this.camera.lookAt(this._l.x, lh, this._l.z);

    // steering roll + handheld sway (applied AFTER lookAt so nothing fights it)
    this.camera.rotateZ(-steer * c.steerRoll);
    const t = this._time + this._swaySeed;
    const swayY = (Math.sin(t * 0.53) + 0.5 * Math.sin(t * 1.31)) * 0.66 * c.swayYawAmp;
    const swayP = (Math.sin(t * 0.41 + 1.3) + 0.5 * Math.sin(t * 1.13 + 0.4)) * 0.5 * c.swayYawAmp * 0.6;
    this.camera.rotateY(swayY);
    this.camera.rotateX(swayP);
    this.camera.position.x += Math.sin(t * 0.61) * c.swayPosAmp + Math.sin(t * 1.57) * c.swayPosAmp * 0.3;
    this.camera.position.y += Math.sin(t * 0.83 + 0.9) * c.swayPosAmp * 0.45;

    if (this._shake > 0.003) {
      // deterministic wobble (no Math.random: replay-safe and cheap)
      const s = this._shake * 0.09, tt = this._time;
      this.camera.position.x += Math.sin(tt * 43.1) * s;
      this.camera.position.y += Math.sin(tt * 57.3 + 1.7) * s * 0.55;
      this.camera.position.z += Math.cos(tt * 38.7 + 0.6) * s;
      this.camera.rotation.z += Math.sin(tt * 31.3) * this._shake * 0.012;
    }

    this._applyFov(speedRatio);
  }
}
