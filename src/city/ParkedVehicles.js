// Milestone 5: the parked city.
//
// A static, deterministic fleet of vehicles along the kerbs of kerb-parking districts —
// the Karwan Bazar staff buses and market vans on the market-side kerb, cars, CNGs and
// waiting rickshaws on the far kerb. Reuses the SAME merged vehicle geometry as the
// moving traffic (one InstancedMesh per type, per-instance tint), placed once at
// start-up and toggled per type by distance — zero per-frame cost beyond a visibility
// flip, and moving traffic never conflicts because TrafficSystem hands the outer
// (kerb-side) lane of these districts to the parked fleet.
//
// Pure placement logic (parkedSpots) is unit-testable headless.
// NOTE: THREE comes from the vendored copy by RELATIVE path (same file the import map
// resolves, exactly like CameraRig) so the class also loads in Node unit tests.
import * as THREE from '../../vendor/three/three.module.js';
import { buildVehicleGeometries, VEHICLE_SPECS } from './vehicleModels.js';
import { hashString } from '../core/Rng.js';
import { toBufferGeometry } from '../render/GeometryUtil.js';
import { createBlobInstancedMesh } from '../render/BlobShadow.js';

const H = (key) => hashString(key) / 4294967296;   // deterministic hash -> [0,1)

/** Kerb lane centre (the lane TrafficSystem trims) of one carriageway at s. */
function kerbLat(route, s, side) {
  const els = route.profileAt(s).elements;
  const road = side < 0 ? els.find((e) => e.kind === 'road' && e.x1 < 0) : els.find((e) => e.kind === 'road' && e.x0 > 0);
  if (!road) return null;
  const lanes = Math.max(1, Math.round(road.lanes ?? 1));
  const w = (road.x1 - road.x0) / lanes;
  return side < 0 ? road.x0 + w / 2 : road.x1 - w / 2;
}

/**
 * Deterministic parked-vehicle spots inside every dressing.kerbParking segment.
 * @returns {{type:string, s:number, lat:number, yaw:number, colour:number}[]}
 */
export function parkedSpots(route) {
  const spots = [];
  // keep shelters, junctions and the fountain zebra clear of double parking
  const blocked = [];
  for (const seg of route.segments) for (const s of (seg.dressing || {}).busStops || []) blocked.push(s);
  for (const j of route.junctions || []) blocked.push(j.s);
  blocked.push(route.length - 12);
  const clear = (s) => blocked.every((b) => Math.abs(s - b) > 10);

  for (const seg of route.segments) {
    const dr = seg.dressing || {};
    if (!dr.kerbParking) continue;
    const s0 = seg.s0 + 12, s1 = seg.s1 - 12;
    const SPACING = 17;
    let lastS = { '-1': -1e9, '1': -1e9 }, lastLen = { '-1': 0, '1': 0 };
    for (let k = Math.ceil(s0 / SPACING); k * SPACING < s1; k++) {
      for (const side of [-1, 1]) {
        const s = k * SPACING + H(`pk:s:${side}:${k}`) * 8;
        if (s < s0 || s >= s1 || !clear(s)) continue;
        if (H(`pk:on:${side}:${k}`) > 0.62) continue;                       // some gaps, not a wall
        const lat = kerbLat(route, s, side);
        if (lat === null) continue;
        const need = lastLen[side] / 2 + 2.6;
        if (s - lastS[side] < need) continue;                               // keep a bumper between parked vehicles
        const roll = H(`pk:t:${side}:${k}`);
        // market-side kerb: staff buses + delivery vans; far kerb: cars, CNGs, rickshaws
        const type = side < 0
          ? (roll < 0.45 ? 'bus' : roll < 0.75 ? 'van' : 'microbus')
          : (roll < 0.38 ? 'car' : roll < 0.68 ? 'cng' : 'rickshaw');
        const dir = side < 0 ? 1 : -1;                                      // face the traffic of that side
        const colours = VEHICLE_SPECS[type].colours;
        spots.push({
          type, s, lat,
          yaw: dir > 0 ? 0 : Math.PI,                                        // fixed below by ParkedVehicles
          colour: Math.floor(H(`pk:c:${side}:${k}`) * colours.length),
          side,
        });
        lastS[side] = s; lastLen[side] = VEHICLE_SPECS[type].len;
      }
    }
  }
  return spots;
}

export class ParkedVehicles {
  /** @param {{scene:THREE.Scene, route:object, material:THREE.Material}} deps */
  constructor({ scene, route, material }) {
    this.spots = parkedSpots(route);
    this._sMid = {};
    const geos = buildVehicleGeometries();
    // contact-shadow decals (browser only — headless Node tests have no DOM/canvas)
    this.blob = typeof document !== 'undefined'
      ? createBlobInstancedMesh(scene, Math.max(1, this.spots.length))
      : null;
    this.meshes = {};
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._one = new THREE.Vector3(1, 1, 1);
    this._scale = new THREE.Vector3(1, 1, 1);
    this._zero = new THREE.Vector3(0, 0, 0);
    this._up = new THREE.Vector3(0, 1, 0);
    this._c = new THREE.Color();
    this.spots.forEach((sp, i) => { sp.idx = i; });                 // one blob slot per spot
    const byType = {};
    for (const sp of this.spots) (byType[sp.type] = byType[sp.type] || []).push(sp);
    for (const [type, list] of Object.entries(byType)) {
      const mesh = new THREE.InstancedMesh(toBufferGeometry(geos[type]), material, list.length);
      mesh.frustumCulled = false;
      list.forEach((sp, i) => {
        this._c.set(VEHICLE_SPECS[type].colours[sp.colour % VEHICLE_SPECS[type].colours.length]);
        mesh.setColorAt(i, this._c);
        const p = route.space.toWorld(sp.s, sp.lat, {});
        const yaw = route.space.heading(sp.s) + Math.PI * (sp.side < 0 ? 0 : 1);
        this._m.compose(
          this._v.set(p.x, 0, p.z),
          this._q.setFromAxisAngle(this._up, yaw),
          this._one,
        );
        mesh.setMatrixAt(i, this._m);
        // contact shadow decal (blob slot i of this type's list)
        const spec = VEHICLE_SPECS[type];
        this._scale.set(spec.wid * 1.55, 1, spec.len * 1.28);
        this._m.compose(
          this._v.set(p.x, 0.02, p.z),
          this._q.setFromAxisAngle(this._up, yaw),
          this._scale,
        );
        if (this.blob) this.blob.setMatrixAt(sp.idx, this._m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      scene.add(mesh);
      this.meshes[type] = mesh;
      this._sMid[type] = list.reduce((a, s) => a + s.s, 0) / list.length;
    }
  }

  /** Cheap per-frame cull: hide whole types parked far outside the view window. */
  update(playerS, viewDist = 300) {
    let anyVisible = false;
    for (const [type, mesh] of Object.entries(this.meshes)) {
      mesh.visible = Math.abs(this._sMid[type] - playerS) <= viewDist;
      anyVisible = anyVisible || mesh.visible;
    }
    if (this.blob) this.blob.visible = anyVisible;
  }

  get count() { return this.spots.length; }
}
