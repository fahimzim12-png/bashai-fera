// Milestone 4 integration: everything works TOGETHER over the whole real corridor.
// Pure Node (no WebGL): route + chunk building + traffic sim + crowd + cinematic camera,
// walked end to end at high speed. If any pair of systems disagrees (NaN, boundary breach,
// runaway counts), this fails before the browser ever loads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteModel } from '../src/world/RouteModel.js';
import { buildChunk, chunkIndexForS } from '../src/world/ChunkBuilder.js';
import { TrafficSystem } from '../src/city/TrafficSystem.js';
import { CrowdSystem } from '../src/city/CrowdSystem.js';
import { CameraRig } from '../src/camera/CameraRig.js';
import { PlayerController } from '../src/player/PlayerController.js';
import { GeometryBuilder } from '../src/render/GeometryBuilder.js';
import { buildLandmark } from '../src/world/landmarks/registry.js';
import { TIERS } from '../src/render/tiers.js';
import { loadRouteJson } from './helpers.mjs';

test('M4 integration: the whole corridor builds, streams, teems and films without a single NaN', () => {
  const route = new RouteModel(loadRouteJson());

  // 1) every chunk of the real corridor builds valid geometry
  const first = chunkIndexForS(route.space.minS), last = chunkIndexForS(route.space.maxS - 1);
  let worst = 0;
  for (let ci = first; ci <= last; ci++) {
    const c = buildChunk(route, ci);
    worst = Math.max(worst, c.ground.triCount + c.pave.triCount + c.facade.triCount + c.facadeB.triCount + c.signs.triCount);
    for (const part of [c.ground, c.pave, c.facade, c.facadeB, c.signs]) {
      assert.ok(part.positions.every(Number.isFinite));
      assert.ok(part.vertexCount === 0 || part.uvs === null || part.uvs.length === part.vertexCount * 2);
    }
  }
  assert.ok(worst < 24000, 'worst chunk stays in the phone budget: ' + worst);

  // 2) every landmark builds against the final route
  let lmTris = 0;
  for (const lm of route.landmarks) {
    const g = new GeometryBuilder();
    const sg = new GeometryBuilder({ uv: true });
    buildLandmark(g, sg, route, lm);
    const d = g.finish(), s = sg.finish();
    lmTris += d.triCount + s.triCount;
    assert.ok(d.positions.every(Number.isFinite), `${lm.id} finite`);
  }
  assert.ok(lmTris < 22000, 'landmark total inside budget: ' + lmTris);

  // 3) systems run together along the full walk
  const tier = TIERS.high;
  const bus = { on: () => {}, emit: () => {} };
  const traffic = new TrafficSystem({ route, bus });
  const crowd = new CrowdSystem({ route, bus });
  traffic.setTier(tier);
  crowd.setTier(tier);
  const player = new PlayerController({
    length: route.length, speedMul: 40,
    walkableAt: (s, o) => route.walkableAt(s, o),
  });
  player.reset(route.startLateral, 0);
  const rig = new CameraRig(route);
  rig.resize(16 / 9);
  rig.snap({ s: 0, x: route.startLateral, vx: 0, phase: 0 });

  const p = {};
  let steps = 0, ended = 0, maxTraffic = 0, maxCrowd = 0;
  const dt = 1 / 60;
  while (steps < 60 * 120) {                       // hard cap ~2 min of sim
    steps++;
    if (player.update(dt, Math.sin(steps * 0.01) * 0.4)) { ended++; player.update(dt, 0); }
    const st = player.interpolate(1, p);
    if (!Number.isFinite(st.s) || !Number.isFinite(st.x)) assert.fail(`non-finite player state at step ${steps}`);
    traffic.update(st.s, st.x, dt);
    crowd.update(st.s, dt);
    rig.update({ s: st.s, x: st.x, vx: st.vx, phase: st.phase }, dt, { steer: 0 });
    maxTraffic = Math.max(maxTraffic, traffic.stats.active);
    maxCrowd = Math.max(maxCrowd, crowd.stats.visible);
    if (ended > 0) break;
  }
  assert.ok(ended === 1, 'the walk reaches the SAARC end exactly once');
  assert.ok(maxTraffic <= tier.traffic, `traffic stays inside the tier budget (${maxTraffic}/${tier.traffic})`);
  assert.ok(maxCrowd <= tier.crowd, `crowd stays inside the tier budget (${maxCrowd}/${tier.crowd})`);
  assert.ok(Number.isFinite(rig.camera.position.x) && Number.isFinite(rig.camera.position.z), 'camera survives the whole route');
  // at 40x walk speed the cinematic spring legitimately lags; once the walk stops it must settle
  const pEnd = player.interpolate(1, p);
  for (let i = 0; i < 240; i++) {
    traffic.update(pEnd.s, pEnd.x, dt);
    crowd.update(pEnd.s, dt);
    rig.update({ s: pEnd.s, x: pEnd.x, vx: 0, phase: pEnd.phase }, dt, { steer: 0 });
  }
  const tail = Math.abs(rig.sCam - (pEnd.s - 4.6));
  assert.ok(tail < 1.5, 'camera settles into the cinematic follow pose at the end: ' + tail.toFixed(2));
});
