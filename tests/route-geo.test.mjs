// Milestone 4: the route must match the REAL corridor, not an invented one.
// These tests pin the geo-referenced layout: junction records, landmark placement,
// side-of-road truth and the OSM-derived centreline behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteModel } from '../src/world/RouteModel.js';
import { validateRoute } from '../src/world/validateRoute.js';
import { clearsBuildings } from '../src/world/landmarks/registry.js';
import { loadRouteJson } from './helpers.mjs';

test('geo block: WGS84 waypoints are plausible and ordered along the route', () => {
  const d = loadRouteJson();
  assert.equal(d.geo.datum, 'WGS84');
  const wps = d.geo.waypoints;
  for (let i = 1; i < wps.length; i++) assert.ok(wps[i].s > wps[i - 1].s, 'waypoints ordered by s');
  const farmgate = wps[0], mor = wps.find((w) => /SAARC/.test(w.name));
  // corridor length sanity: real straight-line Farmgate->mor is ~1.19 km; road ~1.25 km
  const dLat = (mor.lat - farmgate.lat) * 111320;
  const dLon = (mor.lon - farmgate.lon) * 111320 * Math.cos(23.75 * Math.PI / 180);
  const straight = Math.hypot(dLat, dLon);
  assert.ok(straight > 1000 && straight < 1400, 'straight-line corridor ' + straight.toFixed(0) + ' m');
});

test('junction records: the five real crossings, correct order and arms', () => {
  const m = new RouteModel(loadRouteJson());
  assert.equal(m.junctions.length, 5);
  const ids = m.junctions.map((j) => j.id);
  assert.deepEqual(ids, ['farmgate', 'khamarbari', 'tejgaon-link', 'karwan-bazar-mor', 'saarc-mor']);
  const fg = m.junctions[0];
  assert.equal(fg.s, 0, 'the walk starts at the Farmgate junction');
  assert.equal(fg.arms.length, 5, 'Farmgate is a 5-arm junction');
  assert.equal(fg.signal, true);
  const mor = m.junctions[4];
  assert.ok(Math.abs(mor.s - m.length) < 1e-6, 'saarc-mor resolves to the route end');
  assert.ok(mor.arms.includes('panthapath') && mor.arms.includes('bijoy-sarani') && mor.arms.includes('sonargaon-road'));
  for (let i = 1; i < m.junctions.length; i++) assert.ok(m.junctions[i].s > m.junctions[i - 1].s);
});

test('validator: malformed junction records are errors', () => {
  const a = loadRouteJson();
  a.junctions[0].arms = [];
  assert.ok(validateRoute(a).errors.some((e) => /arms/.test(e)));
  const b = loadRouteJson();
  b.junctions[1].s = -3;
  assert.ok(validateRoute(b).errors.some((e) => /junctions\[1\]/.test(e)));
  const c = loadRouteJson();
  c.junctions.push({ ...c.junctions[0] });
  assert.ok(validateRoute(c).errors.some((e) => /duplicate junction id/.test(e)));
});

test('centreline matches the real corridor shape: long SSE sweep, gentle bends only', () => {
  const m = new RouteModel(loadRouteJson());
  let maxTurn = 0;
  let prev = m.space.sample(0, {});
  for (let s = 2; s <= m.length; s += 2) {
    const p = m.space.sample(s, {});
    maxTurn = Math.max(maxTurn, Math.acos(Math.min(1, prev.fx * p.fx + prev.fz * p.fz)));
    prev = p;
  }
  assert.ok(maxTurn < 0.05, 'no artificial kinks on the corridor: ' + maxTurn.toFixed(4));
  // overall bearing: the corridor must travel mostly "forward" with real drift, not zig-zag
  const a = m.space.sample(0, {}), b = m.space.sample(m.length, {});
  const net = Math.hypot(b.x - a.x, b.z - a.z);
  assert.ok(net > m.length * 0.97, 'corridor is a genuine avenue, not a wanderer: ' + net.toFixed(1));
});

test('landmark placement follows the measured corridor (s positions, sides)', () => {
  const m = new RouteModel(loadRouteJson());
  const lm = Object.fromEntries(m.landmarks.map((l) => [l.id, l]));
  // Farmgate cluster: bridge right at the junction, station just past it
  assert.ok(lm['farmgate-footbridge'].s < 20, 'footbridge spans the junction itself');
  assert.ok(lm['farmgate-station'].s > 20 && lm['farmgate-station'].s < 120, 'station box just east of the junction');
  // Khamarbari on the LEFT (east) side early in the corridor
  assert.equal(lm['khamarbari'].side, -1);
  assert.ok(lm['khamarbari'].s0 >= 20 && lm['khamarbari'].s1 <= 360);
  // Expressway on the far left along the rail side
  assert.equal(lm['farmgate-expressway'].side, -1);
  // Market zone on the LEFT side (real market is east of the avenue)
  assert.equal(lm['karwan-market-west'].side, -1);
  assert.equal(lm['karwan-bazar-zone'].side, -1);
  assert.ok(lm['karwan-market-west'].s0 >= 850 && lm['karwan-market-east'].s1 <= 1200, 'market hugs s 870..1200');
  // Kawran Bazar metro station inside the market stretch
  assert.ok(Math.abs(lm['karwan-station'].s - 1040) < 30);
  // Fountain just past the end; gardens beyond it
  assert.ok(lm['saarc-fountain'].aheadOfEnd < 20);
  assert.ok(lm['sonargaon-gardens'].aheadOfEnd > 40);
});

test('clears: market side suppressed on the left, Khamarbari clears the left streetwall, junction plaza clears both', () => {
  const m = new RouteModel(loadRouteJson());
  const byId = Object.fromEntries(m.landmarks.map((l) => [l.id, l]));
  let clearedLeftMarket = 0, clearedKhamarbari = 0, clearedJunction = 0, keptRight = 0;
  for (const b of m.buildings) {
    if (clearsBuildings(byId['karwan-market-west'], b.side, b.sMid) || clearsBuildings(byId['karwan-market-east'], b.side, b.sMid)) {
      clearedLeftMarket++;
      assert.ok(b.side === -1, 'market clears are on the left side only');
    }
    if (clearsBuildings(byId['khamarbari'], b.side, b.sMid)) { clearedKhamarbari++; assert.ok(b.side === -1); }
    if (clearsBuildings(byId['farmgate-footbridge'], b.side, b.sMid)) clearedJunction++;
    if (b.side === 1 && b.sMid > 400) keptRight++;
  }
  assert.ok(clearedLeftMarket > 8, 'market plots actually cleared: ' + clearedLeftMarket);
  assert.ok(clearedKhamarbari > 4, 'Khamarbari compound cleared: ' + clearedKhamarbari);
  assert.ok(clearedJunction > 2, 'junction plaza cleared: ' + clearedJunction);
  assert.ok(keptRight > 30, 'right streetwall intact mid-corridor: ' + keptRight);
});
