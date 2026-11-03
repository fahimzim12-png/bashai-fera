// Pure checks for the shared walk cycle: continuity, symmetry, bounds, idle behaviour.
// The crowd and the hero both drive limbs from these numbers, so a regression here
// would put every person in Dhaka on a broken gait.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkPose, idlePose, blendPose } from '../src/player/walkCycle.js';

const KEYS = ['thighL', 'thighR', 'shinL', 'shinR', 'armL', 'armR', 'elbowL', 'elbowR',
  'bobY', 'swayX', 'torsoPitch', 'torsoRoll', 'headYaw', 'headPitch'];

test('walkPose is continuous across the phase wrap', () => {
  const a = walkPose(0.9999999, 1);
  const b = walkPose(1.0000001, 1);
  for (const k of KEYS) assert.ok(Math.abs(a[k] - b[k]) < 1e-4, `${k} jumps at wrap`);
});

test('walkPose is symmetric: half a cycle swaps left and right', () => {
  for (const p of [0.1, 0.27, 0.63]) {
    const a = walkPose(p, 1), b = walkPose(p + 0.5, 1);
    assert.ok(Math.abs(a.thighL - b.thighR) < 1e-9);
    assert.ok(Math.abs(a.thighR - b.thighL) < 1e-9);
    assert.ok(Math.abs(a.shinL - b.shinR) < 1e-9);
    assert.ok(Math.abs(a.armL - b.armR) < 1e-9);
  }
});

test('arms counter-swing against the same-side leg', () => {
  const p = walkPose(0.15, 1);
  assert.ok(Math.abs(p.thighL + p.armL) > 0.01);   // not both zero
  assert.ok(p.thighL * p.armL < 0 || Math.abs(p.thighL) < 1e-6);
});

test('knees only bend backwards (positive fold) and stay in plausible ranges', () => {
  for (let i = 0; i < 40; i++) {
    const p = walkPose(i / 40, 1);
    assert.ok(p.shinL >= -1e-9 && p.shinL <= 1.05, `shinL ${p.shinL}`);
    assert.ok(p.shinR >= -1e-9 && p.shinR <= 1.05, `shinR ${p.shinR}`);
    assert.ok(Math.abs(p.thighL) <= 0.6 && Math.abs(p.thighR) <= 0.6);
    assert.ok(Math.abs(p.armL) <= 0.5 && Math.abs(p.armR) <= 0.5);
    assert.ok(p.elbowL <= -0.2 && p.elbowL >= -0.85, `elbowL ${p.elbowL}`);
    assert.ok(p.bobY >= 0 && p.bobY <= 0.05);
    for (const k of KEYS) assert.ok(Number.isFinite(p[k]), `${k} not finite`);
  }
});

test('stride 0 is a still pose; stride scales the gait', () => {
  const still = walkPose(0.25, 0);
  assert.equal(Math.abs(still.thighL), 0);   // -0 allowed, movement is not
  assert.equal(still.bobY, 0);
  const half = walkPose(0.25, 0.5), full = walkPose(0.25, 1);
  assert.ok(Math.abs(half.thighL - full.thighL / 2) < 1e-9);
  assert.ok(Math.abs(half.bobY - full.bobY / 2) < 1e-9);
});

test('stride is clamped so a sprinting crowd member cannot break the gait', () => {
  const wild = walkPose(0.25, 9);
  const max = walkPose(0.25, 1.15);
  for (const k of ['thighL', 'shinL', 'armL']) assert.ok(Math.abs(wild[k] - max[k]) < 1e-9);
});

test('idlePose is finite, gentle, and varies with seed', () => {
  const a = idlePose(3.2, 0.1), b = idlePose(3.2, 0.9);
  for (const k of ['bobY', 'torsoPitch', 'torsoRoll', 'headYaw', 'headPitch', 'armL', 'armR']) {
    assert.ok(Number.isFinite(a[k]) && Math.abs(a[k]) < 0.2, `idle ${k} too strong`);
    assert.ok(a[k] !== b[k], `idle ${k} should vary with seed`);
  }
});

test('blendPose lerps every key and clamps t', () => {
  const a = walkPose(0.25, 0), b = walkPose(0.25, 1);
  const mid = { ...a };
  blendPose(mid, a, b, 0.5);
  assert.ok(Math.abs(mid.thighL - (a.thighL + b.thighL) / 2) < 1e-9);
  const over = { ...a };
  blendPose(over, a, b, 7);      // t clamped to 1
  assert.ok(Math.abs(over.thighL - b.thighL) < 1e-9);
});
