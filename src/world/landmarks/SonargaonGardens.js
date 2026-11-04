// Sonargaon gardens (Milestone 5 photo regrade) - beyond the SAARC mor, the 8-acre garden
// grounds of the 1981 Pan Pacific Sonargaon (Peter Hsi). The hotel itself follows the
// reference photo (q4_sonargaon_4): a LONG TERRACOTTA-MAROON SLAB (#8e5b4d body, deep
// #56292b brise-soleil fins + roof band), an arched red pavilion over the fountain pool,
// patterned sand-and-red plaza paving, lawns and tree clusters behind a perimeter wall.
// Static scenery; frames the fountain from behind on the approach.
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

  const lawnA = hexToLinear('#4e7c3c'), lawnB = hexToLinear('#446e34');
  const wallC = hexToLinear('#d8c8a8'), trunkC = hexToLinear('#6b5138');
  // photo q4_sonargaon_4: terracotta body, deep maroon fins/bands, sand plaza
  // (tones lifted ~1.25x: the slab faces away from the afternoon sun and must still read)
  const terra = hexToLinear('#b06f5e'), maroon = hexToLinear('#6d3537'), rust = hexToLinear('#8a403c');
  const sand = hexToLinear('#b99275'), sandDark = hexToLinear('#9a7358');
  const water = hexToLinear('#7fb2c9'), pavilion = hexToLinear('#a5504a');

  // lawns: two big soft-edged bands behind the wall
  g.quad(P(-38, front + 2, 0.02), P(38, front + 2, 0.02), P(38, front + 40, 0.02), P(-38, front + 40, 0.02), lawnA, { hint: [0, 1, 0] });
  g.quad(P(-30, front + 12, 0.04), P(30, front + 12, 0.04), P(30, front + 36, 0.04), P(-30, front + 36, 0.04), lawnB, { hint: [0, 1, 0] });

  // perimeter wall + gate pillars (sandstone tone, photo shows a low cream wall)
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

  // ---- patterned plaza between wall and hotel (photo: sand pavers with red bands) ----
  const plaza0 = front + 2, plaza1 = front + 20;
  const BAND = 4;
  for (let ls = -30, i = 0; ls < 30; ls += BAND, i++) {
    g.quad(P(ls, plaza0, 0.03), P(Math.min(ls + BAND, 30), plaza0, 0.03), P(Math.min(ls + BAND, 30), plaza1, 0.03), P(ls, plaza1, 0.03),
      i % 2 ? sand : sandDark, { hint: [0, 1, 0] });
  }

  // ---- the hotel: long terracotta slab, maroon brise-soleil fins + heavy roof band ----
  const HW = 56, HD = 16, HH = 13.6, back = front + 24;
  g.quad(P(-HW / 2, back, 0), P(HW / 2, back, 0), P(HW / 2, back, 2.2), P(-HW / 2, back, 2.2), sand, { hint: [-side * f.rx, 0, -side * f.rz] });   // arched lobby colonnade base
  g.quad(P(-HW / 2, back, 2.2), P(HW / 2, back, 2.2), P(HW / 2, back, HH), P(-HW / 2, back, HH), terra, { hint: [-side * f.rx, 0, -side * f.rz] });
  // window band + the DEEP MAROON vertical fins every 3.5 m (the signature texture)
  for (let k = 0; k < 3; k++) {
    const by = 4.2 + k * 3.2;
    g.quad(P(-HW / 2 + 1, back - 0.18, by), P(HW / 2 - 1, back - 0.18, by), P(HW / 2 - 1, back - 0.18, by + 1.1), P(-HW / 2 + 1, back - 0.18, by + 1.1), rust, { hint: [-side * f.rx, 0, -side * f.rz] });
  }
  for (let fx = -HW / 2 + 1; fx <= HW / 2 - 1; fx += 3.5) {
    g.box([f.x + f.fx * fx + f.rx * (back + 0.3) * side, 2.2, f.z + f.fz * fx + f.rz * (back + 0.3) * side],
      [f.fx, f.fz], [f.rx, f.rz], 0.28, HH - 2.2, 0.5, maroon, { skipBottom: true });
  }
  // heavy maroon roof band projecting past the slab
  g.box(P(0, back - 0.4, HH), [f.fx, f.fz], [f.rx, f.rz], HW + 2, 1.3, 1.2, maroon, { skipBottom: true });
  g.quad(P(-HW / 2, back, HH + 1.3), P(HW / 2, back, HH + 1.3), P(HW / 2, back + HD, HH + 1.3), P(-HW / 2, back + HD, HH + 1.3), shade(terra, 0.82), { hint: [0, 1, 0] });
  g.box(P(0, back + 6, HH + 1.3), [f.fx, f.fz], [f.rx, f.rz], 10, 2.2, 6, shade(terra, 0.9), { skipBottom: true });   // rooftop plant room

  // ---- arched pavilion over the fountain pool (photo: red arches on dark plinth) ----
  const pvLat = plaza0 + 7;
  g.box(P(0, pvLat, 0), [f.fx, f.fz], [f.rx, f.rz], 14, 1.0, 9, shade(maroon, 1.1), { skipBottom: true });   // plinth
  for (const px of [-5.4, -1.8, 1.8, 5.4]) {
    g.box(P(px, pvLat + 2, 1.0), [f.fx, f.fz], [f.rx, f.rz], 0.6, 4.2, 0.6, pavilion, { skipBottom: true });
    // arch heads: small blocks stepping inward under the roof
    g.box(P(px, pvLat + 2, 5.2), [f.fx, f.fz], [f.rx, f.rz], 1.4, 0.5, 0.6, pavilion, { skipBottom: true });
  }
  g.box(P(0, pvLat + 2, 5.7), [f.fx, f.fz], [f.rx, f.rz], 15, 0.7, 9.5, maroon, { skipBottom: true });       // pavilion roof
  // fountain pool: pale water sheet + jet cones (kept light: it runs in this scene)
  g.quad(P(-6, pvLat + 4.6, 1.02), P(6, pvLat + 4.6, 1.02), P(6, pvLat + 7.4, 1.02), P(-6, pvLat + 7.4, 1.02), water, { hint: [0, 1, 0] });
  for (const jx of [-3.4, 0, 3.4]) {
    const base = P(jx, pvLat + 6, 1.02);
    for (let t = 0; t < 4; t++) {
      const h0 = 1.0 + t * 0.45;
      g.quad([base[0] - 0.16, base[1] + h0, base[2]], [base[0] + 0.16, base[1] + h0, base[2]],
        [base[0] + 0.07, base[1] + h0 + 0.5, base[2]], [base[0] - 0.07, base[1] + h0 + 0.5, base[2]],
        shade(water, 1.25), { double: true });
    }
  }

  // rooftop nameboard facing the mor
  const di = designByText('SONARGAON');
  if (di >= 0) {
    const du = designUV(di), w2 = designSpanWidth(di);
    sg.quad(P(-w2 / 2, back - 0.5, HH + 2.1), P(w2 / 2, back - 0.5, HH + 2.1), P(w2 / 2, back - 0.5, HH + 3.3), P(-w2 / 2, back - 0.5, HH + 3.3), '#ffffff',
      { hint: [-side * f.rx, 0, -side * f.rz], uv: [[du[0], du[1]], [du[2], du[1]], [du[2], du[3]], [du[0], du[3]]] });
    for (const px of [-w2 / 2 + 0.4, w2 / 2 - 0.4]) {
      g.box(P(px, back - 0.5, HH + 1.3), [f.fx, f.fz], [f.rx, f.rz], 0.14, 1.4, 0.14, '#5c5c5c', { skipBottom: true });
    }
  }
}
