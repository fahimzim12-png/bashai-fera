// MRT-6 metro station v2 (Milestone 4) - used for BOTH Farmgate and Kawran Bazar via the
// `name` field in the route JSON. Three levels like the real stations (~180 m, street
// landings, concourse, side platforms): green DMTCL brand bands (#006747), glazed platform
// level, roof canopy, median columns, the odd portal-frame pillar that stands IN the
// carriageway at Farmgate, footpath access towers with READABLE nameboards from the sign
// atlas, and catenary masts on the deck edge. Static scenery; no interaction.
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';
import { beam } from './util.js';
import { designByText, designUV, designSpanWidth } from '../signCatalog.js';

export function buildStation(g, sg, route, lm) {
  const L = lm.length ?? 90, half = L / 2;
  const s0 = lm.s - half;
  const STEP = 8, n = Math.round(L / STEP);
  const frames = [];
  for (let i = 0; i <= n; i++) frames.push(route.space.sample(s0 + i * STEP, {}));

  const brand = hexToLinear('#006747'), brandDark = shade(brand, 0.7);
  const glass = hexToLinear('#22384a'), body = hexToLinear('#c2c6c9');
  const roofC = hexToLinear('#7e858b'), concrete = hexToLinear('#b3aea4');
  const lit = hexToLinear('#f2c98a'), board = hexToLinear('#eef0ee');

  const y0 = 10.6, y1 = 15.9, hw = 5.25;

  // main body per 8 m span so it follows the curve: brand band / concourse glass / wall
  for (let i = 0; i < frames.length - 1; i++) {
    const A = frames[i], B = frames[i + 1];
    const PA = (lat, y) => [A.x + A.rx * lat, y, A.z + A.rz * lat];
    const PB = (lat, y) => [B.x + B.rx * lat, y, B.z + B.rz * lat];
    for (const s of [-1, 1]) {
      const lat = s * hw, hint = [s * A.rx, 0, s * A.rz];
      g.quad(PA(lat, y0), PB(lat, y0), PB(lat, y0 + 1.0), PA(lat, y0 + 1.0), brand, { hint });            // brand band
      g.quad(PA(lat, y0 + 1.0), PB(lat, y0 + 1.0), PB(lat, y0 + 2.7), PA(lat, y0 + 2.7), glass, { hint }); // concourse glazing
      g.quad(PA(lat, y0 + 2.7), PB(lat, y0 + 2.7), PB(lat, y0 + 3.4), PA(lat, y0 + 3.4), body, { hint });  // spandrel
      g.quad(PA(lat, y0 + 3.4), PB(lat, y0 + 3.4), PB(lat, y1 - 0.6), PA(lat, y1 - 0.6), glass, { hint }); // platform glazing
      g.quad(PA(lat, y1 - 0.6), PB(lat, y1 - 0.6), PB(lat, y1), PA(lat, y1), body, { hint });              // fascia
      if ((i + (s > 0 ? 1 : 0)) % 3 === 1) {                                                               // some bays glow warm
        g.quad(PA(lat, y0 + 1.2), PB(lat, y0 + 1.2), PB(lat, y0 + 2.5), PA(lat, y0 + 2.5), lit, { hint });
      }
    }
    // roof canopy + fascia
    const lw = hw + 0.9;
    g.quad(PA(-lw, y1), PB(-lw, y1), PB(lw, y1), PA(lw, y1), roofC, { hint: [0, 1, 0] });
    for (const s of [-1, 1]) {
      g.quad(PA(s * lw, y1), PB(s * lw, y1), PB(s * lw, y1 - 0.28), PA(s * lw, y1 - 0.28), brandDark, { hint: [s * A.rx, 0, s * A.rz] });
    }
    // catenary masts on one deck edge (1500 V DC overhead line)
    if (i % 4 === 2) {
      const C = PA(0, y1);
      g.box([C[0], y1, C[2]], [A.fx, A.fz], [A.rx, A.rz], 0.12, 1.5, 0.12, concrete, { skipBottom: true });
      g.box([A.x + A.rx * 1.6, y1 + 1.2, A.z + A.rz * 1.6], [A.fx, A.fz], [A.rx, A.rz], 0.07, 0.07, 2.6, concrete, { skipBottom: true });
    }
  }

  // end caps
  for (const idx of [0, frames.length - 1]) {
    const E = frames[idx];
    const D = frames[idx === 0 ? 1 : frames.length - 2];
    const hint = [(E.x - D.x) || E.rx, 0, (E.z - D.z) || E.rz];
    const PE = (lat, y) => [E.x + E.rx * lat, y, E.z + E.rz * lat];
    g.quad(PE(-hw, y0), PE(hw, y0), PE(hw, y1), PE(-hw, y1), brand, { hint });
    g.quad(PE(-hw, y0 + 1.0), PE(hw, y0 + 1.0), PE(hw, y1 - 0.6), PE(-hw, y1 - 0.6), glass, { hint });
  }

  // median columns under the body (like the viaduct piers)
  for (let k = 0; k <= 4; k++) {
    const s = lm.s - half + 10 + k * (L - 20) / 4;
    const f = route.space.sample(s, {});
    for (const sd of [-1, 1]) {
      g.box([f.x + f.rx * sd * 2.55, 0.55, f.z + f.rz * sd * 2.55], [f.fx, f.fz], [f.rx, f.rz], 0.7, y0 - 0.55, 0.7, concrete, { skipBottom: true });
    }
  }

  // the Farmgate oddity: one portal-frame pillar standing IN the carriageway left of the median
  if (lm.name && lm.name.en === 'FARMGATE') {
    const fp = route.space.sample(lm.s + 26, {});
    const leg = (lat) => g.box([fp.x + fp.rx * lat, 0, fp.z + fp.rz * lat], [fp.fx, fp.fz], [fp.rx, fp.rz], 0.9, 8.6, 0.9, concrete, { skipBottom: true });
    leg(-7.4); leg(-4.6);
    g.box([fp.x + fp.rx * -6.0, 8.6, fp.z + fp.rz * -6.0], [fp.fx, fp.fz], [fp.rx, fp.rz], 0.8, 1.2, 3.6, concrete, { skipBottom: true });
  }

  // two access towers on the footpaths + link bridges + READABLE nameboards
  const di = designByText(lm.name ? lm.name.en : 'FARMGATE');
  for (const sd of [-1, 1]) {
    const f = route.space.sample(lm.s + sd * (L / 2 - 14), {});
    const lat = sd * 14.4;
    g.box([f.x + f.rx * lat, 0, f.z + f.rz * lat], [f.fx, f.fz], [f.rx, f.rz], 4.2, 12.4, 3.4, body, { skipBottom: true });
    g.box([f.x + f.rx * (lat - sd * 1.76), 3.6, f.z + f.rz * (lat - sd * 1.76)], [f.fx, f.fz], [f.rx, f.rz], 0.12, 6.4, 0.6, glass, { skipBottom: true });
    beam(g, [f.x + f.rx * lat, 11.6, f.z + f.rz * lat], [f.x + f.rx * sd * 5.6, 12.4, f.z + f.rz * sd * 5.6], 0.16, 1.25, shade(body, 0.88), {});
    // nameboard: green band + sign-atlas quad (Bangla headline + Latin subtext)
    const bLat = lat - sd * 1.78;
    g.quad([f.x + f.rx * bLat - f.fx * 1.7, 9.0, f.z + f.rz * bLat - f.fz * 1.7],
           [f.x + f.rx * bLat + f.fx * 1.7, 9.0, f.z + f.rz * bLat + f.fz * 1.7],
           [f.x + f.rx * bLat + f.fx * 1.7, 10.4, f.z + f.rz * bLat + f.fz * 1.7],
           [f.x + f.rx * bLat - f.fx * 1.7, 10.4, f.z + f.rz * bLat - f.fz * 1.7], brand,
           { hint: [-sd * f.rx, 0, -sd * f.rz] });
    if (di >= 0) {
      const du = designUV(di), w2 = Math.min(3.2, designSpanWidth(di));
      const A = [f.x + f.rx * (bLat - sd * 0.03) - f.fx * w2 / 2, 9.15, f.z + f.rz * (bLat - sd * 0.03) - f.fz * w2 / 2];
      const B = [f.x + f.rx * (bLat - sd * 0.03) + f.fx * w2 / 2, 9.15, f.z + f.rz * (bLat - sd * 0.03) + f.fz * w2 / 2];
      sg.quad(A, B,
        [B[0], B[1] + 1.05, B[2]], [A[0], A[1] + 1.05, A[2]], '#ffffff',
        { hint: [-sd * f.rx, 0, -sd * f.rz], uv: [[du[0], du[1]], [du[2], du[1]], [du[2], du[3]], [du[0], du[3]]] });
    }
  }
}
