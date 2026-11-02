import test from 'node:test';
import assert from 'node:assert/strict';
import { Rng, hashString } from '../src/core/Rng.js';
import { EventBus } from '../src/core/EventBus.js';
import { StateMachine } from '../src/core/StateMachine.js';
import { ObjectPool } from '../src/core/ObjectPool.js';
import { damp, angleDiff, clamp } from '../src/core/MathUtil.js';

test('Rng: same seed gives same sequence, different seed differs', () => {
  const a = new Rng('x'), b = new Rng('x'), c = new Rng('y');
  const sa = [a.next(), a.next(), a.next()], sb = [b.next(), b.next(), b.next()], sc = [c.next(), c.next(), c.next()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((v) => v >= 0 && v < 1));
});
test('Rng: int() is inclusive and within bounds', () => {
  const r = new Rng(7); const seen = new Set();
  for (let i = 0; i < 500; i++) { const v = r.int(2, 4); assert.ok(v >= 2 && v <= 4); seen.add(v); }
  assert.deepEqual([...seen].sort(), [2, 3, 4]);
});
test('hashString is stable', () => { assert.equal(hashString('bashai'), hashString('bashai')); });

test('EventBus: on / once / off', () => {
  const bus = new EventBus(); let n = 0, m = 0;
  const off = bus.on('a', () => n++); bus.once('a', () => m++);
  bus.emit('a'); bus.emit('a'); off(); bus.emit('a');
  assert.equal(n, 2); assert.equal(m, 1);
});

test('StateMachine: enter/exit order and only current updates', () => {
  const log = [];
  const sm = new StateMachine({
    a: { enter: () => log.push('enter a'), exit: (n) => log.push('exit a->' + n), update: () => log.push('upd a') },
    b: { enter: (p) => log.push('enter b from ' + p), update: () => log.push('upd b') },
  });
  sm.go('a'); sm.update(1); sm.go('b'); sm.update(1);
  assert.deepEqual(log, ['enter a', 'upd a', 'exit a->b', 'enter b from a', 'upd b']);
  assert.throws(() => sm.go('nope'));
});

test('ObjectPool reuses released objects', () => {
  let made = 0; const p = new ObjectPool(() => ({ id: ++made }));
  const o = p.acquire(); p.release(o); assert.equal(p.acquire(), o); assert.equal(made, 1);
});

test('MathUtil: damp converges, angleDiff takes the short way', () => {
  let v = 0; for (let i = 0; i < 120; i++) v = damp(v, 10, 8, 1 / 60); assert.ok(Math.abs(v - 10) < 0.2);
  assert.ok(Math.abs(angleDiff(3.1, -3.1)) < 0.1);
  assert.equal(clamp(5, 0, 3), 3);
});
