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
  }

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
    this.sCam = damp(this.sCam, player.s - c.distance, c.damping * 1.6, dt);
    this.xCam = damp(this.xCam, player.x * c.followLateral, c.damping, dt);
    this._keepPlayerInView(player);
    this._apply(player);
  }

  _apply(player) {
    const c = this.cfg, sp = this.route.space;
    sp.toWorld(this.sCam, this.xCam, this._p);
    this.camera.position.set(this._p.x, c.height, this._p.z);
    sp.toWorld(player.s + c.lookAhead, lerp(this.xCam, player.x, 0.35), this._l);
    this.camera.lookAt(this._l.x, c.lookHeight, this._l.z);
  }
}
