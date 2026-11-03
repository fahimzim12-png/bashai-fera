// Builds each route landmark ONCE as a static merged mesh (one draw call each, shared
// ground material) and toggles visibility by distance - no per-frame geometry work,
// matrixAutoUpdate off, so landmarks cost a phone almost nothing between cull flips.
import * as THREE from 'three';
import { GeometryBuilder } from '../render/GeometryBuilder.js';
import { toBufferGeometry } from '../render/GeometryUtil.js';
import { buildLandmark, landmarkS } from './landmarks/registry.js';

export class LandmarkManager {
  constructor({ scene, route, material }) {
    this.scene = scene;
    this.entries = [];
    this.stats = { triangles: 0, builds: 0 };
    for (const lm of route.landmarks || []) {
      const t0 = performance.now();
      const g = new GeometryBuilder();
      buildLandmark(g, route, lm);
      const data = g.finish();
      if (!data.vertexCount) continue;
      const mesh = new THREE.Mesh(toBufferGeometry(data), material);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();                                  // identity: geometry is world-space
      mesh.userData.landmark = lm.id;
      scene.add(mesh);
      this.entries.push({
        id: lm.id, kind: lm.kind,
        s: landmarkS(lm, route),
        cull: lm.cull ?? 300,
        mesh, tris: data.triCount,
        buildMs: performance.now() - t0,
      });
      this.stats.triangles += data.triCount;
      this.stats.builds++;
    }
  }

  /** Cheap per-frame call: distance culling only (a handful of comparisons). */
  update(playerS) {
    for (const e of this.entries) e.mesh.visible = Math.abs(e.s - playerS) <= e.cull;
  }

  get visibleCount() { return this.entries.reduce((n, e) => n + (e.mesh.visible ? 1 : 0), 0); }

  dispose() {
    for (const e of this.entries) {
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
    }
    this.entries = [];
  }
}
