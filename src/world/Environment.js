// Sky, sun, fog and the two lights. Deliberately restrained: one hemisphere light + one
// directional light, NO real-time shadows (too costly for a Redmi 9).
// Milestone 2: per-district "moods" (route JSON) tint fog + hemisphere ground along s,
// blended across segment boundaries - a few colour writes per frame, no new GPU cost.
import * as THREE from 'three';
import { smoothstep } from '../core/MathUtil.js';

export class Environment {
  constructor(scene, lighting) {
    this.scene = scene;
    const fog = new THREE.Color(lighting.fog);
    scene.background = fog.clone();
    scene.fog = new THREE.Fog(fog, 60, 220);

    this.hemi = new THREE.HemisphereLight(lighting.hemiSky, lighting.hemiGround, lighting.hemiIntensity);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(lighting.sunColor, lighting.sunIntensity);
    const d = lighting.sunDir;
    this._sunDir = new THREE.Vector3(d[0], d[1], d[2]).normalize();   // kept for shadow focus
    this.sun.position.set(d[0], d[1], d[2]).normalize().multiplyScalar(100);
    scene.add(this.sun);

    // base mood = the global lighting block; district moods are deltas on top of it
    this._default = { fog: new THREE.Color(lighting.fog), ground: new THREE.Color(lighting.hemiGround), density: 1 };
    this._moodFog = new THREE.Color(); this._moodGrd = new THREE.Color(); this._mix = new THREE.Color();
    this._viewDist = 220;
    this._moodCache = null;

    // gradient sky dome (vertex colours): hazy warm horizon -> blue overhead
    const geo = new THREE.SphereGeometry(500, 16, 10);
    const top = new THREE.Color(lighting.skyTop), hor = new THREE.Color(lighting.skyHorizon);
    const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = Math.max(0, pos.getY(i) / 500);
      c.copy(hor).lerp(top, Math.pow(y, 0.55));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    // soft sun disc low in the sky
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(26, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff0c8, fog: false, depthWrite: false, transparent: true, opacity: 0.9 }),
    );
    sunDisc.position.copy(this.sun.position).normalize().multiplyScalar(470);
    sunDisc.lookAt(0, 0, 0);
    sunDisc.renderOrder = -9;
    this.dome.add(sunDisc);
  }

  /** Fog must hide chunk pop-in: it reaches full density a bit before the last streamed chunk ends. */
  setViewDistance(metres) {
    this._viewDist = metres;
    this._applyMood(this._curMood || this._default);
  }

  /** Parse route.data.moods once per route (id -> colours + density). */
  _moodsOf(route) {
    if (this._moodCache && this._moodCache.route === route) return this._moodCache.map;
    const map = new Map();
    for (const [id, m] of Object.entries(route.data.moods || {})) {
      if (!m || typeof m !== 'object' || id === 'note') continue;
      map.set(id, {
        fog: m.fog ? new THREE.Color(m.fog) : this._default.fog,
        ground: m.hemiGround ? new THREE.Color(m.hemiGround) : this._default.ground,
        density: Number.isFinite(m.density) ? m.density : 1,
      });
    }
    this._moodCache = { route, map };
    return map;
  }

  /** Per-frame (cheap): district fog/tint at route position s, blended across segment boundaries. */
  updateAt(s, route) {
    const segs = route.segments;
    const i = route.segmentIndexAt(s);
    const map = this._moodsOf(route);
    const blend = segs[i].blend ?? 24;
    let mood;
    if (i > 0 && s < segs[i].s0 + blend) {
      const prev = map.get(segs[i - 1].id) || this._default;
      const cur = map.get(segs[i].id) || this._default;
      const t = smoothstep((s - segs[i].s0) / blend);
      this._mix.copy(prev.fog).lerp(cur.fog, t);
      this._moodFog.copy(this._mix);
      this._mix.copy(prev.ground).lerp(cur.ground, t);
      this._moodGrd.copy(this._mix);
      mood = { fog: this._moodFog, ground: this._moodGrd, density: prev.density + (cur.density - prev.density) * t };
    } else {
      mood = map.get(segs[i].id) || this._default;
    }
    this._curMood = mood;
    this._applyMood(mood);
  }

  _applyMood(m) {
    this.scene.fog.color.copy(m.fog);
    this.scene.background.copy(m.fog);
    this.hemi.groundColor.copy(m.ground);
    const far = this._viewDist / m.density;
    this.scene.fog.far = far;
    this.scene.fog.near = far * 0.22;
  }

  follow(cameraPosition) { this.dome.position.copy(cameraPosition); }

  // ---- Milestone 4: real shadows on the high tier ------------------------------------------
  // ONE directional shadow map with a tight ortho box that follows the player. Low/medium
  // tiers keep the free blob decals only. Sun geometry never changes - only this map.
  setShadows(enabled) {
    const want = !!enabled;
    if (this._shadowsOn === want) return;
    this._shadowsOn = want;
    this.sun.castShadow = want;
    if (want && !this._shadowConfigured) {
      this._shadowConfigured = true;
      const s = this.sun.shadow;
      s.mapSize.set(1024, 1024);
      s.camera.left = -45; s.camera.right = 45;
      s.camera.top = 45; s.camera.bottom = -45;
      s.camera.near = 20; s.camera.far = 260;
      s.bias = -0.0008;
      s.normalBias = 0.6;
    }
    if (this._shadowTarget) {
      this.sun.target.position.copy(this._shadowTarget);
      this.sun.target.updateMatrixWorld();
    }
  }

  /** Keep the shadow frustum centred on the player (cheap: two vector writes). */
  setShadowFocus(x, y, z) {
    if (!this._shadowTarget) {
      this._shadowTarget = new THREE.Object3D();
      this.scene.add(this._shadowTarget);
      this.sun.target = this._shadowTarget;
    }
    this._shadowTarget.position.set(x, y, z);
    this._shadowTarget.updateMatrixWorld();
    this.sun.position.set(
      this._shadowTarget.position.x + this._sunDir[0] * 100,
      this._shadowTarget.position.y + this._sunDir[1] * 100,
      this._shadowTarget.position.z + this._sunDir[2] * 100,
    );
  }
}
