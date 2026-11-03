// Third-person camera, relatively close behind the player, following the ROUTE curve (not a
// straight line) so the road stays framed on bends. A CameraDirector for cinematic shots will
// be added later on top of this.
import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { damp, lerp } from '../core/MathUtil.js';
import { computeVerticalFov } from './fov.js';

export class CameraRig {
  constructor(route, cfg = CONFIG.camera) {
    this.route = route;
    this.cfg = cfg;
    this.camera = new THREE.PerspectiveCamera(cfg.vFovBase, 16 / 9, cfg.near, cfg.far);
    this.sCam = 0; this.xCam = 0;
    this._p = {}; this._l = {};
    this._shake = 0; this._time = 0;
  }

  /** Impulse from near misses / impacts; decays exponentially in update(). */
  addShake(amp) { this._shake = Math.min(1, this._shake + amp); }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = computeVerticalFov(aspect, this.cfg);
    this.camera.updateProjectionMatrix();
    // tan(half horizontal FOV): how wide the view is at 1 m distance (used to keep the player on screen)
    this._tanH = Math.tan((this.camera.fov * Math.PI) / 360) * aspect;
  }

  // Narrow (portrait) views see very little sideways. Never let the player drift further sideways from the
  // camera than half of what the lens can show at the player's distance, otherwise he walks off-screen.
  _keepPlayerInView(player) {
    const maxOff = this.cfg.distance * (this._tanH || 1) * 0.5;
    const off = player.x - this.xCam;
    if (off > maxOff) this.xCam = player.x - maxOff;
    else if (off < -maxOff) this.xCam = player.x + maxOff;
  }

  /** Jump instantly (start of a run / restart) so the camera never swoops in from elsewhere. */
  snap(player) {
    this.sCam = player.s - this.cfg.distance;
    this.xCam = player.x * this.cfg.followLateral;
    this._keepPlayerInView(player);
    this._apply(player);
  }

  update(player, dt) {
    const c = this.cfg;
    this._time += dt;
    this.sCam = damp(this.sCam, player.s - c.distance, c.damping * 1.6, dt);
    this.xCam = damp(this.xCam, player.x * c.followLateral, c.damping, dt);
    this._keepPlayerInView(player);
    this._shake = this._shake > 0.003 ? this._shake * Math.exp(-dt * 4.5) : 0;
    this._apply(player);
  }

  _apply(player) {
    const c = this.cfg, sp = this.route.space;
    sp.toWorld(this.sCam, this.xCam, this._p);
    this.camera.position.set(this._p.x, c.height, this._p.z);
    // cinematic look: lead slightly into the walker's lateral motion
    const lean = player.vx || 0;
    sp.toWorld(player.s + c.lookAhead, lerp(this.xCam, player.x + lean * 0.22, 0.35), this._l);
    this.camera.lookAt(this._l.x, c.lookHeight, this._l.z);
    if (this._shake > 0.003) {
      // deterministic wobble (no Math.random: replay-safe and cheap)
      const s = this._shake * 0.09, t = this._time;
      this.camera.position.x += Math.sin(t * 43.1) * s;
      this.camera.position.y += Math.sin(t * 57.3 + 1.7) * s * 0.55;
      this.camera.position.z += Math.cos(t * 38.7 + 0.6) * s;
      this.camera.rotation.z += Math.sin(t * 31.3) * this._shake * 0.012;
    }
  }
}
