// Pure procedural walk-cycle maths, shared by the hero avatar and every background
// pedestrian (CrowdSystem). No Three.js, no state: pose = f(phase, stride), so the gait
// is identical everywhere, unit-testable in Node, and stride can be animated per person.
//
// Sign convention (matches the avatar model space, which faces +Z):
// - a positive rotation.x tips the top of a part toward +Z (forward lean);
// - for a limb hanging down (-Y), a positive rotation.x swings its tip toward -Z
//   (backward), so "leg forward" is a NEGATIVE rotation.x value.
// The values below are the exact rotation.x values to apply - no further sign juggling
// at the call sites.

import { TAU } from '../core/MathUtil.js';

/**
 * One pose of the walk cycle.
 * @param phase   walk cycles completed (1.0 = one full left+right step pair)
 * @param stride  0..1.15 gait amplitude; 0 = standing still, 1 = natural walk
 * @returns joint rotation.x values (radians) plus body offsets, all deterministic
 *          and continuous across the phase wrap (phase 0 === phase 1).
 */
export function walkPose(phase, stride = 1) {
  const s = Math.max(0, Math.min(1.15, stride));
  const a = phase * TAU;
  const sin = Math.sin(a);
  const cos = Math.cos(a);

  // Legs: thighs swing opposite; the knee folds only while that leg swings forward,
  // plus a small constant stance flex so the supporting leg never looks rigid.
  const foldL = Math.max(0, sin) * 0.85;
  const foldR = Math.max(0, -sin) * 0.85;
  const thighL = -sin * 0.55 * s;
  const thighR = sin * 0.55 * s;
  const shinL = (foldL + 0.12) * s;
  const shinR = (foldR + 0.12) * s;

  // Arms counter-swing; elbows are always a little bent, more as the arm comes forward.
  const armL = sin * 0.42 * s;   // negative (forward) exactly when the left leg is back
  const armR = -armL;
  const elbowL = -(0.3 + Math.max(0, -sin) * 0.45) * s;
  const elbowR = -(0.3 + Math.max(0, sin) * 0.45) * s;

  return {
    thighL, thighR, shinL, shinR, armL, armR, elbowL, elbowR,
    bobY: Math.abs(sin) * 0.035 * s,       // body rises twice per cycle (push-off)
    swayX: cos * 0.02 * s,                 // weight shifts over the passing leg
    torsoPitch: 0.07 * s,                  // slight forward lean while walking
    torsoRoll: sin * 0.035 * s,
    headYaw: -sin * 0.05 * s,              // head steadies against the torso counter-turn
    headPitch: 0.02 * s,
  };
}

/**
 * Additive idle "being alive" offsets (breathing, weight shifts) for a person who is
 * standing - used by the hero on menus and by standing/talking crowd members.
 * Pure function of time and a per-person seed so everyone sways differently.
 */
export function idlePose(time, seed = 0) {
  const w1 = time * 1.4 + seed * 6.283;
  const w2 = time * 0.9 + seed * 12.9;
  return {
    bobY: Math.sin(w1) * 0.008,
    torsoPitch: 0.015 + Math.sin(w1 * 0.7) * 0.01,
    torsoRoll: Math.sin(w2) * 0.015,
    headYaw: Math.sin(w2 * 1.3) * 0.14,     // looking around slowly
    headPitch: Math.sin(w1 * 0.5) * 0.04,
    armL: Math.sin(w1) * 0.02,
    armR: Math.sin(w1 + 1.7) * 0.02,
  };
}

/** Blend two poses (walkPose/idlePose shapes) - used for talk gestures and start/stop.
 * Missing keys are treated as 0, so poses of different shapes blend safely. */
export function blendPose(out, a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  for (const key in out) {
    const av = a[key] ?? 0, bv = b[key] ?? 0;
    out[key] = av + (bv - av) * k;
  }
  return out;
}
