// Sky, sun, fog and the two lights (Milestone 5 rewrite).
//
// The old flat vertex-colour dome became ONE painted canvas sky: a warm Dhaka-afternoon
// gradient, soft cumulus banks along the horizon and a haze band — painted once at
// start-up, zero per-frame cost. The art direction lives in paintSky() so other times of
// day can be introduced later by painting a different canvas (the lighting JSON already
// carries per-district moods).
//
// The sun stays a real placed disc (halo + core) so its direction always matches the
// directional light that drives the shadow map. Shadow map SIZE now follows the quality
// tier (M5 raised the hardware target: medium = 1024, high = 2048).
import * as THREE from 'three';
import { smoothstep } from '../core/MathUtil.js';
import { Rng } from '../core/Rng.js';

/** Paints the daytime sky: gradient + cumulus banks + haze. Returns a CanvasTexture.
 * M5 photo regrade: saturated azure overhead melting into golden dust — the sky the
 * 41-photo reference board actually shows (deep #4e86bd zenith, cream #f5d9a4 horizon),
 * sun-warmed cloud tops instead of grey cotton. */
export function paintSky({ skyTop, skyHorizon, seed = 'sky-m5' } = {}) {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const rng = new Rng(seed);
  const top = skyTop || '#5e93c6', hor = skyHorizon || '#f5d9a4';

  // vertical gradient: saturated azure overhead -> pale blue -> warm gold AT the horizon
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(0.26, '#6fa6cf');
  g.addColorStop(0.4, '#a9c4d2');
  g.addColorStop(0.47, '#e8cf9e');
  g.addColorStop(0.5, hor);
  g.addColorStop(1, hor);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // distant haze band hovering just above the horizon line (golden dust, Dhaka dry season)
  const hz = ctx.createLinearGradient(0, H * 0.40, 0, H * 0.52);
  hz.addColorStop(0, 'rgba(255,236,200,0)');
  hz.addColorStop(0.6, 'rgba(255,236,200,0.42)');
  hz.addColorStop(1, 'rgba(255,236,200,0)');
  ctx.fillStyle = hz;
  ctx.fillRect(0, H * 0.40, W, H * 0.12);

  // cumulus banks: clusters of soft ellipses riding ABOVE the horizon (v > 0.5 = sky),
  // wrapped at the u seam. Cream-white tops, warm-grey bellies (sun-lit, not overcast).
  const cloud = (cx, cy, s, alpha) => {
    for (const ox of [0, -W, W]) {                       // draw thrice: seamless wrap
      const x0 = cx + ox;
      ctx.fillStyle = `rgba(255,251,240,${alpha})`;
      for (let b = 0; b < 5; b++) {
        const bx = x0 + (b - 2) * 26 * s + (rng.next() - 0.5) * 14 * s;
        const by = cy + (rng.next() - 0.5) * 8 * s;
        ctx.beginPath();
        ctx.ellipse(bx, by, (26 + rng.next() * 22) * s, (11 + rng.next() * 8) * s, 0, 0, 7);
        ctx.fill();
      }
      // shaded belly
      ctx.fillStyle = `rgba(224,206,180,${alpha * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(x0 + (rng.next() - 0.5) * 30 * s, cy + 9 * s, 44 * s, 8 * s, 0, 0, 7);
      ctx.fill();
    }
  };
  for (let i = 0; i < 9; i++) {
    const cx = rng.next() * W;
    const cy = H * (0.28 + rng.next() * 0.13);           // well above the horizon line
    cloud(cx, cy, 0.7 + rng.next() * 0.9, 0.5 + rng.next() * 0.3);
  }
  for (let i = 0; i < 6; i++) {                          // faint far strip hugging the haze
    const cx = rng.next() * W, cy = H * (0.415 + rng.next() * 0.05);
    cloud(cx, cy, 0.5 + rng.next() * 0.4, 0.28 + rng.next() * 0.18);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;                      // u wraps the sphere
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 1;
  return tex;
}

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

    // M5 photo regrade: a cool fill from the opposite sky quadrant. Lambert has no ambient
    // occlusion or environment probes — without this, every sun-away face goes muddy grey.
    // A subtle azure bounce restores the blue-vs-gold complementary that the photos show.
    this.fill = new THREE.DirectionalLight('#a9c3d8', 0.55);
    this.fill.position.set(-d[0] * 80, 60, -d[2] * 80);
    scene.add(this.fill);

    // base mood = the global lighting block; district moods are deltas on top of it
    this._default = { fog: new THREE.Color(lighting.fog), ground: new THREE.Color(lighting.hemiGround), density: 1 };
    this._moodFog = new THREE.Color(); this._moodGrd = new THREE.Color(); this._mix = new THREE.Color();
    this._viewDist = 220;
    this._moodCache = null;

    // painted sky dome (M5): gradient + cumulus + haze in one canvas texture
    const geo = new THREE.SphereGeometry(500, 24, 12);
    this.dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: paintSky({ skyTop: lighting.skyTop, skyHorizon: lighting.skyHorizon, seed: lighting.skySeed || 'sky-m5' }),
      side: THREE.BackSide, fog: false, depthWrite: false,
    }));
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    // sun disc + double halo, placed to match the directional light exactly.
    // M5 regrade: two warm halos (wide dust glow + tight core) so the sky carries the sun.
    const sunGroup = new THREE.Group();
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(72, 24),
      new THREE.MeshBasicMaterial({ color: 0xffdf9e, fog: false, depthWrite: false, transparent: true, opacity: 0.30 }),
    );
    const halo2 = new THREE.Mesh(
      new THREE.CircleGeometry(38, 22),
      new THREE.MeshBasicMaterial({ color: 0xfff0c2, fog: false, depthWrite: false, transparent: true, opacity: 0.5 }),
    );
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff8e0, fog: false, depthWrite: false, transparent: true, opacity: 0.98 }),
    );
    halo.position.z = -2;
    halo2.position.z = -1;
    sunGroup.add(halo, halo2, sunDisc);
    sunGroup.position.copy(this.sun.position).normalize().multiplyScalar(470);
    sunGroup.lookAt(0, 0, 0);
    sunGroup.renderOrder = -9;
    this.dome.add(sunGroup);
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
    this.scene.fog.near = far * 0.45;                    // M5 regrade: haze starts deeper, the city stays crisp
  }

  follow(cameraPosition) { this.dome.position.copy(cameraPosition); }

  // ---- Real shadows on the capable tiers ----------------------------------------------------
  // ONE directional shadow map with a tight ortho box that follows the player. The map
  // size follows the tier (medium 1024 / high 2048) — resizing disposes the old map.
  setShadows(enabled, size = 1024) {
    const want = !!enabled;
    if (this._shadowsOn === want && this._shadowSize === size) return;
    this._shadowSize = size;
    this._shadowsOn = want;
    this.sun.castShadow = want;
    if (!this._shadowConfigured) {
      this._shadowConfigured = true;
      const s = this.sun.shadow;
      s.camera.left = -45; s.camera.right = 45;
      s.camera.top = 45; s.camera.bottom = -45;
      s.camera.near = 20; s.camera.far = 260;
      s.bias = -0.0008;
      s.normalBias = 0.6;
    }
    const s = this.sun.shadow;
    if (s.mapSize.x !== size) {
      if (s.map) { s.map.dispose(); s.map = null; }      // force re-allocation at the new size
      s.mapSize.set(size, size);
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
