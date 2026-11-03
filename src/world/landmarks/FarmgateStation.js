// Farmgate MRT-6 style metro station - static scenery. An elevated concourse box sitting on
// the existing viaduct (top 10.6 m in the route sections): teal band, glazed platform level
// with a few warm lit bays, roof canopy, median columns and two footpath access towers with
// link bridges. Abstract shapes only - no real signage text. No collision, no interaction.
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';
import { beam } from './util.js';

export function buildStation(g, route, lm) {
  const L = lm.length ?? 64, half = L / 2;
  const s0 = lm.s - half;
  const STEP = 8, n = Math.round(L / STEP);
  const frames = [];
  for (let i = 0; i <= n; i++) frames.push(route.space.sample(s0 + i * STEP, {}));

  const teal = hexToLinear('#1f8a8a'), tealDark = shade(teal, 0.7);
  const glass = hexToLinear('#22384a'), body = hexToLinear('#c2c6c9');
  const roofC = hexToLinear('#7e858b'), concrete = hexToLinear('#b3aea4');
  const lit = hexToLinear('#f2c98a'), board = hexToLinear('#eef0ee');

  const y0 = 10.6, y1 = 14.0, hw = 5.25;

  // main body per 8 m span so it follows the curve
  for (let i = 0; i < frames.length - 1; i++) {
    const A = frames[i], B = frames[i + 1];
    const PA = (lat, y) => [A.x + A.rx * lat, y, A.z + A.rz * lat];
    const PB = (lat, y) => [B.x + B.rx * lat, y, B.z + B.rz * lat];
    for (const s of [-1, 1]) {
      const lat = s * hw, hint = [s * A.rx, 0, s * A.rz];
      g.quad(PA(lat, y0), PB(lat, y0), PB(lat, y0 + 1.0), PA(lat, y0 + 1.0), teal, { hint });            // teal base band
      g.quad(PA(lat, y0 + 1.0), PB(lat, y0 + 1.0), PB(lat, y0 + 2.7), PA(lat, y0 + 2.7), glass, { hint }); // glazed platform
      g.quad(PA(lat, y0 + 2.7), PB(lat, y0 + 2.7), PB(lat, y1), PA(lat, y1), body, { hint });             // upper wall
      if ((i + (s > 0 ? 1 : 0)) % 3 === 1) {                                                              // some bays glow warm
        g.quad(PA(lat, y0 + 1.2), PB(lat, y0 + 1.2), PB(lat, y0 + 2.5), PA(lat, y0 + 2.5), lit, { hint });
      }
    }
    // roof canopy + fascia
    const lw = hw + 0.9;
    g.quad(PA(-lw, y1), PB(-lw, y1), PB(lw, y1), PA(lw, y1), roofC, { hint: [0, 1, 0] });
    for (const s of [-1, 1]) {
      g.quad(PA(s * lw, y1), PB(s * lw, y1), PB(s * lw, y1 - 0.28), PA(s * lw, y1 - 0.28), tealDark, { hint: [s * A.rx, 0, s * A.rz] });
    }
  }

  // end caps: teal / glass / wall stack
  for (const idx of [0, frames.length - 1]) {
    const E = frames[idx];
    const D = frames[idx === 0 ? 1 : frames.length - 2];
    const hint = [(E.x - D.x) || E.rx, 0, (E.z - D.z) || E.rz];
    const PE = (lat, y) => [E.x + E.rx * lat, y, E.z + E.rz * lat];
    g.quad(PE(-hw, y0), PE(hw, y0), PE(hw, y0 + 1.0), PE(-hw, y0 + 1.0), teal, { hint });
    g.quad(PE(-hw, y0 + 1.0), PE(hw, y0 + 1.0), PE(hw, y0 + 2.7), PE(-hw, y0 + 2.7), glass, { hint });
    g.quad(PE(-hw, y0 + 2.7), PE(hw, y0 + 2.7), PE(hw, y1), PE(-hw, y1), body, { hint });
  }

  // median columns under the body (like the viaduct piers)
  for (let k = 0; k <= 4; k++) {
    const s = lm.s - half + 8 + k * 12;
    const f = route.space.sample(s, {});
    for (const sd of [-1, 1]) {
      g.box([f.x + f.rx * sd * 2.55, 0.55, f.z + f.rz * sd * 2.55], [f.fx, f.fz], [f.rx, f.rz], 0.7, y0 - 0.55, 0.7, concrete, { skipBottom: true });
    }
  }

  // two access towers on the footpaths + enclosed link bridges to the platform
  for (const sd of [-1, 1]) {
    const f = route.space.sample(lm.s + sd * 22, {});
    const lat = sd * 14.4;
    g.box([f.x + f.rx * lat, 0, f.z + f.rz * lat], [f.fx, f.fz], [f.rx, f.rz], 4.2, 11.6, 3.4, body, { skipBottom: true });
    g.box([f.x + f.rx * (lat - sd * 1.76), 3.6, f.z + f.rz * (lat - sd * 1.76)], [f.fx, f.fz], [f.rx, f.rz], 0.12, 5.6, 0.6, glass, { skipBottom: true });
    beam(g, [f.x + f.rx * lat, 11.0, f.z + f.rz * lat], [f.x + f.rx * sd * 5.6, 12.2, f.z + f.rz * sd * 5.6], 0.16, 1.25, shade(body, 0.88), {});
    // station name board (abstract - dark strokes on a pale band, no text)
    const bLat = lat - sd * 1.78;
    g.quad([f.x + f.rx * bLat - f.fx * 1.6, 8.9, f.z + f.rz * bLat - f.fz * 1.6],
           [f.x + f.rx * bLat + f.fx * 1.6, 8.9, f.z + f.rz * bLat + f.fz * 1.6],
           [f.x + f.rx * bLat + f.fx * 1.6, 10.1, f.z + f.rz * bLat + f.fz * 1.6],
           [f.x + f.rx * bLat - f.fx * 1.6, 10.1, f.z + f.rz * bLat - f.fz * 1.6], board,
           { hint: [-sd * f.rx, 0, -sd * f.rz] });
    for (const o of [-0.8, 0.1, 0.9]) {
      g.quad([f.x + f.rx * (bLat - sd * 0.02) + f.fx * o, 9.15, f.z + f.rz * (bLat - sd * 0.02) + f.fz * o],
             [f.x + f.rx * (bLat - sd * 0.02) + f.fx * (o + 0.3), 9.15, f.z + f.rz * (bLat - sd * 0.02) + f.fz * (o + 0.3)],
             [f.x + f.rx * (bLat - sd * 0.02) + f.fx * (o + 0.3), 9.85, f.z + f.rz * (bLat - sd * 0.02) + f.fz * (o + 0.3)],
             [f.x + f.rx * (bLat - sd * 0.02) + f.fx * o, 9.85, f.z + f.rz * (bLat - sd * 0.02) + f.fz * o],
             glass, { hint: [-sd * f.rx, 0, -sd * f.rz] });
    }
  }
}
