// Streams the street in and out around the player: builds chunks ahead, throws away chunks far behind.
// Memory stays flat no matter how long the route is. Mesh containers are pooled and static
// (matrixAutoUpdate off), so a chunk costs almost nothing per frame.
import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { ObjectPool } from '../core/ObjectPool.js';
import { buildChunk, chunkIndexForS } from './ChunkBuilder.js';
import { toBufferGeometry } from '../render/GeometryUtil.js';

const EMPTY = new THREE.BufferGeometry();

export class ChunkManager {
  constructor({ scene, route, groundMaterial, paveMaterial = groundMaterial, facadeMaterial, facadeBMaterial = facadeMaterial, signMaterial = facadeMaterial, aheadChunks = 4 }) {
    this.scene = scene;
    this.route = route;
    this.aheadChunks = aheadChunks;
    this.behind = CONFIG.world.chunksBehind;
    this.chunks = new Map();
    this.first = chunkIndexForS(route.space.minS);
    this.last = chunkIndexForS(route.space.maxS - 1e-3);
    this.stats = { lastBuildMs: 0, maxBuildMs: 0, builds: 0, triangles: 0 };
    this.pool = new ObjectPool(() => {
      const group = new THREE.Group();
      const ground = new THREE.Mesh(EMPTY, groundMaterial);
      const pave = new THREE.Mesh(EMPTY, paveMaterial);
      const facade = new THREE.Mesh(EMPTY, facadeMaterial);
      const facadeB = new THREE.Mesh(EMPTY, facadeBMaterial);
      const signs = new THREE.Mesh(EMPTY, signMaterial);
      ground.receiveShadow = true; pave.receiveShadow = true;       // road catches the shadow map
      facade.castShadow = facade.receiveShadow = true;              // buildings cast on the high tier
      facadeB.castShadow = facadeB.receiveShadow = true;
      group.add(ground, pave, facade, facadeB, signs);
      group.matrixAutoUpdate = ground.matrixAutoUpdate = pave.matrixAutoUpdate = facade.matrixAutoUpdate = facadeB.matrixAutoUpdate = signs.matrixAutoUpdate = false;
      return { group, ground, pave, facade, facadeB, signs, tris: 0 };
    }, (e) => {
      for (const m of [e.ground, e.pave, e.facade, e.facadeB, e.signs]) { if (m.geometry !== EMPTY) m.geometry.dispose(); m.geometry = EMPTY; }
      e.tris = 0;
    });
  }

  get loadedCount() { return this.chunks.size; }

  _wanted(s) {
    const c = chunkIndexForS(Math.max(this.route.space.minS, Math.min(s, this.route.space.maxS)));
    return { lo: Math.max(this.first, c - this.behind), hi: Math.min(this.last, c + this.aheadChunks), center: c };
  }

  _build(ci) {
    const t0 = performance.now();
    const data = buildChunk(this.route, ci);
    const e = this.pool.acquire();
    e.ground.geometry = data.ground.vertexCount ? toBufferGeometry(data.ground) : EMPTY;
    e.pave.geometry = data.pave.vertexCount ? toBufferGeometry(data.pave) : EMPTY;
    e.facade.geometry = data.facade.vertexCount ? toBufferGeometry(data.facade) : EMPTY;
    e.facadeB.geometry = data.facadeB.vertexCount ? toBufferGeometry(data.facadeB) : EMPTY;
    e.signs.geometry = data.signs.vertexCount ? toBufferGeometry(data.signs) : EMPTY;
    e.ground.visible = data.ground.vertexCount > 0;
    e.pave.visible = data.pave.vertexCount > 0;
    e.facade.visible = data.facade.vertexCount > 0;
    e.facadeB.visible = data.facadeB.vertexCount > 0;
    e.signs.visible = data.signs.vertexCount > 0;
    e.tris = data.ground.triCount + data.pave.triCount + data.facade.triCount + data.facadeB.triCount + data.signs.triCount;
    this.scene.add(e.group);
    this.chunks.set(ci, e);
    const ms = performance.now() - t0;
    this.stats.lastBuildMs = ms; this.stats.maxBuildMs = Math.max(this.stats.maxBuildMs, ms); this.stats.builds++;
  }

  _unload(ci) {
    const e = this.chunks.get(ci);
    this.scene.remove(e.group);
    this.pool.release(e);
    this.chunks.delete(ci);
  }

  /** Normal per-frame call: unload far chunks, build at most `maxBuilds` missing ones (nearest first). */
  update(s, maxBuilds = CONFIG.world.maxBuildPerFrame) {
    const { lo, hi, center } = this._wanted(s);
    for (const ci of [...this.chunks.keys()]) if (ci < lo || ci > hi) this._unload(ci);
    let built = 0;
    const order = [];
    for (let ci = lo; ci <= hi; ci++) if (!this.chunks.has(ci)) order.push(ci);
    order.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
    for (const ci of order) { if (built >= maxBuilds) break; this._build(ci); built++; }
    if (built || this._tricDirty) { let t = 0; for (const e of this.chunks.values()) t += e.tris; this.stats.triangles = t; }
    return built;
  }

  /** Build everything wanted right now (loading screen, restart). */
  buildAll(s) { return this.update(s, Infinity); }

  /** Everything still missing, as a list (so the loading bar can advance chunk by chunk). */
  missing(s) {
    const { lo, hi } = this._wanted(s);
    const out = [];
    for (let ci = lo; ci <= hi; ci++) if (!this.chunks.has(ci)) out.push(ci);
    return out;
  }
  buildOne(ci) { if (!this.chunks.has(ci)) this._build(ci); }

  dispose() { for (const ci of [...this.chunks.keys()]) this._unload(ci); }
}
