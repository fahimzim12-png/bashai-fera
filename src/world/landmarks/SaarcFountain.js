// SAARC Fountain v2 (Milestone 4) - Nitun Kundu's welded-steel petal sculpture at the
// Kawran Bazar / Sonargaon mor, in its REAL recent state: the pool is typically DRY
// (renovation announced 2017, cracks reported 2022), the island sits behind a ring of tin
// fencing plastered with posters and banners, lamps remain. Sourced facts (route JSON
// provenance): ~9.75 m tall sculpture, ~32 m diameter RCC pool.
// STATIC by user decision: no animated water, no interaction, no collision.
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';
import { beam } from './util.js';
import { pickDesign, designUV, designSpanWidth } from '../signCatalog.js';

const TAU = Math.PI * 2;

export function buildFountain(g, sg, route, lm) {
  const sc = route.length + lm.aheadOfEnd;
  const f = route.space.sample(sc, {});
  const R = lm.radius, H = lm.height;
  const N = 24;
  const pt = (a, rad, y) => [f.x + f.fx * Math.cos(a) * rad + f.rx * Math.sin(a) * rad, y, f.z + f.fz * Math.cos(a) * rad + f.rz * Math.sin(a) * rad];
  const tanAt = (a) => [f.fx * -Math.sin(a) + f.rx * Math.cos(a), 0, f.fz * -Math.sin(a) + f.rz * Math.cos(a)];
  const radAt = (a) => [f.fx * Math.cos(a) + f.rx * Math.sin(a), 0, f.fz * Math.cos(a) + f.rz * Math.sin(a)];

  const stone = hexToLinear('#b0a795'), stoneDark = hexToLinear('#938a7c');
  const stale = hexToLinear('#5c7a72'), silt = hexToLinear('#7d7a68'), debris = hexToLinear('#55703c');
  const steel = hexToLinear('#c3ccd3'), steelDark = hexToLinear('#87929a');
  const paveA = hexToLinear('#c6bfae'), paveB = hexToLinear('#b2a997');
  const lampPost = hexToLinear('#3c4045'), lampHead = shade(hexToLinear('#ffdf9e'), 1.5);
  const tin = hexToLinear('#9aa0a6'), tinD = hexToLinear('#7e6a5a');
  const posterCols = ['#c9403a', '#2e7dab', '#c9a23a', '#4fae6b', '#c56da0'];

  // 1) plaza: three concentric paving bands around the pool
  const band = (r0, r1, y, col) => {
    for (let j = 0; j < N; j++) {
      const a = (j / N) * TAU, a2 = ((j + 1) / N) * TAU;
      g.quad(pt(a, r0, y), pt(a2, r0, y), pt(a2, r1, y), pt(a, r1, y), col, { hint: [0, 1, 0] });
    }
  };
  band(R + 0.05, R + 2.6, 0.04, paveA);
  band(R + 2.6, R + 5.2, 0.05, paveB);
  band(R + 5.2, R + 7.4, 0.06, paveA);

  // 2) the tin fence ring plastered with posters (how the mor actually reads these days)
  const FR = R + 7.2;
  for (let j = 0; j < N; j++) {
    const a = (j / N) * TAU, a2 = ((j + 1) / N) * TAU;
    const t = tanAt(a), ti = [-t[0], 0, -t[2]];
    g.quad(pt(a, FR, 2.2), pt(a2, FR, 2.2), pt(a2, FR, 0), pt(a, FR, 0), j % 4 === 3 ? tinD : tin, { hint: ti });
    g.quad(pt(a, FR, 2.2), pt(a2, FR, 2.2), pt(a2, FR + 0.06, 2.26), pt(a, FR + 0.06, 2.26), shade(tin, 0.75), { hint: [0, 1, 0] });
  }
  // posters on the fence (readable ad designs from the sign atlas)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.2;
    const w = Math.min(2.4, designSpanWidth(pickDesign(`poster:${k}`, 'ad', 1)));
    const di = pickDesign(`poster:${route.id}:${k}`, 'ad', 1);
    const du = designUV(di);
    const a0 = a - (w / 2) / (FR), a1 = a + (w / 2) / (FR);
    sg.quad(pt(a0, FR - 0.05, 0.55), pt(a1, FR - 0.05, 0.55), pt(a1, FR - 0.05, 1.95), pt(a0, FR - 0.05, 1.95), '#ffffff',
      { hint: [radAt(a)[0], 0, radAt(a)[2]], uv: [[du[0], du[1]], [du[2], du[1]], [du[2], du[3]], [du[0], du[3]]] });
  }

  // 3) pool: outer wall, coping, and the DRY basin (stale silt, leaf debris, jet stubs)
  for (let j = 0; j < N; j++) {
    const a = (j / N) * TAU, a2 = ((j + 1) / N) * TAU;
    g.quad(pt(a, R, 1.0), pt(a2, R, 1.0), pt(a2, R, 0), pt(a, R, 0), stoneDark, { hint: radAt(a) });
    g.quad(pt(a, R, 1.0), pt(a2, R, 1.0), pt(a2, R - 0.7, 1.0), pt(a, R - 0.7, 1.0), stone, { hint: [0, 1, 0] });
    g.quad(pt(a, R - 0.7, 0.98), pt(a2, R - 0.7, 0.98), pt(a2, R - 0.7, 0.9), pt(a, R - 0.7, 0.9), stoneDark, { hint: [-radAt(a)[0], 0, -radAt(a)[2]] });
    g.quad(pt(a, R - 0.7, 0.5), pt(a2, R - 0.7, 0.5), pt(a2, 2.7, 0.5), pt(a, 2.7, 0.5), stale, { hint: [0, 1, 0] });   // silt film
    if (j % 3 === 0) {                                     // leaf/debris patches
      g.quad(pt(a + 0.05, R - 2.2, 0.52), pt(a + 0.16, R - 1.6, 0.52), pt(a + 0.2, R - 2.6, 0.52), pt(a + 0.1, R - 3.1, 0.52), debris, { hint: [0, 1, 0] });
    }
    if (j % 4 === 1) {                                     // dry jet stubs
      const rvec = radAt((j + 0.5) / N * TAU);
      g.box([f.x + rvec[0] * 2.6, 0.55, f.z + rvec[2] * 2.6], [rvec[0], 0, rvec[2]], [-rvec[2], 0, rvec[0]], 0.16, 0.5, 0.16, steelDark, { skipBottom: true });
    }
  }

  // 4) island: low base cylinder + hub from which the petals rise
  const NI = 12;
  for (let j = 0; j < NI; j++) {
    const a = (j / NI) * TAU, a2 = ((j + 1) / NI) * TAU;
    g.quad(pt(a, 2.7, 1.55), pt(a2, 2.7, 1.55), pt(a2, 2.7, 0.62), pt(a, 2.7, 0.62), stoneDark, { hint: radAt(a) });
    g.quad(pt(a, 2.7, 1.55), pt(a2, 2.7, 1.55), pt(a2, 1.25, 1.62), pt(a, 1.25, 1.62), stone, { hint: [0, 1, 0] });
    g.quad(pt(a, 1.25, 2.2), pt(a2, 1.25, 2.2), pt(a2, 1.25, 1.55), pt(a, 1.25, 1.55), shade(stone, 0.92), { hint: radAt(a) });
    g.quad(pt(a, 1.25, 2.2), pt(a2, 1.25, 2.2), pt(a2, 0, 2.26), pt(a, 0, 2.26), stone, { hint: [0, 1, 0] });
  }

  // 5) the sculpture: curved steel PETALS fanning out of the hub (the Kundu silhouette)
  const petals = 7;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * TAU + 0.18;
    const lean = 0.36 + (i % 3) * 0.3;
    const leanEnd = lean * 1.4;
    const len = Math.min((H - 2.2) / Math.cos(leanEnd), 6.2 / Math.sin(leanEnd)) * (i % 2 ? 0.78 : 1.0);
    const rvec = radAt(a), tvec = tanAt(a);
    let p = [f.x + rvec[0] * 0.9, 2.2, f.z + rvec[2] * 0.9];
    for (let q = 1; q <= 5; q++) {
      const t = q / 5;
      const leanCur = lean * (0.55 + 0.9 * t);
      const rad = 0.9 + Math.sin(leanCur) * len * t;
      const y = 2.2 + Math.cos(leanCur) * len * t;
      const np = [f.x + rvec[0] * rad, y, f.z + rvec[2] * rad];
      // petal: wide at the base, tapering to a point (0.575 -> 0.1 half-width)
      beam(g, p, np, 0.575 * (1 - t * 0.82) + 0.1, 0.055, q === 5 ? steelDark : steel, { axes: { u: tvec, v: rvec }, skipA: q > 1 });
      p = np;
    }
  }

  // 6) lamp ring on the plaza (kept from the real site)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + TAU / 16;
    const rvec = radAt(a);
    const px = f.x + rvec[0] * (R + 3.4), pz = f.z + rvec[2] * (R + 3.4);
    g.box([px, 0.1, pz], [f.fx, f.fz], [rvec[0], rvec[2]], 0.14, 2.9, 0.14, lampPost, { skipBottom: true });
    g.box([px, 2.9, pz], [f.fx, f.fz], [rvec[0], rvec[2]], 0.34, 0.2, 0.34, lampHead, { skipBottom: true });
  }
}
