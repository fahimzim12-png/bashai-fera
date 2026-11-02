// Sky, sun, fog and the two lights. Deliberately restrained: one hemisphere light + one
// directional light, NO real-time shadows (too costly for a Redmi 9).
import * as THREE from 'three';

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
    this.sun.position.set(d[0], d[1], d[2]).normalize().multiplyScalar(100);
    scene.add(this.sun);

    // gradient sky dome (vertex colours): hazy warm horizon -> blue overhead
    const geo = new THREE.SphereGeometry(500, 16, 10);
    const top = new THREE.Color(lighting.skyTop), hor = new THREE.Color(lighting.skyHorizon);
    const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = Math.max(0, pos.getY(i) / 500);
      c.copy(hor).lerp(top, Math.pow(y, 0.55));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    // soft sun disc low in the sky
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(26, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff0c8, fog: false, depthWrite: false, transparent: true, opacity: 0.9 }),
    );
    sunDisc.position.copy(this.sun.position).normalize().multiplyScalar(470);
    sunDisc.lookAt(0, 0, 0);
    sunDisc.renderOrder = -9;
    this.dome.add(sunDisc);
  }

  /** Fog must hide chunk pop-in: it reaches full density a bit before the last streamed chunk ends. */
  setViewDistance(metres) {
    this.scene.fog.far = metres;
    this.scene.fog.near = metres * 0.22;
  }

  follow(cameraPosition) { this.dome.position.copy(cameraPosition); }
}
