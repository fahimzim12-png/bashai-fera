// Farmgate footbridge - static scenery. The recognisable twin bowed steel arches over the
// Farmgate junction, reimagined to clear the metro viaduct that now runs down the median
// (viaduct top 10.6 m per the route sections, so the deck walks above it).
// Stairs descend along both footpaths, staggered like the real bridge. No collision, no
// interaction; the route JSON clears generated buildings around it (junction plaza).
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';
import { beam } from './util.js';

export function buildFootbridge(g, route, lm) {
  const f = route.space.sample(lm.s, {});
  const deckY = lm.deckY ?? 12.4;
  const half = (lm.span ?? 33) / 2;                        // lateral half-span across the road
  const P = (lat, y, ls = 0) => [f.x + f.fx * ls + f.rx * lat, y, f.z + f.fz * ls + f.rz * lat];
  const ff = [f.fx, f.fz], rr = [f.rx, f.rz];

  const steel = hexToLinear('#79848d'), steelDark = hexToLinear('#5a646c');
  const deckC = hexToLinear('#8a939b'), rail = hexToLinear('#a9b3ba');
  const stairC = hexToLinear('#a49c90'), pierC = hexToLinear('#b0aa9e');

  // deck slab + railings
  g.box([f.x, deckY - 0.55, f.z], ff, rr, 3.2, 0.5, half * 2, deckC, { skipBottom: true });
  for (const s of [-1, 1]) {
    g.box([f.x + f.fx * s * 1.55, deckY - 0.05, f.z + f.fz * s * 1.55], ff, rr, 0.09, 1.1, half * 2, rail, { skipBottom: true });
  }

  // twin arch ribs with vertical hangers
  const SEG = 12, springY = deckY - 0.25, apexY = deckY + 4.6;
  for (const s of [-1, 1]) {
    const ls = s * 1.35;
    let prev = P(-half, springY, ls);
    for (let q = 1; q <= SEG; q++) {
      const t = q / SEG;
      const lat = -half + half * 2 * t;
      const y = springY + (apexY - springY) * Math.sin(Math.PI * t);
      const np = P(lat, y, ls);
      beam(g, prev, np, 0.16, 0.16, steel, { skipA: q > 1 });
      if (q % 2 === 0 && q < SEG) {                        // hanger stay down to the deck rail
        beam(g, np, P(lat, deckY + 0.05, ls), 0.04, 0.04, steelDark, { skipA: true, skipB: true });
      }
      prev = np;
    }
  }

  // cross braces between the ribs
  for (const t of [0.25, 0.5, 0.75]) {
    const lat = -half + half * 2 * t;
    const y = springY + (apexY - springY) * Math.sin(Math.PI * t);
    beam(g, P(lat, y, -1.35), P(lat, y, 1.35), 0.09, 0.09, steelDark, { skipA: true, skipB: true });
  }

  // support piers at the deck ends (in the cleared junction gap)
  for (const s of [-1, 1]) {
    g.box([f.x + f.rx * s * (half - 0.25), 0, f.z + f.rz * s * (half - 0.25)], ff, rr, 0.55, deckY - 0.8, 0.55, pierC, { skipBottom: true });
  }

  // stairs: one run per side, climbing along the footpath, staggered left/right
  const steps = 20, rise = (deckY - 0.3) / steps, tread = 0.42;
  for (const sd of [-1, 1]) {
    const lat = sd * (half - 2.2);                         // footpath centreline
    const dirS = sd < 0 ? 1 : -1;
    for (let k = 0; k < steps; k++) {
      const h = (steps - k) * rise;
      const ls = dirS * (1.7 + (k + 0.5) * tread);
      g.box([f.x + f.fx * ls + f.rx * lat, 0, f.z + f.fz * ls + f.rz * lat], ff, rr, tread, h, 1.7,
        k % 2 ? shade(stairC, 0.94) : stairC, { skipBottom: true });
    }
    // thin handrail following the stairs
    beam(g, P(lat, 0.95, dirS * (1.7 + steps * tread)), P(lat, deckY + 0.85, dirS * 1.7), 0.05, 0.05, steelDark, { skipA: true, skipB: true });
  }
}
