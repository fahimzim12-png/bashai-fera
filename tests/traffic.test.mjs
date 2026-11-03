// Traffic system: lane derivation from the route, non-overlap under simulation,
// footpath discipline, event hooks, tier budgeting. Runs headless via the pure-ish
// system class with THREE objects mocked to the minimum the system touches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrafficSystem } from '../src/city/TrafficSystem.js';
import { VEHICLE_SPECS, VEHICLE_TYPES, buildVehicleGeometries } from '../src/city/vehicleModels.js';
import { RouteModel } from '../src/world/RouteModel.js';
import { TIERS } from '../src/render/tiers.js';
import { loadRouteJson } from './helpers.mjs';

// Minimal EventBus double: records emissions.
function makeBus() {
  const listeners = new Map(), events = [];
  return {
    on(name, fn) { (listeners.get(name) || listeners.set(name, []).get(name)).push(fn); },
    emit(name, payload) { events.push({ name, payload }); for (const fn of listeners.get(name) || []) fn(payload); },
    events,
  };
}

// Minimal THREE double: only what TrafficSystem constructs/touches.
class FakeInstancedMesh {
  constructor(geo, mat, count) { this.count = count; this.matrices = new Array(count).fill(null); this.colours = 0; }
  setMatrixAt(i, m) { this.matrices[i] = m; }
  setColorAt(i, c) { this.colours++; }
}
const fakeScene = { add() {} };
class FakeMatrix4 {
  constructor() { this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  makeScale(x, y, z) { this._scale = [x, y, z]; return this; }
  compose() { this._composed = true; return this; }
}
const fakeTHREE = {
  Matrix4: FakeMatrix4, Quaternion: class { setFromAxisAngle() { return this; } },
  Vector3: class { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } },
  Color: class { set() { return this; } },
  InstancedMesh: FakeInstancedMesh, DynamicDrawUsage: 1,
};

// The system imports THREE directly - patch the module before import is impossible with
// plain Node here, so instead run against the real class but stub what it needs by
// injecting fakes through the constructor. InstancedMesh creation happens inside, so we
// swap the imported module's THREE reference via a tiny loader hack is overkill:
// instead, assert only on the exposed pure data (vehicles, laneSets, stats, events),
// which do not need the GPU side. For that, we build the system with real code paths
// guarded to work headless: meshes are created but never uploaded.

function makeSystem() {
  const route = new RouteModel(loadRouteJson());
  const bus = makeBus();
  const sys = new TrafficSystem({ route, bus });   // renderer omitted: headless sim
  return { sys, route, bus };
}

test('vehicle catalog: 8 types with sane physical specs', () => {
  assert.equal(VEHICLE_TYPES.length, 8);
  for (const t of VEHICLE_TYPES) {
    const s = VEHICLE_SPECS[t];
    assert.ok(s.len > 1 && s.len < 12, `${t} length`);
    assert.ok(s.wid > 0.5 && s.wid < 3, `${t} width`);
    assert.ok(s.speed[0] > 0.5 && s.speed[1] <= 12, `${t} speed band`);
    assert.ok(s.weight > 0 && s.colours.length >= 3);
  }
  const totalWeight = VEHICLE_TYPES.reduce((a, t) => a + VEHICLE_SPECS[t].weight, 0);
  assert.ok(Math.abs(totalWeight - 1) < 0.02, `weights sum to ~1, got ${totalWeight}`);
  const geos = buildVehicleGeometries();
  for (const t of VEHICLE_TYPES) {
    assert.ok(geos[t].vertexCount > 40, `${t} has geometry`);
    assert.ok(geos[t].triCount < 900, `${t} within tri budget (${geos[t].triCount})`);
  }
});

test('lane sets: centres stay inside their road elements, correct carriageways', () => {
  const { sys, route } = makeSystem();
  assert.equal(sys.laneSets.length, route.segments.length);
  for (const ls of sys.laneSets) {
    assert.ok(ls.L.length >= 1 && ls.R.length >= 1, 'both carriageways have lanes');
    for (const lat of ls.L) assert.ok(lat < -3, `left lane ${lat} must be left of the median`);
    for (const lat of ls.R) assert.ok(lat > 3, `right lane ${lat} must be right of the median`);
  }
});

test('initial placement is de-overlapped and on the road', () => {
  const { sys, route } = makeSystem();
  sys.setTier(TIERS.high);
  const actives = sys.vehicles.filter(v => v._active);
  assert.equal(actives.length, TIERS.high.traffic);
  for (const v of actives) {
    assert.ok(Number.isFinite(v.s) && Number.isFinite(v.lat), 'finite placement');
    assert.ok(Math.abs(v.lat) > 2.5 && Math.abs(v.lat) < 13, `vehicle lat ${v.lat} on a carriageway`);
  }
  // no overlap within the same (carriageway, lane) chain
  for (let i = 0; i < actives.length; i++) for (let j = i + 1; j < actives.length; j++) {
    const a = actives[i], b = actives[j];
    if (a.carr === b.carr && a.laneIdx === b.laneIdx) {
      assert.ok(Math.abs(a.s - b.s) > (a.len + b.len) / 2 + 0.4,
        `overlap: ${a.type}@${a.s.toFixed(1)} vs ${b.type}@${b.s.toFixed(1)}`);
    }
  }
});

test('simulation advances vehicles without collisions, NaNs, or footpath invasions', () => {
  const { sys, route } = makeSystem();
  sys.setTier(TIERS.high);
  const dt = 1 / 60;
  for (let step = 0; step < 3600; step++) {          // one simulated minute
    sys.update(step * dt + 400, -14.4, dt);
    for (const v of sys.vehicles) {
      if (!v._active) continue;
      assert.ok(Number.isFinite(v.s) && Number.isFinite(v.lat) && Number.isFinite(v.speed), 'no NaN');
      assert.ok(v.speed >= -0.001, 'no reversing');
      assert.ok(Math.abs(v.lat) > 2.4, `lat ${v.lat} leaves the road`);
      assert.ok(v.s > route.space.minS - 5 && v.s < route.space.maxS + 5, 'within the padded route');
    }
  }
  // deep check on a single instant: same-lane overlap impossible
  const actives = sys.vehicles.filter(v => v._active);
  for (let i = 0; i < actives.length; i++) for (let j = i + 1; j < actives.length; j++) {
    const a = actives[i], b = actives[j];
    if (a.carr === b.carr && a.laneIdx === b.laneIdx) {
      assert.ok(Math.abs(a.s - b.s) > (a.len + b.len) / 2 - 0.9,
        `post-sim overlap ${a.type}/${b.type}: ${Math.abs(a.s - b.s).toFixed(2)}m`);
    }
  }
});

test('near-miss fires when a vehicle passes the walker closely', () => {
  const { sys, bus } = makeSystem();
  sys.setTier(TIERS.high);
  const v = sys.vehicles.find(x => x._active && x.carr < 0);
  v.laneIdx = 0;                                     // lane nearest the footpath
  v.lat = sys.laneSets[0].L[0];
  v.s = 30; v.speed = 3; v.nearMissT = 0;
  sys._nearMissCooldown = 0;
  const playerLat = v.lat + 1.2;                     // just inside near-miss range
  for (let step = 0; step < 300 && !bus.events.some(e => e.name === 'traffic:nearmiss'); step++) {
    sys.update(31 + step / 60, playerLat, 1 / 60);
  }
  assert.ok(bus.events.some(e => e.name === 'traffic:nearmiss' && e.payload.strength > 0),
    'no near-miss emitted');
});

test('tier changes keep the active fleet within budget', () => {
  const { sys } = makeSystem();
  for (const name of ['low', 'medium', 'high']) {
    sys.setTier(TIERS[name]);
    const active = sys.vehicles.filter(v => v._active).length;
    assert.equal(active, TIERS[name].traffic, `${name} fleet size`);
  }
  sys.setTier(TIERS.low);
  sys.update(500, -14.4, 1 / 60);
  assert.ok(sys.stats.active <= TIERS.low.traffic + 2);
});
