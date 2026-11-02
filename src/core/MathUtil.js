// Small, dependency-free math helpers used all over the game.
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function smoothstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

// Frame-rate independent smoothing: moves `current` toward `target`.
// `lambda` = responsiveness (higher = snappier). Same result at 30 or 144 fps.
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

// Shortest signed difference between two angles (radians), result in [-PI, PI].
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
export function dampAngle(current, target, lambda, dt) {
  return current + angleDiff(current, target) * (1 - Math.exp(-lambda * dt));
}
