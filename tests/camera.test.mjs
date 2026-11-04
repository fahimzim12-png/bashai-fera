// Milestone 4: cinematic camera rig checks. The rig owns a real THREE.PerspectiveCamera,
// which needs no WebGL, so these run in plain Node.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteModel } from '../src/world/RouteModel.js';
import { CameraRig } from '../src/camera/CameraRig.js';
import { loadRouteJson } from './helpers.mjs';

function makeRig() {
  const route = new RouteModel(loadRouteJson());
  const rig = new CameraRig(route);
  rig.resize(16 / 9);
  return { route, rig };
}
const walker = (s, x = -14.4, vx = 0) => ({ s, x, vx, phase: 0 });

test('camera: springs settle behind the walker without overshooting forever', () => {
  const { rig } = makeRig();
  const p = walker(100);
  rig.snap(p);
  assert.ok(Math.abs(rig.camera.position.z) > 0, 'camera placed in the world');
  let lastDist = 1e9;
  for (let i = 0; i < 240; i++) {
    rig.update(p, 1 / 60, { steer: 0 });
    const d = Math.abs(rig.sCam - (p.s - rig.cfg.distance));   // M5: distance is config-driven
    assert.ok(d <= lastDist + 0.35, 'spring converges monotonically enough');
    lastDist = d;
  }
  assert.ok(lastDist < 0.6, 'camera settles ~' + rig.cfg.distance + ' m behind: ' + lastDist.toFixed(3));
});

test('camera: handheld sway stays subtle and never diverges', () => {
  const { rig } = makeRig();
  const p = walker(200);
  rig.snap(p);
  const base = rig.camera.position.clone();
  for (let i = 0; i < 600; i++) {
    rig.update(p, 1 / 60, { steer: 0 });
    const off = rig.camera.position.distanceTo(base);
    assert.ok(off < 0.9, 'sway stays under 0.9 m of the follow point: ' + off.toFixed(3));
  }
});

test('camera: near-miss punch decays quickly and shake returns to zero', () => {
  const { rig } = makeRig();
  const p = walker(300);
  rig.snap(p);
  rig.addShake(0.5);
  rig.punch(1);
  const fovPunched = rig.camera.fov;
  for (let i = 0; i < 180; i++) rig.update(p, 1 / 60, { steer: 0 });
  assert.ok(rig.camera.fov <= fovPunched, 'FOV punch decays');
  assert.ok(rig._shake === 0, 'shake fully decays');
});

test('camera: landmark reveal fires before a progress mark and is skipped by input', () => {
  const { route, rig } = makeRig();
  const mark = route.progressMarks[0];
  const p = walker(mark.s - 30);
  rig.snap(p);
  for (let i = 0; i < 40; i++) rig.update(p, 1 / 60, { steer: 0 });   // walks? no - static walker
  // static walker never crosses the trigger; move him across it
  const p2 = walker(mark.s - 27);
  rig.snap(p2);
  p2.s = mark.s - 24;
  rig.update(p2, 1 / 60, { steer: 0 });
  assert.ok(rig._reveal !== null, 'reveal triggers approaching the mark');
  const rig2 = makeRig().rig;
  const q = walker(mark.s - 27);
  rig2.snap(q);
  q.s = mark.s - 24;
  rig2.update(q, 1 / 60, { steer: 0.9 });
  assert.ok(rig2._reveal === null, 'hard steering skips the reveal');
});

test('camera: intro dolly plays once and clears', () => {
  const { rig } = makeRig();
  const p = walker(10);
  rig.snap(p);
  rig.playIntro();
  assert.ok(rig._introT >= 0, 'intro armed');
  for (let i = 0; i < 260; i++) rig.update(p, 1 / 60, { steer: 0 });
  assert.ok(rig._introT === -1, 'intro finished on its own');
  rig.playIntro();
  rig.update(p, 1 / 60, { steer: 1 });
  assert.ok(rig._introT === -1, 'input skips the intro');
});

test('camera: portrait aspect keeps the player on screen and FOV clamped', () => {
  const { rig } = makeRig();
  rig.resize(9 / 16);
  const p = walker(50, -3.8);
  rig.snap(p);
  for (let i = 0; i < 120; i++) {
    rig.update(p, 1 / 60, { steer: 0 });
    const off = p.x - rig.xCam;
    assert.ok(Math.abs(off) < 6.5, 'keep-in-view clamp holds in portrait: ' + off.toFixed(2));
  }
  assert.ok(rig.camera.fov <= 92, 'portrait FOV within the widened clamp: ' + rig.camera.fov);
});
