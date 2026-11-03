// Milestone 2 landmark tests: determinism, budgets, placement and suppression.
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
  buildLandmark(g, route, lm);
  return { route, data: g.finish() };
}
const byId = (route, id) => route.landmarks.find((l) => l.id === id);

test('route landmarks: all kinds known, deterministic output, valid arrays', () => {
  const route = new RouteModel(loadRouteJson());
  assert.ok(route.landmarks.length >= 4, 'route ships several landmarks');
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
    'saarc-fountain': 3200,
    'farmgate-footbridge': 2600,
    'farmgate-station': 3200,
    'karwan-market-sheds': 4400,
  };
  let total = 0;
  for (const lm of route.landmarks) {
    const { data } = build(lm);
    total += data.triCount;
    assert.ok(data.triCount <= budgets[lm.kind], `${lm.id}: ${data.triCount} tris <= ${budgets[lm.kind]}`);
    console.log(`      ${lm.id}: ${data.triCount} tris, ${data.quadCount} quads`);
  }
  assert.ok(total < 16000, 'all landmarks together stay small: ' + total);
});

test('footbridge: spans the road above the viaduct', () => {
  const route = new RouteModel(loadRouteJson());
  const { data } = build(byId(route, 'farmgate-footbridge'));
  const p = data.positions;
  let maxY = 0, minY = 1e9, maxH = 0;
  for (let i = 0; i < p.length; i += 3) {
    maxY = Math.max(maxY, p[i + 1]); minY = Math.min(minY, p[i + 1]);
    maxH = Math.max(maxH, Math.hypot(p[i], p[i + 2]));
  }
  assert.ok(minY < 1, 'stairs reach the ground');
  assert.ok(maxY > 16, 'arches rise above the deck: ' + maxY);
  assert.ok(maxH > 25, 'structure spans the full road: ' + maxH);
});

test('station: straddles the viaduct at s=180, body above 10.6 m, towers to the ground', () => {
  const route = new RouteModel(loadRouteJson());
  const lm = byId(route, 'farmgate-station');
  const { data } = build(lm);
  const p = data.positions;
  let maxY = 0, minY = 1e9;
  for (let i = 1; i < p.length; i += 3) { maxY = Math.max(maxY, p[i]); minY = Math.min(minY, p[i]); }
  assert.ok(minY < 1, 'access towers stand on the footpath');
  assert.ok(maxY > 13.5 && maxY < 16, 'roof canopy just above the viaduct: ' + maxY);
  const f = route.space.sample(lm.s, {});
  // geometry centroid sits near the route line (it straddles the median)
  let cx = 0, cz = 0;
  for (let i = 0; i < p.length; i += 3) { cx += p[i]; cz += p[i + 2]; }
  cx /= p.length / 3; cz /= p.length / 3;
  assert.ok(Math.hypot(cx - f.x, cz - f.z) < 3, 'station centred over the median');
});

test('market sheds: on the right side only, low skyline with tall blocks behind', () => {
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
    assert.ok(minLat > 12, `${id}: everything sits across the road (min lateral ${minLat})`);
    assert.ok(maxLat < 48, `${id}: stays within the ground band (max lateral ${maxLat})`);
    assert.ok(maxY > 10, `${id}: wholesale blocks rise behind the sheds (${maxY})`);
  }
});

test('fountain: the Kundu fan silhouette at the sourced size, at the route end', () => {
  const route = new RouteModel(loadRouteJson());
  const lm = byId(route, 'saarc-fountain');
  assert.equal(landmarkS(lm, route), route.length + 22);
  const { route: r2, data } = build(lm);
  const p = data.positions, cols = data.colors;
  const fc = r2.space.sample(r2.length + 22, {});             // fountain centre in world space
  const water = [0.128, 0.42, 0.52];                          // ~linear of #63aebf (loose)
  let waterTris = 0, maxY = 0, maxH = 0;
  for (let i = 0; i < p.length; i += 3) {
    maxY = Math.max(maxY, p[i + 1]);
    maxH = Math.max(maxH, Math.hypot(p[i] - fc.x, p[i + 2] - fc.z));
  }
  for (let t = 0; t < cols.length; t += 9) {                  // per-triangle first vertex colour
    const dr = Math.abs(cols[t] - water[0]) + Math.abs(cols[t + 1] - water[1]) + Math.abs(cols[t + 2] - water[2]);
    if (dr < 0.25) waterTris++;
  }
  assert.ok(waterTris > 12, 'frozen water present (' + waterTris + ' triangles)');
  assert.ok(maxY > 9.3 && maxY < 10.2, 'tallest blades reach the sourced 9.75 m: ' + maxY);
  assert.ok(maxH > 20 && maxH < 26, 'plaza ring around a 32 m pool: ' + maxH);
});

test('clears: market side buildings suppressed, footbridge clears both sides, left side untouched', () => {
  const route = new RouteModel(loadRouteJson());
  const marketW = byId(route, 'karwan-market-west'), marketE = byId(route, 'karwan-market-east');
  const bridge = byId(route, 'farmgate-footbridge');
  let clearedRight = 0, keptLeft = 0, keptRightOutside = 0;
  for (const b of route.buildings) {
    const inMarket = (b.sMid >= 645 && b.sMid < 995);
    const cW = clearsBuildings(marketW, b.side, b.sMid);
    const cE = clearsBuildings(marketE, b.side, b.sMid);
    const cB = clearsBuildings(bridge, b.side, b.sMid);
    if (cW || cE || cB) {
      clearedRight++;
      assert.ok(b.side === 1 || (b.side === -1 && b.sMid >= 30 && b.sMid <= 60), 'footbridge clears both sides only at 30..60');
    } else if (b.side === -1) keptLeft++;
    else keptRightOutside++;
  }
  assert.ok(clearedRight > 20, 'market plots actually cleared: ' + clearedRight);
  assert.ok(keptLeft > 40, 'walkable side keeps its streetwall: ' + keptLeft);
  assert.ok(keptRightOutside > 10, 'right side keeps buildings outside the market: ' + keptRightOutside);
});

test('validator: unknown landmark kind and bad landmark numbers are errors', () => {
  const a = loadRouteJson();
  a.landmarks.push({ id: 'mystery', kind: 'giant-robot', s: 100 });
  assert.ok(validateRoute(a).errors.some((e) => /unknown kind/.test(e)));
  const b = loadRouteJson();
  b.landmarks[0].radius = -5;
  assert.ok(validateRoute(b).errors.some((e) => /radius/.test(e)));
  const c = loadRouteJson();
  c.landmarks[2].length = undefined;
  assert.ok(validateRoute(c).errors.length === 0, 'station without optional length still validates');
  const d = loadRouteJson();
  d.landmarks[3].clears = [10];
  assert.ok(validateRoute(d).errors.some((e) => /clears/.test(e)));
});
