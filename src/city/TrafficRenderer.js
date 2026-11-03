// GPU side of the traffic system: one InstancedMesh per vehicle type, per-vehicle tint
// via instanceColor, matrices written by TrafficSystem each frame. Split from the sim
// so the simulation itself stays pure (unit-testable headless, see traffic.test.mjs).
import * as THREE from 'three';
import { toBufferGeometry } from '../render/GeometryUtil.js';
import { buildVehicleGeometries, VEHICLE_SPECS } from './vehicleModels.js';

export class TrafficRenderer {
  /** @param {{scene:THREE.Scene, material:THREE.Material, system:object}} deps */
  constructor({ scene, material, system }) {
    this.system = system;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._one = new THREE.Vector3(1, 1, 1);
    this._zero = new THREE.Vector3(0, 0, 0);
    this._up = new THREE.Vector3(0, 1, 0);
    this._colour = new THREE.Color();

    const geos = buildVehicleGeometries();
    this.meshes = {};
    for (const type of Object.keys(system.counts)) {
      const mesh = new THREE.InstancedMesh(toBufferGeometry(geos[type]), material, system.counts[type]);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      for (const v of system.byType[type]) {
        this._colour.set(VEHICLE_SPECS[type].colours[v.colourIdx % VEHICLE_SPECS[type].colours.length]);
        mesh.setColorAt(v.instIdx, this._colour);
        mesh.setMatrixAt(v.instIdx, this._m.compose(this._v.set(0, 0, 0), this._q.identity(), this._zero));
      }
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      this.meshes[type] = mesh;
    }
  }

  /** called via system.attach() - kept for symmetry, work already done above */
  build(_) {}

  /** Hide instances beyond the tier's active count (idx >= n get a zero scale). */
  setActive(type, n) {
    const mesh = this.meshes[type], sys = this.system;
    for (const v of sys.byType[type]) {
      if (v.instIdx >= n) mesh.setMatrixAt(v.instIdx, this._m.compose(this._v.set(0, -50, 0), this._q.identity(), this._zero));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  writeVehicle(type, instIdx, x, z, yaw) {
    this._m.compose(this._v.set(x, 0, z), this._q.setFromAxisAngle(this._up, yaw), this._one);
    this.meshes[type].setMatrixAt(instIdx, this._m);
  }

  flush() {
    for (const type in this.meshes) this.meshes[type].instanceMatrix.needsUpdate = true;
  }
}
