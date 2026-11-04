// Milestone 5: the living-city systems. Headless (pure logic) checks for:
//   - ParkedVehicles placement (deterministic, kerb-only, clear of shelters/junctions)
//   - TrafficSystem kerb-lane handover + bus dwell at shelters
//   - CrowdSystem zebra crossers + bus queues
//   - ChunkBuilder trees + bus shelters (geometry reacts to dressing fields)
//   - the tower archetype skyline
import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteModel } from '../src/world/RouteModel.js';
import { buildChunk, chunkIndexForS } from '../src/world/ChunkBuilder.js';
import { TrafficSystem } from '../src/city/TrafficSystem.js';
import { CrowdSystem } from '../src/city/CrowdSystem.js';
import { ParkedVehicles, parkedSpots } from '../src/city/ParkedVehicles.js';
import { VEHICLE_SPECS } from '../src/city/vehicleModels.js';
import { TIERS } from '../src/render/tiers.js';
import { loadRouteJson } from './helpers.mjs';

function makeRoute() { return new RouteModel(loadRouteJson()); }
function makeBus() {
  const events = [];
  return { on() {}, emit: (n, e) => events.push({ n, e }), events };
}

// ---- parked fleet ---------------------------------------------------------------------------

test('parked: spots are deterministic, kerb-side, spaced, and clear of shelters/junctions', () => {
  const route = makeRoute();
  const a = parkedSpots(route), b = parkedSpots(makeRoute());
  assert.deepEqual(a, b, 'same route -> same parked fleet');
  assert.ok(a.length >= 10, 'the market district actually parks vehicles: ' + a.length);
  const blocked = [30, 700, 945, 1230, 1060, route.length - 12];   // shelters, mor, zebra
  for (const sp of a) {
    const seg = route.segmentAt(sp.s);
    assert.ok((seg.dressing || {}).kerbParking, `spot at s=${sp.s.toFixed(0)} is inside a kerb-parking district`);
    for (const bs of blocked) assert.ok(Math.abs(sp.s - bs) > 10, `spot at s=${sp.s.toFixed(0)} blocks s=${bs}`);
    assert.ok(Math.abs(sp.lat) > 10.5 && Math.abs(sp.lat) < 13.5, `kerb lat ${sp.lat.toFixed(2)} is the outer lane band`);
    assert.ok(VEHICLE_SPECS[sp.type], `type ${sp.type} exists`);
  }
  // same-side spacing: no two parked vehicles overlap along the kerb
  for (const side of [-1, 1]) {
    const list = a.filter((s) => s.side === side).sort((p, q) => p.s - q.s);
    for (let i = 1; i < list.length; i++) {
      const gap = list[i].s - list[i - 1].s;
      assert.ok(gap > (VEHICLE_SPECS[list[i].type].len + VEHICLE_SPECS[list[i - 1].type].len) / 2,
        `same-side overlap at s=${list[i].s.toFixed(1)} (gap ${gap.toFixed(1)}m)`);
    }
  }
  // market-side kerb carries the staff buses / vans, far kerb the small stuff
  for (const sp of a.filter((s) => s.side < 0)) assert.ok(['bus', 'van', 'microbus'].includes(sp.type));
  for (const sp of a.filter((s) => s.side > 0)) assert.ok(['car', 'cng', 'rickshaw'].includes(sp.type));
});

test('parked: vehicle types in kerb districts give up their outer traffic lane', () => {
  const route = makeRoute();
  const sys = new TrafficSystem({ route, bus: makeBus() });
  const farmIdx = route.segments.findIndex((s) => s.id === 'farmgate');
  const karwanIdx = route.segments.findIndex((s) => s.id === 'karwan-bazar');
  assert.equal(sys.laneSets[farmIdx].L.length, 3, 'Farmgate keeps all 3 lanes');
  assert.equal(sys.laneSets[karwanIdx].L.length, 2, 'Karwan Bazar left carriageway hands the kerb lane over');
  assert.equal(sys.laneSets[karwanIdx].R.length, 2, 'Karwan Bazar right carriageway hands the kerb lane over');
  // the parked lat must NOT be a moving lane centre
  const spots = parkedSpots(route);
  const karwanLanes = [...sys.laneSets[karwanIdx].L, ...sys.laneSets[karwanIdx].R];
  for (const sp of spots) {
    for (const lane of karwanLanes) assert.ok(Math.abs(Math.abs(sp.lat) - Math.abs(lane)) > 0.5,
      `parked lat ${sp.lat.toFixed(2)} sits on a moving lane (${lane.toFixed(2)})`);
  }
});

test('parked: ParkedVehicles builds one instanced mesh per used type', () => {
  const route = makeRoute();
  const scene = { add() {} };
  const pv = new ParkedVehicles({ scene, route, material: {} });
  assert.ok(pv.count >= 10);
  assert.ok(Object.keys(pv.meshes).length >= 3 && Object.keys(pv.meshes).length <= 6);
  pv.update(100, 340);                       // far from the market: every type hidden
  assert.ok(Object.values(pv.meshes).every((m) => m.visible === false));
  pv.update(1000, 340);                      // inside the market: visible again
  assert.ok(Object.values(pv.meshes).some((m) => m.visible === true));
});

// ---- bus dwell ------------------------------------------------------------------------------

test('traffic: a kerbside bus pulls in at the shelter, dwells, then moves on', () => {
  const route = makeRoute();
  const sys = new TrafficSystem({ route, bus: makeBus() });
  sys.setTier(TIERS.high);
  const bus = sys.vehicles.find((v) => v.type === 'bus' && v.carr < 0);
  assert.ok(bus, 'same-direction bus exists');
  bus.laneIdx = 0;
  bus.s = 700 - 6;                           // the avenue shelter is at s=700
  bus.speed = 3; bus.lastStop = -1; bus.dwellT = 0;
  const dt = 1 / 60;
  let minSpeed = 99, sawDwell = false;
  for (let i = 0; i < 8 * 60; i++) {         // 8 simulated seconds
    sys.update(700 - 6 + i * dt, -14.4, dt);
    minSpeed = Math.min(minSpeed, bus.speed);
    if (bus.dwellT > 0) sawDwell = true;
    if (bus.s > 700 + 6) break;
  }
  assert.ok(sawDwell, 'bus triggered its shelter dwell');
  assert.ok(minSpeed < 0.35, 'bus actually stopped: min speed ' + minSpeed.toFixed(2));
  assert.equal(bus.lastStop, 700, 'shelter marked as served');
});

test('traffic: lane personality — kerb lanes crawl slower than median lanes', () => {
  const route = makeRoute();
  const sys = new TrafficSystem({ route, bus: makeBus() });
  const kerb = sys.vehicles.filter((v) => v.laneIdx === 0).map((v) => v.desired);
  const median = sys.vehicles.filter((v) => v.laneIdx === 2).map((v) => v.desired);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(avg(kerb) < avg(median), `kerb avg ${avg(kerb).toFixed(2)} < median avg ${avg(median).toFixed(2)}`);
});

// ---- crowd: crossers + queues ---------------------------------------------------------------

test('crowd: zebra crossers exist only at the crossings and stay on the road span', () => {
  const route = makeRoute();
  const crowd = new CrowdSystem({ route, bus: makeBus() });
  crowd.setTier(TIERS.high);
  const crossers = crowd.people.filter((p) => p.behavior === 'cross');
  assert.ok(crossers.length > 0, 'the fountain/footbridge crossings have people on them');
  const crossingS = [8, route.length - 12];
  for (const p of crossers) {
    assert.ok(crossingS.some((cs) => Math.abs(p.s - cs) < 5), `crosser at s=${p.s.toFixed(1)} is at a crossing`);
    assert.ok(Math.abs(p.lat) <= 13.41, `crosser lat ${p.lat.toFixed(2)} within the kerb band`);
  }
  crowd.update(8, 2);                        // 2 s of crossing
  for (const p of crossers) {
    assert.ok(Number.isFinite(p.lat) && Math.abs(p.lat) <= 13.41, 'crossers never leave the road band');
    assert.ok(Number.isFinite(p.phase));
  }
});

test('crowd: bus queues stand only near the shelters, facing the road', () => {
  const route = makeRoute();
  const crowd = new CrowdSystem({ route, bus: makeBus() });
  const stops = [];
  for (const seg of route.segments) for (const st of (seg.dressing || {}).busStops || []) stops.push(st);
  const queued = crowd.people.filter((p) => p.behavior === 'queue');
  assert.ok(queued.length > 0, 'someone waits for the bus');
  for (const p of queued) {
    assert.ok(stops.some((st) => Math.abs(st - p.s) < 4.5), `queue at s=${p.s.toFixed(1)} near a shelter`);
    assert.ok(p.lat < -13, `queue lat ${p.lat.toFixed(2)} is on the left footpath beside the shelter`);
  }
});

// ---- dressing -> geometry -------------------------------------------------------------------

function withRoute(mutate) {
  const data = loadRouteJson();
  mutate(data);
  return new RouteModel(data);
}

test('world: trees appear when dressing.trees > 0 and vanish when it is 0', () => {
  const route = withRoute((d) => { d.segments.find((s) => s.id === 'avenue-corridor').dressing.trees = 0.75; });
  const bare = withRoute((d) => { d.segments.find((s) => s.id === 'avenue-corridor').dressing.trees = 0; });
  const ci = chunkIndexForS(620);            // fully inside the avenue district
  const withTrees = buildChunk(route, ci), without = buildChunk(bare, ci);
  assert.ok(withTrees.ground.triCount > without.ground.triCount + 60,
    `canopy geometry present: ${withTrees.ground.triCount} vs ${without.ground.triCount}`);
  // determinism: the same route always grows the same trees
  const again = buildChunk(withRoute((d) => { d.segments.find((s) => s.id === 'avenue-corridor').dressing.trees = 0.75; }), ci);
  assert.equal(again.ground.triCount, withTrees.ground.triCount);
});

test('world: bus shelters build where dressing.busStops points, with a readable sign', () => {
  const route = makeRoute();                 // farmgate segment has busStops [30]
  const bare = withRoute((d) => { delete d.segments.find((s) => s.id === 'farmgate').dressing.busStops; });
  const ci = chunkIndexForS(30);
  const withShelter = buildChunk(route, ci), without = buildChunk(bare, ci);
  assert.ok(withShelter.ground.triCount > without.ground.triCount, 'shelter frame/bench/roof built');
  assert.ok(withShelter.signs.triCount > without.signs.triCount, 'shelter carries its BUS STOP signboard');
});

test('world: the tower archetype exists in the SAARC approach and climbs above 30 m', () => {
  const route = makeRoute();
  const towers = route.buildings.filter((b) => b.archetype === 'tower');
  assert.ok(towers.length > 6, `skyline has towers: ${towers.length}`);
  const saarcTowers = towers.filter((b) => b.sMid >= 1190);
  assert.ok(saarcTowers.length > 0, 'towers line the fountain approach');
  for (const t of saarcTowers) assert.ok(t.h > 30, `tower at s=${t.sMid.toFixed(0)} is ${t.h.toFixed(1)} m tall`);
});
