// Bridge from our plain geometry arrays to Three.js BufferGeometry.
// NOTE: vendored three by RELATIVE path (identical file to the 'three' import map entry)
// so geometry-building classes stay unit-testable in plain Node (see CameraRig, M4).
import * as THREE from '../../vendor/three/three.module.js';

export function toBufferGeometry(data) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  g.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  if (data.uvs) g.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
  g.setIndex(new THREE.BufferAttribute(data.indices, 1));
  g.computeBoundingSphere();
  return g;
}
