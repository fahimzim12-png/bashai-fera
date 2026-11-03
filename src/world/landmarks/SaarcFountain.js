// SAARC Fountain - static scenery homage to Nitun Kundu's 1985 steel sculpture at the
// Panthapath / Kazi Nazrul Islam Avenue / Sonargaon Road junction.
// Sourced facts (see route JSON provenance): ~9.75 m tall, ~32 m diameter pool.
// Design: 9 curved steel blades fanning out of a central hub over the pool (the silhouette
// the real sculpture is known by), frozen water sheets, paved plaza, hedge and lamp ring.
// STATIC by user decision: no animated water, no interaction, no collision.
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';
import { beam } from './util.js';

const TAU = Math.PI * 2;

export function buildFountain(g, route, lm) {
  const sc = route.length + lm.aheadOfEnd;
  const f = route.space.sample(sc, {});
  const R = lm.radius, H = lm.height;
  const N = 24;
  const pt = (a, rad, y) => [f.x + f.fx * Math.cos(a) * rad + f.rx * Math.sin(a) * rad, y, f.z + f.fz * Math.cos(a) * rad + f.rz * Math.sin(a) * rad];
  const tanAt = (a) => [f.fx * -Math.sin(a) + f.rx * Math.cos(a), 0, f.fz * -Math.sin(a) + f.rz * Math.cos(a)];
  const radAt = (a) => [f.fx * Math.cos(a) + f.rx * Math.sin(a), 0, f.fz * Math.cos(a) + f.rz * Math.sin(a)];

  const stone = hexToLinear('#b0a795'), stoneDark = hexToLinear('#938a7c');
  const water = hexToLinear('#63aebf'), foam = hexToLinear('#cfe6ea');
  const steel = hexToLinear('#c3ccd3'), steelDark = hexToLinear('#87929a');
  const paveA = hexToLinear('#c6bfae'), paveB = hexToLinear('#b2a997');
  const hedge = hexToLinear('#4f7040'), lampPost = hexToLinear('#3c4045');
  const lampHead = shade(hexToLinear('#ffdf9e'), 1.5);
  const glow = shade(hexToLinear('#ffe2ae'), 1.45);

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

  // 2) low hedge ring on the plaza rim
  const HR = R + 7.2;
  for (let j = 0; j < N; j++) {
    const a = (j / N) * TAU, a2 = ((j + 1) / N) * TAU;
    const t = tanAt(a), ti = [-t[0], 0, -t[2]];
    g.quad(pt(a, HR - 0.45, 0.85), pt(a2, HR - 0.45, 0.85), pt(a2, HR - 0.45, 0), pt(a, HR - 0.45, 0), hedge, { hint: t });
    g.quad(pt(a, HR - 0.45, 0.85), pt(a2, HR - 0.45, 0.85), pt(a2, HR + 0.45, 0.85), pt(a, HR + 0.45, 0.85), shade(hedge, 1.15), { hint: [0, 1, 0] });
    g.quad(pt(a, HR + 0.45, 0.85), pt(a2, HR + 0.45, 0.85), pt(a2, HR + 0.45, 0), pt(a, HR + 0.45, 0), shade(hedge, 0.85), { hint: ti });
  }

  // 3) pool: outer wall, coping, frozen water with a foam ring
  for (let j = 0; j < N; j++) {
    const a = (j / N) * TAU, a2 = ((j + 1) / N) * TAU;
    g.quad(pt(a, R, 1.0), pt(a2, R, 1.0), pt(a2, R, 0), pt(a, R, 0), stoneDark, { hint: radAt(a) });
    g.quad(pt(a, R, 1.0), pt(a2, R, 1.0), pt(a2, R - 0.7, 1.0), pt(a, R - 0.7, 1.0), stone, { hint: [0, 1, 0] });
    g.quad(pt(a, R - 0.7, 0.98), pt(a2, R - 0.7, 0.98), pt(a2, R - 0.7, 0.9), pt(a, R - 0.7, 0.9), stoneDark, { hint: [-radAt(a)[0], 0, -radAt(a)[2]] });
    g.quad(pt(a, R - 0.7, 0.62), pt(a2, R - 0.7, 0.62), pt(a2, R - 2.1, 0.62), pt(a, R - 2.1, 0.62), foam, { hint: [0, 1, 0] });
    g.quad(pt(a, R - 2.1, 0.62), pt(a2, R - 2.1, 0.62), pt(a2, 2.7, 0.62), pt(a, 2.7, 0.62), water, { hint: [0, 1, 0] });
  }

  // 4) island: low base cylinder + hub from which the blades rise
  const NI = 12;
  for (let j = 0; j < NI; j++) {
    const a = (j / NI) * TAU, a2 = ((j + 1) / NI) * TAU;
    g.quad(pt(a, 2.7, 1.55), pt(a2, 2.7, 1.55), pt(a2, 2.7, 0.62), pt(a, 2.7, 0.62), stoneDark, { hint: radAt(a) });
    g.quad(pt(a, 2.7, 1.55), pt(a2, 2.7, 1.55), pt(a2, 1.25, 1.62), pt(a, 1.25, 1.62), stone, { hint: [0, 1, 0] });
    g.quad(pt(a, 1.25, 2.2), pt(a2, 1.25, 2.2), pt(a2, 1.25, 1.55), pt(a, 1.25, 1.55), shade(stone, 0.92), { hint: radAt(a) });
    g.quad(pt(a, 1.25, 2.2), pt(a2, 1.25, 2.2), pt(a2, 0, 2.26), pt(a, 0, 2.26), stone, { hint: [0, 1, 0] });
  }

  // 5) the sculpture: 9 curved steel blades fanning out of the hub (the Kundu silhouette)
  const blades = 9;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * TAU + 0.18;
    const lean = 0.38 + (i % 3) * 0.34;                    // 22..49 degrees off vertical
    const leanEnd = lean * 1.45;                           // blades curve outward as they rise
    // blade length: limited by the sourced height AND by how far out a leaning blade may sweep
    const len = Math.min((H - 2.2) / Math.cos(leanEnd), 6.2 / Math.sin(leanEnd)) * (i % 2 ? 0.74 : 1.0);
    const rvec = radAt(a), tvec = tanAt(a);
    let p = [f.x + rvec[0] * 0.9, 2.2, f.z + rvec[2] * 0.9];
    for (let q = 1; q <= 4; q++) {
      const t = q / 4;
      const leanCur = lean * (0.55 + 0.9 * t);
      const rad = 0.9 + Math.sin(leanCur) * len * t;
      const y = 2.2 + Math.cos(leanCur) * len * t;
      const np = [f.x + rvec[0] * rad, y, f.z + rvec[2] * rad];
      beam(g, p, np, 0.575, 0.06, q === 4 ? steelDark : steel, { axes: { u: tvec, v: rvec }, skipA: q > 1 });
      p = np;
    }
  }

  // 6) frozen water sheets jetting up around the hub (static by decision)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.39;
    const rvec = radAt(a), tvec = tanAt(a);
    const b0 = [f.x + rvec[0] * 2.2 - tvec[0] * 0.07, 0.62, f.z + rvec[2] * 2.2 - tvec[2] * 0.07];
    const b1 = [f.x + rvec[0] * 2.2 + tvec[0] * 0.07, 0.62, f.z + rvec[2] * 2.2 + tvec[2] * 0.07];
    const t0 = [f.x + rvec[0] * 3.1 - tvec[0] * 0.05, 3.4, f.z + rvec[2] * 3.1 - tvec[2] * 0.05];
    const t1 = [f.x + rvec[0] * 3.1 + tvec[0] * 0.05, 3.4, f.z + rvec[2] * 3.1 + tvec[2] * 0.05];
    g.quad(b0, b1, t1, t0, foam, { hint: rvec, double: true });
  }

  // 7) lamp ring + glow strip on the pool wall (static emissive suggestion for dusk)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + TAU / 16;
    const rvec = radAt(a);
    const px = f.x + rvec[0] * (R + 3.4), pz = f.z + rvec[2] * (R + 3.4);
    g.box([px, 0.1, pz], [f.fx, f.fz], [rvec[0], rvec[2]], 0.14, 2.9, 0.14, lampPost, { skipBottom: true });
    g.box([px, 2.9, pz], [f.fx, f.fz], [rvec[0], rvec[2]], 0.34, 0.2, 0.34, lampHead, { skipBottom: true });
  }
  for (let j = 0; j < N; j++) {
    const a = (j / N) * TAU, a2 = ((j + 1) / N) * TAU;
    g.quad(pt(a, R - 0.02, 0.78), pt(a2, R - 0.02, 0.78), pt(a2, R - 0.02, 0.98), pt(a, R - 0.02, 0.98), glow, { hint: radAt(a) });
  }
}
