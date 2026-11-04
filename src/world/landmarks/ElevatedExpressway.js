// Dhaka Elevated Expressway (Milestone 4) - the real Phase 1 structure that runs along the
// railway corridor on the LEFT/east side of the avenue: a box-girder deck on twin-column
// piers, guard rails, and the ramp that descends to its Indira Road landing east of
// Farmgate. The deck height is authored in the landmark (deckY), the ramp profile eases to
// ground before the end of its s-range. Static scenery.
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';

const smoothstep = (t) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

export function buildExpressway(g, sg, route, lm) {
  const side = lm.side ?? -1;
  const LAT = 52;                                          // deck centreline: distance INTO the rail side
  const HW = 5.5;                                          // deck half-width
  const deckY = lm.deckY ?? 17;
  const s0 = lm.s0, s1 = lm.s1;
  const RAMP_START = s0 + (s1 - s0) * 0.42;

  const yAt = (s) => {
    if (s <= RAMP_START) return deckY;
    return deckY * (1 - smoothstep((s - RAMP_START) / (s1 - 24 - RAMP_START)));
  };

  const concrete = hexToLinear('#a9a9a1'), concreteDark = hexToLinear('#8c8c84');
  const rail = hexToLinear('#bdbdb6'), barrier = hexToLinear('#c9c9c2');

  const frameCache = new Map();
  const frameAt = (s) => {
    const key = Math.round(s);
    if (!frameCache.has(key)) {
      const f = route.space.sample(key, {});
      frameCache.set(key, f);
    }
    return frameCache.get(key);
  };
  const P = (f, ls, lat, y) => [f.x + f.fx * ls + f.rx * lat * side, y, f.z + f.fz * ls + f.rz * lat * side];

  // deck: top + two side faces + soffit, per 6 m frame
  const STEP = 6;
  for (let s = s0; s < s1 - STEP * 0.5; s += STEP) {
    const yA = yAt(s), yB = yAt(s + STEP);
    const fa = frameAt(s), fb = frameAt(s + STEP);
    const yAc = Math.max(yA, 0.9), yBc = Math.max(yB, 0.9);   // deck thickness near ground
    g.quad(P(fa, 0, LAT - HW, yAc), P(fb, 0, LAT - HW, yBc), P(fb, 0, LAT + HW, yBc), P(fa, 0, LAT + HW, yAc), concrete, { hint: [0, 1, 0] });
    g.quad(P(fa, 0, LAT - HW, 0), P(fb, 0, LAT - HW, 0), P(fb, 0, LAT - HW, yBc), P(fa, 0, LAT - HW, yAc), concreteDark, { hint: [fa.rx * side, 0, fa.rz * side] });
    g.quad(P(fa, 0, LAT + HW, 0), P(fb, 0, LAT + HW, 0), P(fb, 0, LAT + HW, yBc), P(fa, 0, LAT + HW, yAc), concreteDark, { hint: [-fa.rx * side, 0, -fa.rz * side] });
    // guard rails
    for (const rl of [LAT - HW + 0.2, LAT + HW - 0.2]) {
      g.quad(P(fa, 0, rl, yAc), P(fb, 0, rl, yBc), P(fb, 0, rl, yBc + 1.0), P(fa, 0, rl, yAc + 1.0), rail, { hint: [fa.rx * (rl < LAT ? -1 : 1) * side, 0, fa.rz * (rl < LAT ? -1 : 1) * side] });
    }
    // central barrier
    g.quad(P(fa, 0, LAT, yAc), P(fb, 0, LAT, yBc), P(fb, 0, LAT, yBc + 0.9), P(fa, 0, LAT, yAc + 0.9), barrier, { double: true });
  }

  // piers: twin columns + cap every 26 m where the deck is high enough
  for (let s = s0 + 13; s < s1 - 10; s += 26) {
    const y = yAt(s);
    if (y < 4) continue;
    const f = frameAt(s);
    for (const dl of [-1.6, 1.6]) {
      g.box(P(f, 0, LAT + dl, 0), [f.fx, f.fz], [f.rx, f.rz], 1.0, y - 1.4, 1.0, concreteDark, { skipBottom: true });
    }
    g.box(P(f, 0, LAT, y - 1.5), [f.fx, f.fz], [f.rx, f.rz], 1.2, 1.5, 6.4, concrete, { skipBottom: true });
  }
}
