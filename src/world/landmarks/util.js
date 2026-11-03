// Shared helpers for landmark builders. Same discipline as ChunkBuilder:
// pure array geometry in, no Three.js, deterministic output.
const UP = [0, 1, 0];

export function dirOf(a, b) {
  const x = b[0] - a[0], y = b[1] - a[1], z = b[2] - a[2];
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}
export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Two unit perpendiculars to `axis` (v leans toward world-up when possible). */
export function axesFor(axis) {
  const ref = Math.abs(axis[1]) > 0.94 ? [1, 0, 0] : UP;   // near-vertical beam: use X as reference
  const u = norm(cross(ref, axis));
  const v = norm(cross(axis, u));
  return { u, v };
}

/**
 * Oriented box between two 3D points (arch ribs, stair rails, truss members, blades).
 * uh/vh = half-extents along the two perpendiculars (see axesFor, or pass opts.axes {u,v}).
 */
export function beam(g, a, b, uh, vh, color, opts = {}) {
  const ax = dirOf(a, b);
  const { u, v } = opts.axes || axesFor(ax);
  const P = (t, su, sv) => {
    const p = t ? b : a;
    return [p[0] + u[0] * su * uh + v[0] * sv * vh, p[1] + u[1] * su * uh + v[1] * sv * vh, p[2] + u[2] * su * uh + v[2] * sv * vh];
  };
  g.quad(P(0, -1, 1), P(1, -1, 1), P(1, 1, 1), P(0, 1, 1), color, { hint: v });
  g.quad(P(0, 1, -1), P(1, 1, -1), P(1, -1, -1), P(0, -1, -1), color, { hint: [-v[0], -v[1], -v[2]] });
  g.quad(P(0, 1, -1), P(1, 1, -1), P(1, 1, 1), P(0, 1, 1), color, { hint: u });
  g.quad(P(0, -1, 1), P(1, -1, 1), P(1, -1, -1), P(0, -1, -1), color, { hint: [-u[0], -u[1], -u[2]] });
  if (!opts.skipB) g.quad(P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1), color, { hint: ax });
  if (!opts.skipA) g.quad(P(0, -1, -1), P(0, 1, -1), P(0, 1, 1), P(0, -1, 1), color, { hint: [-ax[0], -ax[1], -ax[2]] });
}
