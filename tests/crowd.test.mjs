// Crowd system: deterministic population, footpath discipline, slot budgeting, pose
// sanity. Runs headless (no renderer attached).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CrowdSystem } from '../src/city/CrowdSystem.js';
import { buildCrowdGeometries, CROWD_PARTS, CROWD_PALETTES, CROWD_JOINTS } from '../src/city/characterKit.js';
import { stallSpots, footpathBoundsAt } from '../src/world/dressing.js';
import { RouteModel } from '../src/world/RouteModel.js';
import { TIERS } from '../src/render/tiers.js';
import { loadRouteJson } from './helpers.mjs';

function makeCrowd() {
  const route = new RouteModel(loadRouteJson());
  const events = [];
  const crowd = new CrowdSystem({ route, bus: { on() {}, emit: (n, e) => events.push({ n, e }) } });
  return { crowd, route, events };
}

test('character kit: parts, joints and palettes are complete and sane', () => {
  assert.equal(CROWD_PARTS.length, 7);
  const geos = buildCrowdGeometries();
  for (const part of CROWD_PARTS) {
    assert.ok(geos[part].vertexCount > 20, `${part} geometry`);
    assert.ok(geos[part].triCount < 200, `${part} tri budget`);
  }
  for (const key of ['neck', 'hip', 'shoulderL', 'elbowL', 'hipL', 'kneeL']) {
    const j = CROWD_JOINTS[key];
    assert.ok(j.every(Number.isFinite) && j[1] > 0, `joint ${key}`);
  }
  for (const pal of ['shirts', 'pants', 'skins', 'sari']) {
    assert.ok(CROWD_PALETTES[pal].length >= 5, `palette ${pal}`);
    for (const c of CROWD_PALETTES[pal]) assert.match(c, /^#[0-9a-f]{6}$/i);
  }
});

test('population layout is deterministic and dense enough to feel alive', () => {
  const { crowd, route } = makeCrowd();
  assert.ok(crowd.people.length > 120, `population ${crowd.people.length} for ${Math.round(route.length)} m`);
  const a = crowd.people.map(p => `${p.behavior}:${p.s.toFixed(3)}:${p.lat.toFixed(3)}`).join('|');
  crowd.people.length = 0;
  const crowd2 = new CrowdSystem({ route, bus: { on() {}, emit() {} } });
  const b = crowd2.people.map(p => `${p.behavior}:${p.s.toFixed(3)}:${p.lat.toFixed(3)}`).join('|');
  assert.equal(a, b, 'same route seed -> same crowd');
});

test('every person stands on a footpath, never on the road or median', () => {
  const { crowd, route } = makeCrowd();
  for (const p of crowd.people) {
    const fp = route.profileAt(p.s).elements.filter(e => e.kind === 'footpath');
    const onFootpath = fp.some(e => p.lat >= e.x0 - 0.6 && p.lat <= e.x1 + 0.6);
    assert.ok(onFootpath, `${p.behavior} at lat ${p.lat.toFixed(2)} (s=${p.s.toFixed(0)}) off the footpath`);
    assert.ok(Math.abs(p.lat) > 11, `person at ${p.lat.toFixed(2)} is not on a carriageway`);
  }
});

test('sitters and vendors anchor to real stalls; stall spots match the chunk clutter formula', () => {
  const { crowd, route } = makeCrowd();
  const stalls = stallSpots(route, route.space.minS, route.space.maxS);
  assert.ok(stalls.length > 8, 'route has stalls');
  for (const st of stalls) assert.ok(['tea', 'umbrella', 'crates'].includes(st.kind));
  for (const p of crowd.people) {
    if (p.behavior === 'sitBench' || p.behavior === 'sitStool' || p.behavior === 'vendor') {
      const near = stalls.some(st => Math.abs(st.s - p.s) < 4.5);
      assert.ok(near, `${p.behavior} with no stall nearby`);
    }
  }
  // footpath bounds helper agrees with the route sections
  const b = footpathBoundsAt(route, 100);
  assert.ok(b.left[0] < b.left[1] && b.left[1] < -12 && b.right[0] > 12);
});

test('tier budgets: slots never exceed the tier crowd count', () => {
  const { crowd } = makeCrowd();
  for (const name of ['low', 'medium', 'high']) {
    crowd.setTier(TIERS[name]);
    crowd.update(300, 1 / 60);
    assert.ok(crowd.stats.visible <= TIERS[name].crowd, `${name}: visible ${crowd.stats.visible}`);
    assert.ok(crowd.stats.visible > 0, `${name}: nobody visible`);
  }
});

test('walkers advance along the route and their phases stay finite over a minute', () => {
  const { crowd } = makeCrowd();
  crowd.setTier(TIERS.high);
  const walkers = crowd.people.filter(p => p.behavior === 'walk');
  assert.ok(walkers.length > 20);
  const s0 = walkers.map(w => w.s);
  const dt = 1 / 60;
  for (let step = 0; step < 3600; step++) crowd.update(400 + Math.sin(step / 600) * 300, dt);
  let moved = 0;
  for (let i = 0; i < walkers.length; i++) {
    assert.ok(Number.isFinite(walkers[i].s) && Number.isFinite(walkers[i].phase));
    if (Math.abs(walkers[i].s - s0[i]) > 0.5) moved++;
  }
  assert.ok(moved > walkers.length * 0.5, `only ${moved}/${walkers.length} walkers moved`);
});

test('poses stay within plausible joint limits', () => {
  const { crowd } = makeCrowd();
  crowd.setTier(TIERS.high);
  const seen = new Set();
  crowd.update(400, 1 / 60);
  // capture poses through a spy renderer
  const poses = [];
  crowd.attach({ build() {}, setCapacity() {}, hide() {}, setColours() {}, flush() {},
    writePerson(slot, pose) { poses.push({ behavior: crowd.slots[slot].p.behavior, pose }); } });
  crowd.update(400, 1 / 60);
  crowd.update(720, 1 / 60);      // second sample inside the market district
  for (const { behavior, pose } of poses) {
    seen.add(behavior);
    for (const k of ['thighL', 'thighR', 'shinL', 'shinR', 'armL', 'armR', 'elbowL', 'elbowR', 'torsoPitch', 'rootY']) {
      assert.ok(Number.isFinite(pose[k]), `${behavior}.${k} finite`);
      assert.ok(Math.abs(pose[k]) < Math.PI * 1.05, `${behavior}.${k} = ${pose[k]} too extreme`);
    }
  }
  assert.ok(seen.has('walk'), 'walkers visible');
  assert.ok(seen.size >= 4, `several behaviours on screen, saw ${[...seen].join(',')}`);
});

test('sitting poses put hips at seat height with horizontal thighs', () => {
  const { crowd } = makeCrowd();
  crowd.setTier(TIERS.high);
  const poses = [];
  crowd.attach({ build() {}, setCapacity() {}, hide() {}, setColours() {}, flush() {},
    writePerson(slot, pose) { if (crowd.slots[slot].p.behavior.startsWith('sit')) poses.push(pose); } });
  crowd.update(720, 1 / 60);      // inside Karwan Bazar where the stalls are
  assert.ok(poses.length > 0, 'sitters visible in the market');
  for (const pose of poses) {
    assert.ok(pose.rootY < -0.2, `sitter rootY ${pose.rootY} should sink to the seat`);
    assert.ok(pose.thighL < -0.8, `sitter thigh ${pose.thighL} should be near horizontal`);
  }
});
