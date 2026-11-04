// Milestone 4: the likeness trait-sheet plumbing. M4.9 (the actual facial likeness from
// the developer's photographs) is GATED on the photos arriving; these tests pin the schema
// so the future data drop lands safely.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LIKENESS, validateTraits } from '../src/player/likeliness.js';

test('default likeness is an honest placeholder with no glasses assumed', () => {
  assert.equal(LIKENESS.placeholder, true, 'no likeness is claimed until photos arrive');
  assert.equal(LIKENESS.glasses, false, 'glasses are NOT assumed');
  assert.ok(validateTraits(LIKENESS).length === 0, 'default sheet is valid');
});

test('trait validator rejects bad data before it can reach the avatar', () => {
  assert.ok(validateTraits(null).length > 0);
  const bad = { ...LIKENESS, skin: 'brown', faceWidth: 9, glasses: 'yes', height: 0.5 };
  const errs = validateTraits(bad);
  for (const key of ['skin', 'faceWidth', 'glasses', 'height']) {
    assert.ok(errs.some((e) => e.includes(key)), `rejects bad ${key}`);
  }
  const good = { ...LIKENESS, skin: '#8a5c38', hair: '#0d0a07', faceWidth: 1.1, jawWidth: 1.05, glasses: true, height: 1.75 };
  assert.deepEqual(validateTraits(good), [], 'a realistic measured sheet passes');
});
