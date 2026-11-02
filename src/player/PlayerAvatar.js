// PLACEHOLDER body for the father (blocky, low-poly, 3 draw calls). It deliberately sits behind a small
// interface (setPose) so a real animated GLB character can replace it later without touching gameplay.
import * as THREE from 'three';
import { GeometryBuilder } from '../render/GeometryBuilder.js';
import { toBufferGeometry } from '../render/GeometryUtil.js';
import { TAU } from '../core/MathUtil.js';

export class PlayerAvatar {
  constructor(material) {
    // Local model space: faces +Z, local +X is the avatar's LEFT, so its right vector is [-1, 0].
    const F = [0, 1], R = [-1, 0];
    const shirt = '#6f9fc4', skin = '#b98a64', hair = '#1d1a18', trousers = '#2f3440', shoe = '#1b1b1b', bag = '#6b4a32';

    const body = new GeometryBuilder();
    body.box([0, 0.88, 0], F, R, 0.24, 0.58, 0.42, shirt, { skipBottom: true });                 // torso
    body.box([0, 1.48, 0], F, R, 0.22, 0.26, 0.20, skin, { skipBottom: true });                  // head
    body.box([0, 1.70, -0.01], F, R, 0.24, 0.07, 0.22, hair, { skipBottom: true });              // hair top
    body.box([0, 1.5, -0.075], F, R, 0.08, 0.2, 0.21, hair, { skipBottom: true });               // hair back
    for (const sx of [-1, 1]) {
      body.box([sx * 0.26, 1.2, 0], F, R, 0.12, 0.28, 0.12, shirt, { skipBottom: true });        // sleeve
      body.box([sx * 0.26, 0.92, 0], F, R, 0.1, 0.28, 0.1, skin, { skipBottom: true });          // forearm
    }
    body.box([0.34, 0.76, -0.04], F, R, 0.28, 0.32, 0.1, bag, { skipBottom: true });             // office satchel

    const leg = new GeometryBuilder();                                                            // origin = hip joint
    leg.box([0, -0.88, 0], F, R, 0.17, 0.80, 0.17, trousers, { skipBottom: true });
    leg.box([0, -0.88, 0.05], F, R, 0.27, 0.09, 0.17, shoe, { skipBottom: true });

    this.root = new THREE.Group();
    this.bodyMesh = new THREE.Mesh(toBufferGeometry(body.finish()), material);
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    const legGeo = toBufferGeometry(leg.finish());
    this.legL.add(new THREE.Mesh(legGeo, material)); this.legR.add(new THREE.Mesh(legGeo, material));
    this.legL.position.set(0.1, 0.88, 0); this.legR.position.set(-0.1, 0.88, 0);
    this.root.add(this.bodyMesh, this.legL, this.legR);
    for (const o of [this.bodyMesh, ...this.legL.children, ...this.legR.children]) o.frustumCulled = false;
  }

  /** x,z world position; yaw radians; phase = walk cycles; lean -1..1 (sideways steering). */
  setPose(x, z, yaw, phase, lean) {
    const a = phase * TAU, swing = Math.sin(a) * 0.6;
    this.root.position.set(x, 0, z);
    this.root.rotation.y = yaw - lean * 0.45;                 // turn a little toward the side being steered
    this.bodyMesh.position.y = Math.abs(Math.sin(a)) * 0.03;  // gentle walking bob
    this.bodyMesh.rotation.z = -lean * 0.06;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
  }
}
