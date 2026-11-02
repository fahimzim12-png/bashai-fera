import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerController } from '../src/player/PlayerController.js';
import { CONFIG } from '../src/core/Config.js';

const mk = (over = {}) => new PlayerController({ length: 100, walkableAt: (s, o) => { o.min = -10; o.max = -2; return o; }, ...over });
const run = (p, secs, steer) => { for (let i = 0; i < secs * 60; i++) p.update(1 / 60, steer); };

test('walks forward automatically at the configured speed', () => {
  const p = mk(); p.reset(-5); run(p, 10, 0);
  assert.ok(Math.abs(p.s - 10 * CONFIG.player.forwardSpeed) < 0.1);
});
test('steering moves sideways, left is negative x, right is positive', () => {
  const p = mk(); p.reset(-6); run(p, 0.5, 1); assert.ok(p.x > -6);
  const q = mk(); q.reset(-6); run(q, 0.5, -1); assert.ok(q.x < -6);
});
test('sideways motion stops when input is released', () => {
  const p = mk(); p.reset(-6); run(p, 0.4, 1); run(p, 1, 0); assert.ok(Math.abs(p.vx) < 1e-9);
});
test('cannot leave the walkable strip', () => {
  const p = mk(); p.reset(-6); run(p, 5, 1); assert.ok(p.x <= -2 + 1e-9);
  const q = mk(); q.reset(-6); run(q, 5, -1); assert.ok(q.x >= -10 - 1e-9);
});
test('reaches the end exactly once and then stays', () => {
  const p = mk({ length: 6 }); p.reset(-5); let ends = 0;
  for (let i = 0; i < 600; i++) if (p.update(1 / 60, 0)) ends++;
  assert.equal(ends, 1); assert.equal(p.s, 6); assert.ok(p.finished);
});
test('interpolate blends previous and current step', () => {
  const p = mk(); p.reset(-5); p.update(1 / 60, 0);
  const o = p.interpolate(0.5, {}); assert.ok(o.s > p.prev.s && o.s < p.s);
});
test('speedScale/steerScale hooks work (used by future stumble system)', () => {
  const p = mk(); p.reset(-6); p.speedScale = 0; p.steerScale = 0; run(p, 2, 1);
  assert.equal(p.s, 0); assert.equal(p.x, -6);
});
