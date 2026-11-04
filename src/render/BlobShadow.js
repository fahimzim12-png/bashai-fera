// Contact "blob" shadows (Milestone 4): a soft dark decal under every vehicle, pedestrian
// and the hero. This grounds objects on tiers without the shadow map (and parked vehicles
// in M5). The real directional shadow map only switches on for capable tiers
// (see Environment.setShadows).
// NOTE: vendored three by RELATIVE path (identical file to the 'three' import map entry)
// so classes using blobs stay unit-testable in plain Node (see CameraRig, M4).
import * as THREE from '../../vendor/three/three.module.js';

let _texture = null;

/** Shared radial-gradient decal texture (created lazily; browser only). */
export function blobTexture() {
  if (_texture) return _texture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.52)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.30)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _texture = new THREE.CanvasTexture(canvas);
  _texture.colorSpace = THREE.SRGBColorSpace;
  return _texture;
}

let _material = null;

export function blobMaterial() {
  if (_material) return _material;
  _material = new THREE.MeshBasicMaterial({
    map: blobTexture(),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  return _material;
}

/**
 * One InstancedMesh of flat ground decals.
 * @param {THREE.Scene} scene
 * @param {number} count  instance capacity
 * @returns {THREE.InstancedMesh} unit quad in XZ (scale x = width, z = length)
 */
export function createBlobInstancedMesh(scene, count) {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, blobMaterial(), count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.count = count;
  // park every instance underground until the sim writes real poses
  const m = new THREE.Matrix4();
  const zero = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, m.compose(new THREE.Vector3(0, -50, 0), new THREE.Quaternion(), zero));
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}
