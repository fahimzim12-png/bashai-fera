// The conductor. It owns every system, wires them together, and runs the state machine:
//   loading -> ready -> playing <-> paused -> ended
// Systems never talk to each other directly where an event will do (see EventBus).
import * as THREE from 'three';
import { CONFIG } from './Config.js';
import { EventBus } from './EventBus.js';
import { StateMachine } from './StateMachine.js';
import { Loop } from './Loop.js';
import { WakeLock } from './WakeLock.js';
import { assetUrl } from './paths.js';
import { lerp } from './MathUtil.js';
import { RouteModel } from '../world/RouteModel.js';
import { ChunkManager } from '../world/ChunkManager.js';
import { LandmarkManager } from '../world/LandmarkManager.js';
import { Environment } from '../world/Environment.js';
import { TrafficSystem } from '../city/TrafficSystem.js';
import { TrafficRenderer } from '../city/TrafficRenderer.js';
import { CrowdSystem } from '../city/CrowdSystem.js';
import { CrowdRenderer } from '../city/CrowdRenderer.js';
import { PlayerController } from '../player/PlayerController.js';
import { PlayerAvatar } from '../player/PlayerAvatar.js';
import { CameraRig } from '../camera/CameraRig.js';
import { InputManager } from '../input/InputManager.js';
import { probeGpu, createRenderer } from '../render/RendererFactory.js';
import { QualityManager } from '../render/QualityManager.js';
import { detectProfile, chooseTier, TIERS } from '../render/tiers.js';
import { createFacadeTexture } from '../render/FacadeTexture.js';
import { createRoadTexture } from '../render/RoadTexture.js';
import { createSignAtlas } from '../render/SignAtlasTexture.js';
import { blobMaterial } from '../render/BlobShadow.js';
import { Hud } from '../ui/Hud.js';
import { Overlays } from '../ui/Overlays.js';
import { DebugOverlay } from '../debug/DebugOverlay.js';
import { AudioEngine } from '../audio/AudioEngine.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const ROUTE_FILE = 'data/routes/farmgate-saarc.json';

export class Game {
  constructor(params) {
    this.params = params;
    this.bus = new EventBus();
    this.canvas = document.getElementById('gl');
    this.appEl = document.getElementById('app');
    this.ui = new Overlays(this.bus);
    this.debug = new DebugOverlay(document.getElementById('debug'));
    this.wake = new WakeLock();
    this.dirty = true;
    this.contextLost = false;
    this.frameEma = 33;
    this._p = {}; this._w = {};
    this.startS = 0;
  }

  async init() {
    const ui = this.ui;
    ui.show('loading');
    ui.setProgress(0.04, 'পথের নকশা পড়া হচ্ছে…');
    await nextFrame();

    // 1) route data (authored JSON) -> validated RouteModel
    const res = await fetch(assetUrl(ROUTE_FILE));
    if (!res.ok) throw new Error(`Could not load ${ROUTE_FILE} (HTTP ${res.status})`);
    this.route = new RouteModel(await res.json());
    if (this.params.debug) console.info('[route]', this.route.warnings);
    ui.setProgress(0.15, 'গ্রাফিক্স যাচাই হচ্ছে…');
    await nextFrame();

    // 2) device + quality tier (decided BEFORE the renderer exists, because antialiasing is fixed at creation)
    const probe = probeGpu();
    if (!probe.supported) { const e = new Error('WebGL is not available'); e.code = 'WEBGL'; throw e; }
    this.profile = detectProfile({
      userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints || 0,
      deviceMemory: navigator.deviceMemory, hardwareConcurrency: navigator.hardwareConcurrency,
      gpu: probe.gpu, dpr: window.devicePixelRatio || 1, screenW: screen.width, screenH: screen.height,
    });
    const forced = TIERS[this.params.quality] ? this.params.quality : null;
    const startTier = chooseTier(this.profile, forced);
    this.renderer = createRenderer(this.canvas, {
      antialias: TIERS[startTier].antialias,
      onLost: () => this._onContextLost(),
      onRestored: () => this._onContextRestored(),
    });
    this.quality = new QualityManager({
      renderer: this.renderer, profile: this.profile, forcedTier: forced,
      adaptive: this.params.adapt !== '0', onChange: () => this._applyTier(),
    });
    ui.setProgress(0.25, 'শহর সাজানো হচ্ছে…');
    await nextFrame();

    // 3) scene
    ui.setProgress(0.2, 'সাইনবোর্ড তৈরি হচ্ছে…');
    await nextFrame();
    const signAtlas = await createSignAtlas();              // bundled font -> readable Bengali signs
    this.scene = new THREE.Scene();
    this.env = new Environment(this.scene, this.route.lighting);
    const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const paveMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: createRoadTexture() });
    const facadeMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: createFacadeTexture('residential') });
    const facadeBMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: createFacadeTexture('commercial') });
    const signMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: signAtlas.texture });
    this.chunks = new ChunkManager({ scene: this.scene, route: this.route, groundMaterial: groundMat, paveMaterial: paveMat, facadeMaterial: facadeMat, facadeBMaterial: facadeBMat, signMaterial: signMat, aheadChunks: this.quality.tier.aheadChunks });
    this.landmarks = new LandmarkManager({ scene: this.scene, route: this.route, material: groundMat, signMaterial: signMat });
    this.traffic = new TrafficSystem({ route: this.route, bus: this.bus });
    this.traffic.attach(new TrafficRenderer({ scene: this.scene, material: groundMat, system: this.traffic }));
    this.crowd = new CrowdSystem({ route: this.route, bus: this.bus });
    this.crowd.attach(new CrowdRenderer({ scene: this.scene, material: groundMat, system: this.crowd }));
    if (this.params.audio !== '0') this.audio = new AudioEngine(this.bus);
    this.avatar = new PlayerAvatar(groundMat);
    this.scene.add(this.avatar.root);
    // contact shadow under the hero (blob decal; the real shadow map is high-tier only)
    this.avatarBlob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blobMaterial());
    this.avatarBlob.renderOrder = 2;
    this.scene.add(this.avatarBlob);

    // 4) gameplay systems
    this.startS = Math.max(0, Math.min(this.params.at || 0, this.route.length - 5));
    this.player = new PlayerController({
      length: this.route.length, speedMul: this.params.speed || 1,
      walkableAt: (s, o) => this.route.walkableAt(s, o),
    });
    this.player.reset(this.route.startLateral, this.startS);
    this.traffic.reset(this.startS);
    this.crowd.update(this.startS, 0);
    this.cameraRig = new CameraRig(this.route);
    this.input = new InputManager(this.bus, this.canvas);
    this.input.attach();
    this.hud = new Hud(this.route);
    this._applyTier();
    this._setupResize();

    // 5) build the first chunks around the start (progress bar advances chunk by chunk)
    const need = this.chunks.missing(this.startS);
    for (let i = 0; i < need.length; i++) {
      this.chunks.buildOne(need[i]);
      ui.setProgress(0.3 + 0.65 * ((i + 1) / need.length), 'রাস্তা তৈরি হচ্ছে…');
      await nextFrame();
    }
    this.cameraRig.snap(this.player.interpolate(1, this._p));
    this._wireEvents();
    this._createStates();

    this.loop = new Loop({
      update: (dt) => this.sm.update(dt),
      render: (a, dt, ms, now) => this.sm.render(a, dt, ms, now),
      step: CONFIG.sim.step, maxSteps: CONFIG.sim.maxStepsPerFrame, maxDelta: CONFIG.sim.maxFrameDelta,
      getTargetFps: () => this.quality.tier.targetFps,
    });
    this.debug.set(!!this.params.debug);

    ui.setReadyInfo({
      title: this.route.title,
      note: this.route.data.status === 'schematic' ? 'পরীক্ষামূলক সংস্করণ — পথের নকশা এখনো সরল ও যাচাই-অপেক্ষায়।' : '',
    });
    this.sm.go('ready');
    this.loop.start();
  }

  // ---- states -------------------------------------------------------------------------------
  _createStates() {
    const ui = this.ui, hud = this.hud;
    this.sm = new StateMachine({
      ready: {
        enter: () => { ui.show('ready'); hud.show(false); this.dirty = true; ui.focus('ready'); },
        render: () => this._draw(1, 0, false),
      },
      playing: {
        enter: () => {
          ui.hideAll(); hud.show(true); this.input.reset();
          if (!this._introPlayed) { this._introPlayed = true; this.cameraRig.playIntro(); }
          if (this.audio) { this.audio.start(); this.audio.duck(false); }
          this.wake.acquire(); this.quality.resetClock(); this.loop.resetTime();
          const touch = this.input.device === 'touch' || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
          hud.showTouchHint(touch);
          clearTimeout(this._hintTimer);
          this._hintTimer = setTimeout(() => hud.showTouchHint(false), 7000);
        },
        exit: () => { this.wake.release(); this.input.reset(); if (this.audio) this.audio.duck(true); },
        update: (dt) => { if (this.player.update(dt, this.input.steer)) this.bus.emit('route:end'); },
        render: (a, dt, ms, now) => this._draw(a, dt, true, ms, now),
      },
      paused: {
        enter: () => { ui.show('pause'); ui.focus('pause'); this.dirty = true; },
        render: () => { if (this.dirty) this._draw(1, 0, false); },
      },
      ended: {
        enter: () => { ui.show('end'); ui.focus('end'); this.dirty = true; },
        render: () => this._draw(1, 0, false),
      },
    });
  }

  _wireEvents() {
    const bus = this.bus;
    bus.on('ui:start', () => this.sm.go('playing'));
    bus.on('ui:resume', () => this.sm.go('playing'));
    bus.on('ui:pause', () => { if (this.sm.name === 'playing') this.sm.go('paused'); });
    bus.on('ui:restart', () => this.restart());
    bus.on('ui:fullscreen', () => this._toggleFullscreen());
    bus.on('input:pause', () => {
      if (this.sm.name === 'playing') this.sm.go('paused');
      else if (this.sm.name === 'paused') this.sm.go('playing');
    });
    bus.on('input:debugToggle', () => this.debug.toggle());
    bus.on('traffic:nearmiss', (e) => {
      this.avatar.nudge(e.strength, e.side);
      this.cameraRig.addShake(e.strength * 0.45);
      this.cameraRig.punch(e.strength);
    });
    bus.on('traffic:horn', (e) => {
      if (!this.audio) return;
      if (e.type === 'rickshaw') this.audio.bell();
      else this.audio.horn(e.type, e.side || 0);
    });
    bus.on('route:end', () => this.sm.go('ended'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.sm.name === 'playing') this.sm.go('paused'); }
      else this.wake.reacquireIfWanted();
    });
    window.addEventListener('pagehide', () => { if (this.sm.name === 'playing') this.sm.go('paused'); });

    const fs = document.getElementById('btn-fs');
    if (fs && document.fullscreenEnabled) fs.hidden = false;
  }

  restart() {
    this.player.reset(this.route.startLateral, this.startS);
    this.cameraRig.snap(this.player.interpolate(1, this._p));
    this.chunks.update(this.startS, Infinity);
    this.traffic.reset(this.startS);
    this.sm.go('playing');
  }

  _toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (this.appEl.requestFullscreen) this.appEl.requestFullscreen();
    } catch (_) { /* unsupported: ignore */ }
  }

  // ---- quality / resize / context loss -------------------------------------------------------
  _applyTier() {
    const t = this.quality.tier;
    this.chunks.aheadChunks = t.aheadChunks;
    this.env.setViewDistance(t.aheadChunks * CONFIG.world.chunkLength - 20);
    this.env.setShadows(t.shadows);
    if (this.traffic) this.traffic.setTier(t);
    if (this.crowd) this.crowd.setTier(t);
    this.dirty = true;
  }

  _setupResize() {
    const on = () => {
      const w = this.appEl.clientWidth, h = this.appEl.clientHeight;
      if (!w || !h) return;
      this.quality.resize(w, h);
      this.cameraRig.resize(w / h);
      this.dirty = true;
    };
    new ResizeObserver(on).observe(this.appEl);
    window.addEventListener('orientationchange', () => setTimeout(on, 200));
    on();
  }

  _onContextLost() {
    this.contextLost = true;
    if (this.sm && this.sm.name === 'playing') this.sm.go('paused');
    this.ui.show('context');
  }
  _onContextRestored() {
    this.contextLost = false;
    this.dirty = true;
    this.ui.show(this.sm && this.sm.name === 'paused' ? 'pause' : (this.sm && this.sm.name === 'ended' ? 'end' : 'ready'));
  }

  // ---- drawing ---------------------------------------------------------------------------------
  _draw(alpha, dt, active, frameMs = 0, now = 0) {
    if (this.contextLost) return;
    const route = this.route, p = this.player.interpolate(alpha, this._p);

    if (active) this.cameraRig.update(p, dt, { steer: this.input ? this.input.steer : 0 });
    route.space.toWorld(p.s, p.x, this._w);
    this.avatar.setPose(this._w.x, this._w.z, Math.atan2(this._w.fx, this._w.fz), p.phase,
      p.vx / CONFIG.player.lateralMaxSpeed, { dt, stride: active ? 1 : 0 });
    this.avatarBlob.position.set(this._w.x, 0.025, this._w.z);
    if (active) this.chunks.update(p.s);
    this.landmarks.update(p.s);
    if (active) this.traffic.update(p.s, p.x, dt);
    this.crowd.update(p.s, active ? dt : 0);
    if (this.audio && active) this.audio.update(p.s, route.length, this.crowd.stats.visible / this.crowd.capacity, dt);
    this.env.updateAt(p.s, route);
    this.env.setShadowFocus(this._w.x, 0, this._w.z);
    this.env.follow(this.cameraRig.camera.position);
    this.renderer.render(this.scene, this.cameraRig.camera);
    this.dirty = false;

    if (active) {
      this.hud.update(p.s);
      if (frameMs > 0) {
        this.frameEma = lerp(this.frameEma, Math.min(frameMs, 250), 0.1);
        this.quality.sample(frameMs, now);
      }
    }
    if (this.debug.enabled) this._debugInfo(now || performance.now(), p);
  }

  _debugInfo(now, p) {
    const info = this.renderer.info, q = this.quality;
    this.debug.update(now, {
      fps: 1000 / this.frameEma, frameMs: this.frameEma,
      tier: q.tier.name, scale: q.scale, pixelRatio: q.pixelRatio,
      w: this.renderer.domElement.width, h: this.renderer.domElement.height,
      cap: q.tier.targetFps, adaptive: q.aq.enabled,
      calls: info.render.calls, triangles: info.render.triangles,
      geometries: info.memory.geometries, textures: info.memory.textures,
      chunks: this.chunks.loadedCount, buildLast: this.chunks.stats.lastBuildMs, buildMax: this.chunks.stats.maxBuildMs,
      landmarks: this.landmarks.entries.length, landmarksVis: this.landmarks.visibleCount, landmarkTris: this.landmarks.stats.triangles,
      crowdVis: this.crowd.stats.visible, crowdPop: this.crowd.people.length,
      traffic: this.traffic.stats.active, nearMisses: this.traffic.stats.nearMisses,
      audio: this.audio ? (this.audio.ctx ? 'on' : 'idle') : 'off',
      s: p.s, x: p.x, segment: this.route.segmentAt(p.s).name.en,
      state: this.sm.name, device: this.input.device, change: q.lastChange,
      gpu: this.profile.gpu || 'unknown',
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0,
    });
  }
}
