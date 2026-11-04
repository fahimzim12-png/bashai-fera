// Sonargaon gardens (Milestone 4) - beyond the SAARC mor, the 8-acre garden grounds of the
// 1981 Pan Pacific Sonargaon (Peter Hsi): lawns, tree clusters, a perimeter wall with gate
// pillars, and the low-wide hotel block set back in green with balcony bands. Static
// scenery; frames the fountain from behind on the approach.
import { Rng } from '../../core/Rng.js';
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';
import { designByText, designUV, designSpanWidth } from '../signCatalog.js';

export function buildGardens(g, sg, route, lm) {
  const rng = new Rng(`${route.id}:${lm.id}`);
  const side = lm.side ?? -1;
  const sc = route.length + (lm.aheadOfEnd ?? 95);
  const f = route.space.sample(sc, {});
  const prof = route.profileAt(Math.min(route.length, sc));
  const front = Math.abs(prof[side < 0 ? 'frontageL' : 'frontageR']);   // positive = into the garden side

  const P = (ls, lat, y) => [f.x + f.fx * ls + f.rx * lat * side, y, f.z + f.fz * ls + f.rz * lat * side];

  const lawnA = hexToLinear('#55703c'), lawnB = hexToLinear('#4c6636');
  const wallC = hexToLinear('#c9c2b2'), trunkC = hexToLinear('#6b5138');
  const hotel = hexToLinear('#dcd8cc'), win = hexToLinear('#3a4a5c'), glass = hexToLinear('#5d768c');

  // lawns: two big soft-edged bands behind the wall
  g.quad(P(-38, front + 2, 0.02), P(38, front + 2, 0.02), P(38, front + 40, 0.02), P(-38, front + 40, 0.02), lawnA, { hint: [0, 1, 0] });
  g.quad(P(-30, front + 12, 0.04), P(30, front + 12, 0.04), P(30, front + 36, 0.04), P(-30, front + 36, 0.04), lawnB, { hint: [0, 1, 0] });

  // perimeter wall + gate pillars
  g.quad(P(-38, front, 0), P(38, front, 0), P(38, front, 2.4), P(-38, front, 2.4), wallC, { hint: [-side * f.rx, 0, -side * f.rz] });
  g.quad(P(-38, front, 2.4), P(38, front, 2.4), P(38, front, 2.55), P(-38, front, 2.55), shade(wallC, 0.9), { hint: [0, 1, 0] });
  for (const dl of [-3.2, 3.2]) {
    g.box(P(dl, front, 0), [f.fx, f.fz], [f.rx, f.rz], 0.7, 3.6, 0.7, shade(wallC, 0.94), { skipBottom: true });
    g.box(P(dl, front, 3.6), [f.fx, f.fz], [f.rx, f.rz], 1.0, 0.4, 1.0, shade(wallC, 0.85), { skipBottom: true });
  }

  // tree clusters (the grounds read green from the mor)
  for (let k = 0; k < 11; k++) {
    const ls = -36 + rng.next() * 72;
    const lat = front + 5 + rng.next() * 30;
    const th = 3.4 + rng.next() * 3.2;
    g.box(P(ls, lat, 0), [f.fx, f.fz], [f.rx, f.rz], 0.4, th, 0.4, trunkC, { skipBottom: true });
    g.box(P(ls, lat, th), [f.fx, f.fz], [f.rx, f.rz], 3.0 + rng.next() * 1.8, 2.0, 3.0 + rng.next() * 1.8, shade(lawnA, 0.95 + rng.next() * 0.2), { skipBottom: true });
    g.box(P(ls, lat, th + 1.7), [f.fx, f.fz], [f.rx, f.rz], 2.0, 1.3, 2.0, shade(lawnA, 1.15), { skipBottom: true });
  }

  // the hotel block: low-wide, set back, horizontal balcony bands + glass lobby
  const HW = 56, HD = 16, HH = 13.6, back = front + 24;
  g.quad(P(-HW / 2, back, 0), P(HW / 2, back, 0), P(HW / 2, back, 2.2), P(-HW / 2, back, 2.2), glass, { hint: [-side * f.rx, 0, -side * f.rz] });   // lobby glazing
  g.quad(P(-HW / 2, back, 2.2), P(HW / 2, back, 2.2), P(HW / 2, back, HH), P(-HW / 2, back, HH), hotel, { hint: [-side * f.rx, 0, -side * f.rz] });
  for (let k = 0; k < 3; k++) {
    const by = 4.2 + k * 3.2;
    g.quad(P(-HW / 2 + 1, back - 0.35, by), P(HW / 2 - 1, back - 0.35, by), P(HW / 2 - 1, back - 0.35, by + 1.1), P(-HW / 2 + 1, back - 0.35, by + 1.1), shade(win, 1 + k * 0.06), { hint: [-side * f.rx, 0, -side * f.rz] });
    g.quad(P(-HW / 2 + 1, back - 0.42, by + 1.1), P(HW / 2 - 1, back - 0.42, by + 1.1), P(HW / 2 - 1, back - 0.42, by + 1.35), P(-HW / 2 + 1, back - 0.42, by + 1.35), shade(hotel, 0.92), { hint: [-side * f.rx, 0, -side * f.rz] });
  }
  g.quad(P(-HW / 2, back, HH), P(HW / 2, back, HH), P(HW / 2, back + HD, HH), P(-HW / 2, back + HD, HH), shade(hotel, 0.82), { hint: [0, 1, 0] });
  g.box(P(0, back + 6, HH), [f.fx, f.fz], [f.rx, f.rz], 10, 2.2, 6, shade(hotel, 0.9), { skipBottom: true });   // rooftop plant room

  // rooftop nameboard facing the mor
  const di = designByText('SONARGAON');
  if (di >= 0) {
    const du = designUV(di), w2 = designSpanWidth(di);
    sg.quad(P(-w2 / 2, back - 0.5, HH + 0.6), P(w2 / 2, back - 0.5, HH + 0.6), P(w2 / 2, back - 0.5, HH + 1.8), P(-w2 / 2, back - 0.5, HH + 1.8), '#ffffff',
      { hint: [-side * f.rx, 0, -side * f.rz], uv: [[du[0], du[1]], [du[2], du[1]], [du[2], du[3]], [du[0], du[3]]] });
    for (const px of [-w2 / 2 + 0.4, w2 / 2 - 0.4]) {
      g.box(P(px, back - 0.5, HH), [f.fx, f.fz], [f.rx, f.rz], 0.14, 1.4, 0.14, '#5c5c5c', { skipBottom: true });
    }
  }
}
