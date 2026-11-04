import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteSpace } from '../src/world/RouteSpace.js';
import { RouteModel } from '../src/world/RouteModel.js';
import { validateRoute } from '../src/world/validateRoute.js';
import { loadRouteJson } from './helpers.mjs';

test('RouteSpace: straight line length, ends and extensions', () => {
  const rs = new RouteSpace([[0, 0], [100, 0]], { spacing: 2, padStart: 20, padEnd: 30 });
  assert.ok(Math.abs(rs.length - 100) < 1e-6);
  const a = rs.sample(0), b = rs.sample(100);
  assert.ok(Math.abs(a.x) < 1e-6 && Math.abs(b.x - 100) < 1e-6);
  assert.ok(rs.minS <= -20 && rs.maxS >= 130);
  assert.ok(Math.abs(rs.sample(-10).x + 10) < 1e-6);          // extension continues straight
});
test('RouteSpace: forward/right vectors are orthonormal; +Z forward gives right = -X? (r = (-fz, fx))', () => {
  const rs = new RouteSpace([[0, 0], [0, -100]]);               // heading -Z
  const p = rs.sample(50);
  assert.ok(Math.abs(p.fz + 1) < 1e-9 && Math.abs(p.rx - 1) < 1e-9, 'heading -Z means right = +X');
  const q = rs.toWorld(50, 3);
  assert.ok(Math.abs(q.x - 3) < 1e-9);
});
test('RouteSpace: smooth curve, continuous heading, no jumps in position', () => {
  const rs = new RouteSpace([[0, 0], [100, 0], [200, 50], [250, 150]], { spacing: 2 });
  let prev = rs.sample(0), maxTurn = 0, maxJump = 0;
  for (let s = 1; s <= rs.length; s += 1) {
    const p = rs.sample(s);
    maxTurn = Math.max(maxTurn, Math.acos(Math.min(1, prev.fx * p.fx + prev.fz * p.fz)));
    maxJump = Math.max(maxJump, Math.hypot(p.x - prev.x, p.z - prev.z));
    prev = p;
  }
  assert.ok(maxTurn < 0.08, 'heading changes smoothly: ' + maxTurn);
  assert.ok(Math.abs(maxJump - 1) < 0.05, 'one metre of s is ~one metre of world: ' + maxJump);
});

test('M4 route JSON validates with no errors and is geo-referenced', () => {
  const v = validateRoute(loadRouteJson());
  assert.deepEqual(v.errors, []);
  assert.ok(!v.warnings.some((w) => /schematic/.test(w)), 'geo-referenced route is not flagged schematic');
  const d = loadRouteJson();
  assert.equal(d.status, 'geo-referenced');
  assert.ok(d.geo && Array.isArray(d.geo.waypoints) && d.geo.waypoints.length >= 4, 'geo block carries measured waypoints');
});
test('M4: schematic status still warns honestly when someone downgrades', () => {
  const d = loadRouteJson();
  d.status = 'schematic';
  const v = validateRoute(d);
  assert.deepEqual(v.errors, []);
  assert.ok(v.warnings.some((w) => /schematic/.test(w)));
});
test('validator catches common mistakes', () => {
  const d = loadRouteJson();
  d.segments[1].section = 'nope';
  d.sections.avenue_narrow.elements.pop();
  d.segments[0].s0 = 5;
  const v = validateRoute(d);
  assert.ok(v.errors.length >= 3);
});

test('Milestone 2: moods and dressing validate cleanly on the real route', () => {
  const v = validateRoute(loadRouteJson());
  assert.deepEqual(v.errors, []);
});

test('Milestone 2: validator rejects malformed moods and dressing values', () => {
  const a = loadRouteJson();
  a.moods['karwan-bazar'].fog = 'not-a-colour';
  a.moods['karwan-bazar'].density = 9;
  assert.ok(validateRoute(a).errors.length >= 2, 'bad mood colour + density are errors');
  const b = loadRouteJson();
  b.segments[0].dressing = { cables: -1 };
  const vb = validateRoute(b);
  assert.ok(vb.errors.some((e) => /dressing/.test(e)), 'negative dressing is an error');
  const c = loadRouteJson();
  c.segments[0].dressing = 'nope';
  assert.ok(validateRoute(c).errors.some((e) => /dressing/.test(e)));
  const d2 = loadRouteJson();
  d2.moods = { 'unknown-segment': { fog: '#aabbcc', density: 1 } };   // unknown segment id is tolerated (route may grow)
  assert.deepEqual(validateRoute(d2).errors, []);
});

test('M4: archetype weight tables validate (bad weights are errors)', () => {
  const a = loadRouteJson();
  a.segments[0].buildings.archetypes = { midrise: 2 };               // weight > 1
  assert.ok(validateRoute(a).errors.some((e) => /archetype/.test(e)));
  const b = loadRouteJson();
  b.segments[0].buildings.archetypes = 'nope';
  assert.ok(validateRoute(b).errors.some((e) => /archetype/.test(e)));
});

test('RouteModel: length ~1250 m (real corridor), segments, walkable', () => {
  const m = new RouteModel(loadRouteJson());
  assert.ok(m.length > 1150 && m.length < 1350, 'route length ' + m.length);
  assert.equal(m.segmentAt(10).id, 'farmgate');
  assert.equal(m.segmentAt(950).id, 'karwan-bazar');
  assert.equal(m.segmentAt(m.length).id, 'saarc-approach');
  const w0 = m.walkableAt(10, {}), w1 = m.walkableAt(1150, {});
  assert.ok(w0.min < w0.max && w1.min < w1.max);
  assert.ok(m.progressMarks.length === 3 && m.progressMarks[2].s === m.length);
});
test('RouteModel: footpath narrows smoothly into Karwan Bazar (no jump)', () => {
  const m = new RouteModel(loadRouteJson());
  const w = (s) => { const e = m.profileAt(s).elements[1]; return e.x1 - e.x0; };
  assert.ok(Math.abs(w(879) - 3.5) < 0.05);
  assert.ok(Math.abs(w(960) - 2.4) < 0.05);
  assert.ok(w(890) < w(879) && w(890) > w(960));
});
test('RouteModel: buildings are deterministic, sorted, non-overlapping per side, archetypes assigned', () => {
  const a = new RouteModel(loadRouteJson()).buildings, b = new RouteModel(loadRouteJson()).buildings;
  assert.equal(a.length, b.length); assert.deepEqual(a[5], b[5]);
  for (const side of [-1, 1]) {
    const list = a.filter((x) => x.side === side);
    for (let i = 1; i < list.length; i++) assert.ok(list[i].sMid - list[i].w / 2 >= list[i - 1].sMid + list[i - 1].w / 2 - 1e-6, 'no overlap');
  }
  assert.ok(a.length > 150, 'corridor still carries a dense streetwall: ' + a.length);
  const valid = new Set(['institutional', 'midrise', 'commercial', 'marketBlock', 'halfbuilt', 'tower']);
  for (const bd of a) assert.ok(valid.has(bd.archetype), 'archetype ' + bd.archetype);
});
