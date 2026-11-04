// Milestone 2+4 landmark tests: determinism, budgets, placement and suppression.
// Builders are pure array generators, so everything here runs in Node without Three.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteModel } from '../src/world/RouteModel.js';
import { validateRoute } from '../src/world/validateRoute.js';
import { GeometryBuilder } from '../src/render/GeometryBuilder.js';
import { buildLandmark, landmarkS, clearsBuildings } from '../src/world/landmarks/registry.js';
import { loadRouteJson } from './helpers.mjs';

function build(lm) {
  const route = new RouteModel(loadRouteJson());
  const g = new GeometryBuilder();
  const sg = new GeometryBuilder({ uv: true });
  buildLandmark(g, sg, route, lm);
  return { route, data: g.finish(), signs: sg.finish() };
}
const byId = (route, id) => route.landmarks.find((l) => l.id === id);

test('route landmarks: all kinds known, deterministic output, valid arrays', () => {
  const route = new RouteModel(loadRouteJson());
  assert.ok(route.landmarks.length >= 8, 'M4 route ships the full landmark set');
  for (const lm of route.landmarks) {
    const a = build(lm), b = build(lm);
    assert.ok(a.data.vertexCount > 0, `${lm.id}: has geometry`);
    assert.deepEqual(a.data.positions, b.data.positions, `${lm.id}: deterministic`);
    assert.ok(a.data.positions.every(Number.isFinite), `${lm.id}: finite positions`);
    assert.ok(a.data.normals.every(Number.isFinite), `${lm.id}: finite normals`);
    assert.ok(Math.max(...a.data.indices) < a.data.vertexCount, `${lm.id}: indices valid`);
  }
});

test('landmark triangle budgets (Redmi 9 headroom)', () => {
  const route = new RouteModel(loadRouteJson());
  const budgets = {
    'saarc-fountain': 3600,
    'farmgate-footbridge': 3400,
    'metro-station': 3600,
    'karwan-market-sheds': 5200,
    'elevated-expressway': 2600,
    'khamarbari': 2600,
    'karwan-bazar-zone': 5200,
    'sonargaon-gardens': 2200,
  };
  let total = 0;
  for (const lm of route.landmarks) {
    const { data, signs } = build(lm);
    total += data.triCount + signs.triCount;
    assert.ok(data.triCount + signs.triCount <= budgets[lm.kind], `${lm.id}: ${data.triCount + signs.triCount} tris <= ${budgets[lm.kind]}`);
    console.log(`      ${lm.id}: ${data.triCount + signs.triCount} tris`);
  }
  assert.ok(total < 20000, 'all landmarks together stay small: ' + total);
});

test('footbridge v2: 2023 rebuild spans the road above the viaduct, wing reaches the ground', () => {
  const route = new RouteModel(loadRouteJson());
  const { data } = build(byId(route, 'farmgate-footbridge'));
  const p = data.positions;
  let maxY = 0, minY = 1e9, maxH = 0;
  for (let i = 0; i < p.length; i += 3) {
    maxY = Math.max(maxY, p[i + 1]); minY = Math.min(minY, p[i + 1]);
    maxH = Math.max(maxH, Math.hypot(p[i], p[i + 2]));
  }
  assert.ok(minY < 1, 'stairs reach the ground');
  assert.ok(maxY > 16, 'masts and canopy rise above the deck: ' + maxY);
  assert.ok(maxH > 28, 'main span crosses the whole junction: ' + maxH);
});

test('metro stations: straddle the viaduct, readable nameboards, roof under 17 m', () => {
  const route = new RouteModel(loadRouteJson());
  for (const id of ['farmgate-station', 'karwan-station']) {
    const lm = byId(route, id);
    const { data, signs } = build(lm);
    const p = data.positions;
    let maxY = 0, minY = 1e9;
    for (let i = 1; i < p.length; i += 3) { maxY = Math.max(maxY, p[i]); minY = Math.min(minY, p[i]); }
    assert.ok(minY < 1, `${id}: access towers stand on the footpath`);
    assert.ok(maxY > 13.5 && maxY < 17.6, `${id}: roof canopy + catenary just above the viaduct: ${maxY}`);
    const f = route.space.sample(lm.s, {});
    let cx = 0, cz = 0;
    for (let i = 0; i < p.length; i += 3) { cx += p[i]; cz += p[i + 2]; }
    cx /= p.length / 3; cz /= p.length / 3;
    assert.ok(Math.hypot(cx - f.x, cz - f.z) < 3, `${id} centred over the median`);
    assert.ok(signs.triCount > 0, `${id}: nameboard uses the sign atlas`);
  }
});

test('market sheds: on the LEFT side only (real east-side market), low skyline with tall blocks behind', () => {
  const route = new RouteModel(loadRouteJson());
  for (const id of ['karwan-market-west', 'karwan-market-east']) {
    const lm = byId(route, id);
    const { data } = build(lm);
    const p = data.positions;
    const f = route.space.sample(lm.s, {});
    let maxY = 0, minLat = 1e9, maxLat = -1e9;
    for (let i = 0; i < p.length; i += 3) {
      maxY = Math.max(maxY, p[i + 1]);
      const lat = (p[i] - f.x) * f.rx + (p[i + 2] - f.z) * f.rz;
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    }
    assert.ok(maxLat < -12, `${id}: everything sits across the road on the market side (max lateral ${maxLat})`);
    assert.ok(minLat > -48, `${id}: stays within the ground band (min lateral ${minLat})`);
    assert.ok(maxY > 10, `${id}: wholesale blocks rise behind the sheds (${maxY})`);
  }
});

test('expressway: elevated deck on the far left, ramp lands near the ground', () => {
  const route = new RouteModel(loadRouteJson());
  const lm = byId(route, 'farmgate-expressway');
  const { data } = build(lm);
  const p = data.positions;
  const f = route.space.sample(lm.s, {});
  let maxY = 0, minY = 1e9, minLat = 1e9;
  for (let i = 0; i < p.length; i += 3) {
    maxY = Math.max(maxY, p[i + 1]);
    minY = Math.min(minY, p[i + 1]);
    const lat = (p[i] - f.x) * f.rx + (p[i + 2] - f.z) * f.rz;
    minLat = Math.min(minLat, lat);
  }
  assert.ok(maxY > 15, 'deck runs high above the street: ' + maxY);
  assert.ok(minY < 1.5, 'ramp reaches the ground before its s-range ends');
  assert.ok(minLat < -30, 'whole structure stays on the far (rail) side: ' + minLat);
});

test('Karwan Bazar zone: market block, rail line and towers all behind the sheds', () => {
  const route = new RouteModel(loadRouteJson());
  const lm = byId(route, 'karwan-bazar-zone');
  const { data, signs } = build(lm);
  const p = data.positions;
  // measure each vertex against its NEAREST route frame (the corridor curves, so a single
  // frame would smear laterals over the zone's 340 m span)
  const samples = [];
  for (let s = lm.s0 - 10; s <= lm.s1 + 10; s += 4) samples.push(route.space.sample(s, {}));
  let maxLat = -1e9, minLat = 1e9, maxY = 0;
  for (let i = 0; i < p.length; i += 3) {
    let best = 0, bd = 1e9;
    for (let k = 0; k < samples.length; k++) {
      const d2 = (p[i] - samples[k].x) ** 2 + (p[i + 2] - samples[k].z) ** 2;
      if (d2 < bd) { bd = d2; best = k; }
    }
    const f = samples[best];
    const lat = (p[i] - f.x) * f.rx + (p[i + 2] - f.z) * f.rz;
    maxLat = Math.max(maxLat, lat); minLat = Math.min(minLat, lat);
    maxY = Math.max(maxY, p[i + 1]);
  }
  assert.ok(maxLat < -14, 'zone stays behind the shed line (never on the road): ' + maxLat);
  assert.ok(minLat > -60, 'zone stays inside the ground band: ' + minLat);
  assert.ok(maxY > 40, 'tower backdrop rises: ' + maxY);
  assert.ok(signs.triCount > 0, 'zone carries readable market signage');
});

test('fountain v3: the Kundu petal silhouette, RUNNING pool, striped kerb + brass rail ring', () => {
  const route = new RouteModel(loadRouteJson());
  const lm = byId(route, 'saarc-fountain');
  assert.equal(landmarkS(lm, route), route.length + lm.aheadOfEnd);
  const { route: r2, data, signs } = build(lm);
  const p = data.positions, cols = data.colors;
  const fc = r2.space.sample(r2.length + lm.aheadOfEnd, {});
  const water = [0.275, 0.546, 0.694];                        // ~linear of #8fc3d9 (basin water)
  let waterTris = 0, maxY = 0, maxH = 0;
  for (let i = 0; i < p.length; i += 3) {
    maxY = Math.max(maxY, p[i + 1]);
    maxH = Math.max(maxH, Math.hypot(p[i] - fc.x, p[i + 2] - fc.z));
  }
  for (let t = 0; t < cols.length; t += 9) {
    const dr = Math.abs(cols[t] - water[0]) + Math.abs(cols[t + 1] - water[1]) + Math.abs(cols[t + 2] - water[2]);
    if (dr < 0.2) waterTris++;
  }
  assert.ok(waterTris > 12, 'running basin water present (' + waterTris + ' triangles)');
  assert.ok(maxY > 9.3 && maxY < 10.2, 'tallest petals reach the sourced 9.75 m: ' + maxY);
  assert.ok(maxH > 20 && maxH < 26, 'plaza + kerb ring around a 32 m pool: ' + maxH);
  assert.ok(signs.triCount > 0, 'wall posters use the sign atlas');
});

test('clears: market + Khamarbari clear the left streetwall, footbridge clears the junction, right wall intact', () => {
  const route = new RouteModel(loadRouteJson());
  const marketW = byId(route, 'karwan-market-west'), marketE = byId(route, 'karwan-market-east');
  const bridge = byId(route, 'farmgate-footbridge'), kham = byId(route, 'khamarbari');
  let clearedLeft = 0, clearedJunction = 0, keptRight = 0;
  for (const b of route.buildings) {
    const cM = clearsBuildings(marketW, b.side, b.sMid) || clearsBuildings(marketE, b.side, b.sMid);
    const cK = clearsBuildings(kham, b.side, b.sMid);
    const cB = clearsBuildings(bridge, b.side, b.sMid);
    if (cM || cK) { clearedLeft++; assert.ok(b.side === -1, 'market/Khamarbari clears are left-side only'); }
    if (cB) clearedJunction++;
    if (b.side === 1 && b.sMid > 400) keptRight++;
  }
  assert.ok(clearedLeft > 10, 'left-side landmark plots actually cleared: ' + clearedLeft);
  assert.ok(clearedJunction > 2, 'junction plaza cleared: ' + clearedJunction);
  assert.ok(keptRight > 30, 'right streetwall intact mid-corridor: ' + keptRight);
});

test('validator: unknown landmark kind and bad landmark numbers are errors', () => {
  const a = loadRouteJson();
  a.landmarks.push({ id: 'mystery', kind: 'giant-robot', s: 100 });
  assert.ok(validateRoute(a).errors.some((e) => /unknown kind/.test(e)));
  const fountain = (d) => d.landmarks.find((l) => l.kind === 'saarc-fountain');
  const b = loadRouteJson();
  fountain(b).radius = -5;
  assert.ok(validateRoute(b).errors.some((e) => /radius/.test(e)));
  const c = loadRouteJson();
  c.landmarks.find((l) => l.kind === 'metro-station').length = undefined;
  assert.ok(validateRoute(c).errors.length === 0, 'station without optional length still validates');
  const d = loadRouteJson();
  d.landmarks.find((l) => l.kind === 'karwan-market-sheds').clears = [10];
  assert.ok(validateRoute(d).errors.some((e) => /clears/.test(e)));
  const e2 = loadRouteJson();
  e2.landmarks.find((l) => l.kind === 'elevated-expressway').s1 = 5;
  assert.ok(validateRoute(e2).errors.some((e) => /s0 < s1/.test(e)));
});
