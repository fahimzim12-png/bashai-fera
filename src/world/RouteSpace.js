// ROUTE SPACE: the heart of the world model.
//
// A route is a curved centre-line. Instead of thinking in raw 3D coordinates,
// everything in the game (player, traffic, hazards, audio zones...) is described by:
//     s = distance walked along the route (metres)
//     x = sideways offset from the centre-line (metres, + = to the player's RIGHT)
// This class converts (s, x) into real world positions only when we need to draw.
//
// World axes: ground is the X/Z plane, +Y is up (Three.js convention).
// Forward vector f = (fx, fz). Right vector r = (-fz, fx).  (f = -Z gives r = +X.)

function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

// Centripetal Catmull-Rom (Barry-Goldman form): a smooth curve through the control points
// that does not overshoot or loop on unevenly spaced points.
function catmullRom(p0, p1, p2, p3, t, alpha = 0.5) {
  const eps = 1e-6;
  const t0 = 0;
  const t1 = t0 + Math.pow(Math.max(dist(p0, p1), eps), alpha);
  const t2 = t1 + Math.pow(Math.max(dist(p1, p2), eps), alpha);
  const t3 = t2 + Math.pow(Math.max(dist(p2, p3), eps), alpha);
  const u = t1 + (t2 - t1) * t;
  const mix = (a, b, ta, tb) => ({
    x: ((tb - u) * a.x + (u - ta) * b.x) / (tb - ta),
    z: ((tb - u) * a.z + (u - ta) * b.z) / (tb - ta),
  });
  const A1 = mix(p0, p1, t0, t1);
  const A2 = mix(p1, p2, t1, t2);
  const A3 = mix(p2, p3, t2, t3);
  const B1 = mix(A1, A2, t0, t2);
  const B2 = mix(A2, A3, t1, t3);
  return mix(B1, B2, t1, t2);
}

export class RouteSpace {
  /**
   * @param {number[][]} controlPoints  [[x,z], ...] in metres
   * @param {{spacing?:number, padStart?:number, padEnd?:number}} opts
   *   padStart/padEnd: straight extensions before s=0 and after s=length so the
   *   camera and distant scenery never see "the end of the world".
   */
  constructor(controlPoints, opts = {}) {
    if (!controlPoints || controlPoints.length < 2) throw new Error('RouteSpace needs at least 2 control points');
    const spacing = opts.spacing || 2;
    const pts = controlPoints.map((p) => ({ x: p[0], z: p[1] }));
    const n = pts.length;
    const reflect = (a, b) => ({ x: 2 * a.x - b.x, z: 2 * a.z - b.z });

    // 1) dense smooth curve
    const dense = [];
    const SUB = 32;
    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : reflect(pts[0], pts[1]);
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i + 2 < n ? pts[i + 2] : reflect(pts[n - 1], pts[n - 2]);
      for (let k = 0; k < SUB; k++) dense.push(catmullRom(p0, p1, p2, p3, k / SUB));
    }
    dense.push({ x: pts[n - 1].x, z: pts[n - 1].z });

    // 2) arc-length table, then resample at (almost) uniform spacing
    const cum = [0];
    for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + dist(dense[i], dense[i - 1]));
    const total = cum[cum.length - 1];
    const count = Math.max(1, Math.round(total / spacing));
    const step = total / count;
    const main = [];
    let seg = 0;
    for (let j = 0; j <= count; j++) {
      const target = j * step;
      while (seg < dense.length - 2 && cum[seg + 1] < target) seg++;
      const span = cum[seg + 1] - cum[seg] || 1;
      const t = Math.min(1, Math.max(0, (target - cum[seg]) / span));
      main.push({ x: dense[seg].x + (dense[seg + 1].x - dense[seg].x) * t, z: dense[seg].z + (dense[seg + 1].z - dense[seg].z) * t });
    }

    // 3) straight extensions at both ends (same spacing so lookup stays O(1))
    const extStart = Math.max(0, Math.ceil((opts.padStart ?? 60) / step));
    const extEnd = Math.max(0, Math.ceil((opts.padEnd ?? 140) / step));
    const dirS = this._unit(main[1].x - main[0].x, main[1].z - main[0].z);
    const dirE = this._unit(main[count].x - main[count - 1].x, main[count].z - main[count - 1].z);
    const all = [];
    for (let k = extStart; k >= 1; k--) all.push({ x: main[0].x - dirS.x * k * step, z: main[0].z - dirS.z * k * step });
    for (let j = 0; j <= count; j++) all.push(main[j]);
    for (let k = 1; k <= extEnd; k++) all.push({ x: main[count].x + dirE.x * k * step, z: main[count].z + dirE.z * k * step });

    // 4) per-point tangents (central differences)
    const m = all.length;
    this._x = new Float64Array(m); this._z = new Float64Array(m);
    this._tx = new Float64Array(m); this._tz = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      this._x[i] = all[i].x; this._z[i] = all[i].z;
      const a = all[Math.max(0, i - 1)], b = all[Math.min(m - 1, i + 1)];
      const u = this._unit(b.x - a.x, b.z - a.z);
      this._tx[i] = u.x; this._tz[i] = u.z;
    }
    this.step = step;
    this._extStart = extStart;
    this._m = m;
    this.length = total;                     // playable length: s in [0, length]
    this.minS = -extStart * step;            // scenery exists in [minS, maxS]
    this.maxS = total + extEnd * step;
  }

  _unit(x, z) { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; }

  /** Fills `out` with the frame at s: position (x,z), forward (fx,fz), right (rx,rz). */
  sample(s, out = {}) {
    const f = Math.min(Math.max(s, this.minS), this.maxS) / this.step + this._extStart;
    const i = Math.min(this._m - 2, Math.max(0, Math.floor(f)));
    const t = f - i;
    out.x = this._x[i] + (this._x[i + 1] - this._x[i]) * t;
    out.z = this._z[i] + (this._z[i + 1] - this._z[i]) * t;
    let tx = this._tx[i] + (this._tx[i + 1] - this._tx[i]) * t;
    let tz = this._tz[i] + (this._tz[i + 1] - this._tz[i]) * t;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l; tz /= l;
    out.fx = tx; out.fz = tz;
    out.rx = -tz; out.rz = tx;
    return out;
  }

  /** World position of route coordinate (s, lateral). */
  toWorld(s, lateral, out = {}) {
    this.sample(s, out);
    out.x += out.rx * lateral;
    out.z += out.rz * lateral;
    return out;
  }

  /** Heading angle (radians) such that rotation.y = heading makes a +Z-facing model face forward. */
  heading(s) { const o = this.sample(s, {}); return Math.atan2(o.fx, o.fz); }
}
