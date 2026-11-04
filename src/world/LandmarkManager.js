// Builds each route landmark ONCE as static merged meshes (body + optional sign-quad mesh,
// one draw call each, shared materials) and toggles visibility by distance - no per-frame
// geometry work, matrixAutoUpdate off, so landmarks cost a phone almost nothing between
// cull flips.
import * as THREE from 'three';
import { GeometryBuilder } from '../render/GeometryBuilder.js';
import { toBufferGeometry } from '../render/GeometryUtil.js';
import { buildLandmark, landmarkS } from './landmarks/registry.js';

const EMPTY = new THREE.BufferGeometry();

export class LandmarkManager {
  constructor({ scene, route, material, signMaterial = null }) {
    this.scene = scene;
    this.entries = [];
    this.stats = { triangles: 0, builds: 0 };
    for (const lm of route.landmarks || []) {
      const t0 = performance.now();
      const g = new GeometryBuilder();
      const sg = new GeometryBuilder({ uv: true });
      buildLandmark(g, sg, route, lm);
      const data = g.finish();
      const sdata = sg.finish();
      if (!data.vertexCount) continue;
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(toBufferGeometry(data), material);
      mesh.castShadow = true;                               // landmark silhouettes cast (high tier)
      mesh.receiveShadow = true;
      group.add(mesh);
      if (sdata.vertexCount && signMaterial) {
        const signMesh = new THREE.Mesh(toBufferGeometry(sdata), signMaterial);
        group.add(signMesh);
      }
      group.matrixAutoUpdate = false;
      group.updateMatrix();                                 // identity: geometry is world-space
      group.userData.landmark = lm.id;
      scene.add(group);
      this.entries.push({
        id: lm.id, kind: lm.kind,
        s: landmarkS(lm, route),
        cull: lm.cull ?? 300,
        group,
        tris: data.triCount + sdata.triCount,
        buildMs: performance.now() - t0,
      });
      this.stats.triangles += data.triCount + sdata.triCount;
      this.stats.builds++;
    }
  }

  /** Cheap per-frame call: distance culling only (a handful of comparisons). */
  update(playerS) {
    for (const e of this.entries) e.group.visible = Math.abs(e.s - playerS) <= e.cull;
  }

  get visibleCount() { return this.entries.reduce((n, e) => n + (e.group.visible ? 1 : 0), 0); }

  dispose() {
    for (const e of this.entries) {
      for (const child of e.group.children) if (child.geometry && child.geometry !== EMPTY) child.geometry.dispose();
      this.scene.remove(e.group);
    }
    this.entries = [];
  }
}
