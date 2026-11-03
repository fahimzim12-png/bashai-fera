// GPU side of the crowd: 7 instanced part meshes = 8 draw calls for the entire
// population (head has two variants). CrowdSystem feeds per-slot poses in route/world
// space; this class composes joint matrices and per-instance clothing colours.
import * as THREE from 'three';
import { toBufferGeometry } from '../render/GeometryUtil.js';
import { buildCrowdGeometries, CROWD_JOINTS, CROWD_PARTS } from './characterKit.js';

// Parts that have a left and a right instance per person (slot*2, slot*2+1).
const PAIRED = new Set(['upperArm', 'lowerArm', 'upperLeg', 'lowerLeg']);

export class CrowdRenderer {
  /** @param {{scene:THREE.Scene, material:THREE.Material, system:object}} deps */
  constructor({ scene, material, system }) {
    this.system = system;
    const cap = system.capacity;
    const geos = buildCrowdGeometries();
    this.meshes = {}; this.cap = cap;
    for (const part of CROWD_PARTS) {
      const n = PAIRED.has(part) ? cap * 2 : cap;
      const mesh = new THREE.InstancedMesh(toBufferGeometry(geos[part]), material, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.meshes[part] = mesh;
    }
    this._m = new THREE.Matrix4(); this._qY = new THREE.Quaternion();
    this._qX = new THREE.Quaternion(); this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3(); this._j = new THREE.Vector3();
    this._one = new THREE.Vector3(1, 1, 1); this._zero = new THREE.Vector3(0, 0, 0);
    this._up = new THREE.Vector3(0, 1, 0); this._c = new THREE.Color();
    this._X = new THREE.Vector3(1, 0, 0);
  }

  build(_) {}

  _hideAll(slot) {
    for (const part of CROWD_PARTS) {
      const mesh = this.meshes[part];
      if (PAIRED.has(part)) {
        mesh.setMatrixAt(slot * 2, this._m.compose(this._v.set(0, -60, 0), this._q.identity(), this._zero));
        mesh.setMatrixAt(slot * 2 + 1, this._m.compose(this._v.set(0, -60, 0), this._q.identity(), this._zero));
      } else mesh.setMatrixAt(slot, this._m.compose(this._v.set(0, -60, 0), this._q.identity(), this._zero));
    }
  }

  hide(slot) { this._hideAll(slot); this.flush(); }

  setCapacity(n) { this.cap = n; }

  /** Instance clothing colours (called when a slot gets a new person). */
  setColours(slot, p) {
    const c = p.colours;
    const headMesh = this.meshes[p.variant];
    const otherHead = this.meshes[p.variant === 'headA' ? 'headB' : 'headA'];
    this._c.set(c.skin); headMesh.setColorAt(slot, this._c);
    this._c.set(1, 1, 1); otherHead.setColorAt(slot, this._c);
    this._c.set(c.torso); this.meshes.torso.setColorAt(slot, this._c);
    this._c.set(c.arm);
    this.meshes.upperArm.setColorAt(slot * 2, this._c); this.meshes.upperArm.setColorAt(slot * 2 + 1, this._c);
    this._c.set(c.skin);
    this.meshes.lowerArm.setColorAt(slot * 2, this._c); this.meshes.lowerArm.setColorAt(slot * 2 + 1, this._c);
    this._c.set(c.legs);
    this.meshes.upperLeg.setColorAt(slot * 2, this._c); this.meshes.upperLeg.setColorAt(slot * 2 + 1, this._c);
    this.meshes.lowerLeg.setColorAt(slot * 2, this._c); this.meshes.lowerLeg.setColorAt(slot * 2 + 1, this._c);
    for (const part of CROWD_PARTS) if (this.meshes[part].instanceColor) this.meshes[part].instanceColor.needsUpdate = true;
  }

  _part(part, idx, jx, jy, jz, yaw, rotX, x, z, rootY, scale) {
    this._j.set(jx * scale, jy * scale + rootY, jz * scale).applyAxisAngle(this._up, yaw);
    this._qY.setFromAxisAngle(this._up, yaw);
    this._qX.setFromAxisAngle(this._X, rotX);
    this._q.multiplyQuaternions(this._qY, this._qX);
    this._v.set(x + this._j.x, this._j.y, z + this._j.z);
    this._m.compose(this._v, this._q, this._j.set(scale, scale, scale));
    this.meshes[part].setMatrixAt(idx, this._m);
  }

  /** Compose every body part of one person. pose keys: see CrowdSystem. */
  writePerson(slot, pose, x, z, yaw, scale, variant) {
    const J = CROWD_JOINTS, rY = pose.rootY || 0;
    const head = this.meshes[variant], other = this.meshes[variant === 'headA' ? 'headB' : 'headA'];
    this._qY.setFromAxisAngle(this._up, yaw + (pose.headYaw || 0));
    this._j.set(0, J.neck[1] * scale + rY, 0);
    this._v.set(x + this._j.x, this._j.y, z + this._j.z);
    this._m.compose(this._v, this._qY, this._j.set(scale, scale, scale));
    head.setMatrixAt(slot, this._m);
    other.setMatrixAt(slot, this._m.compose(this._v.set(0, -60, 0), this._q.identity(), this._zero));
    this._part('torso', slot, J.hip[0], J.hip[1], 0, yaw, pose.torsoPitch || 0, x, z, rY, scale);
    this._part('upperArm', slot * 2, J.shoulderL[0], J.shoulderL[1], 0, yaw, pose.armL || 0, x, z, rY, scale);
    this._part('upperArm', slot * 2 + 1, J.shoulderR[0], J.shoulderR[1], 0, yaw, pose.armR || 0, x, z, rY, scale);
    this._part('lowerArm', slot * 2, J.elbowL[0], J.elbowL[1], 0, yaw, (pose.armL || 0) + (pose.elbowL || 0), x, z, rY, scale);
    this._part('lowerArm', slot * 2 + 1, J.elbowR[0], J.elbowR[1], 0, yaw, (pose.armR || 0) + (pose.elbowR || 0), x, z, rY, scale);
    this._part('upperLeg', slot * 2, J.hipL[0], J.hipL[1], 0, yaw, pose.thighL || 0, x, z, rY, scale);
    this._part('upperLeg', slot * 2 + 1, J.hipR[0], J.hipR[1], 0, yaw, pose.thighR || 0, x, z, rY, scale);
    this._part('lowerLeg', slot * 2, J.kneeL[0], J.kneeL[1], 0, yaw, (pose.thighL || 0) + (pose.shinL || 0), x, z, rY, scale);
    this._part('lowerLeg', slot * 2 + 1, J.kneeR[0], J.kneeR[1], 0, yaw, (pose.thighR || 0) + (pose.shinR || 0), x, z, rY, scale);
  }

  flush() {
    for (const part of CROWD_PARTS) this.meshes[part].instanceMatrix.needsUpdate = true;
  }
}
