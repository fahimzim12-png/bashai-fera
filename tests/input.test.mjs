import test from 'node:test';
import assert from 'node:assert/strict';
import { mixSteer, sideForX, PointerTracker } from '../src/input/SteeringMixer.js';

test('mixSteer: left/right/none/both', () => {
  assert.equal(mixSteer({}), 0);
  assert.equal(mixSteer({ keyLeft: true }), -1);
  assert.equal(mixSteer({ keyRight: true }), 1);
  assert.equal(mixSteer({ keyLeft: true, keyRight: true }), 0);
  assert.equal(mixSteer({ pointerRight: true }), 1);
  assert.equal(mixSteer({ keyLeft: true, pointerRight: true }), 0);
});
test('sideForX splits the screen in half', () => {
  assert.equal(sideForX(100, 800), -1); assert.equal(sideForX(500, 800), 1);
});
test('PointerTracker: multi-touch, drag across middle, release', () => {
  const t = new PointerTracker();
  t.down(1, 100, 800); assert.ok(t.left && !t.right);
  t.down(2, 700, 800); assert.ok(t.left && t.right);
  t.up(1); assert.ok(!t.left && t.right);
  t.move(2, 100, 800); assert.ok(t.left && !t.right);
  t.up(2); assert.equal(t.count, 0);
});
