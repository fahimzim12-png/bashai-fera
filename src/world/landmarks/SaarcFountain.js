// SAARC Fountain v3 (Milestone 5 concept regrade) - Nitun Kundu's welded-steel petal
// sculpture at the Kawran Bazar / Sonargaon mor, presented RENOVATED AND RUNNING per the
// user's concept frame: bright basin water with white jets, a yellow-black striped kerb
// ring with a brass rail fence, palms on the plaza, lamp ring kept. (The real fountain
// ran dry for years; the game grants the arrival its reward.) ~9.75 m tall, ~32 m pool.
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
  const water = hexToLinear('#8fc3d9'), spray = hexToLinear('#eef6fa');
  const steel = hexToLinear('#c3ccd3'), steelDark = hexToLinear('#87929a');
  const paveA = hexToLinear('#c6bfae'), paveB = hexToLinear('#b2a997');
  const kerbY = hexToLinear('#d9a832'), kerbK = hexToLinear('#26221e');
  const brass = hexToLinear('#b8913c'), brassD = hexToLinear('#8c6c2c');
  const lampPost = hexToLinear('#3c4045'), lampHead = shade(hexToLinear('#ffdf9e'), 1.5);
  const palmTrunk = hexToLinear('#8a7350'), palmA = hexToLinear('#4e7c3c'), palmB = hexToLinear('#5d8a44');
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

  // 2) yellow-black striped kerb ring + brass rail fence (the concept-frame look)
  const FR = R + 7.2;
  for (let j = 0; j < N; j++) {
    const a = (j / N) * TAU, a2 = ((j + 1) / N) * TAU;
    const t = tanAt(a), ti = [-t[0], 0, -t[2]];
    // striped kerb blocks (alternating yellow / near-black, like the real mor islands)
    const col = j % 2 ? kerbY : kerbK;
    g.quad(pt(a, FR + 0.5, 0.5), pt(a2, FR + 0.5, 0.5), pt(a2, FR + 0.5, 0), pt(a, FR + 0.5, 0), col, { hint: ti });
    g.quad(pt(a, FR + 0.5, 0.5), pt(a2, FR + 0.5, 0.5), pt(a2, FR + 0.5, 0.56), pt(a, FR + 0.5, 0.56), shade(col, 1.1), { hint: [0, 1, 0] });
    // brass posts + double rail (rail long along the tangent, thin radially)
    const rad = radAt(a);
    g.box([...pt(a, FR, 0)], [t[0], t[2]], [rad[0], rad[2]], 0.07, 1.05, 0.07, brass, { skipBottom: true });
    g.box([...pt(a, FR, 0.92)], [t[0], t[2]], [rad[0], rad[2]], (TAU * FR) / N, 0.05, 0.05, brassD, { skipBottom: true });
    g.box([...pt(a, FR, 0.55)], [t[0], t[2]], [rad[0], rad[2]], (TAU * FR) / N, 0.05, 0.05, brassD, { skipBottom: true });
  }
  // a few ad posters on the outer pool wall (Dhaka never stays unbilled)
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + 0.4;
    const di = pickDesign(`poster:${route.id}:${k}`, 'ad', 1);
    const du = designUV(di), w = Math.min(2.2, designSpanWidth(di));
    const a0 = a - (w / 2) / R, a1 = a + (w / 2) / R;
    sg.quad(pt(a0, R + 0.06, 0.45), pt(a1, R + 0.06, 0.45), pt(a1, R + 0.06, 1.75), pt(a0, R + 0.06, 1.75), '#ffffff',
      { hint: [-radAt(a)[0], 0, -radAt(a)[2]], uv: [[du[0], du[1]], [du[2], du[1]], [du[2], du[3]], [du[0], du[3]]] });
  }
  // palms on the plaza ring (six, alternating)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.26;
    const rvec = radAt(a), PR = R + 6.2, hgt = 4.6 + (i % 3) * 0.7;
    const bx = f.x + rvec[0] * PR, bz = f.z + rvec[2] * PR;
    g.box([bx, 0.1, bz], [f.fx, f.fz], [rvec[0], rvec[2]], 0.18, hgt, 0.18, palmTrunk, { skipBottom: true });
    for (let j = 0; j < 7; j++) {
      const fa = (j / 7) * TAU + (i * 0.35);
      const dx = Math.sin(fa), dz = Math.cos(fa), L = 1.5 + (j % 2) * 0.5;
      const cy = 0.1 + hgt, tipY = cy - 0.62;
      g.quad([bx - dz * 0.15, cy + 0.1, bz + dx * 0.15], [bx + dz * 0.15, cy + 0.1, bz - dx * 0.15],
        [bx + dx * L - dz * 0.04, tipY, bz + dz * L + dx * 0.04], [bx + dx * L + dz * 0.04, tipY - 0.08, bz + dz * L - dx * 0.04],
        j % 2 ? palmA : palmB, { double: true });
    }
  }

  // 3) pool: outer wall, coping, and the RUNNING basin (bright water + white jets)
  for (let j = 0; j < N; j++) {
    const a = (j / N) * TAU, a2 = ((j + 1) / N) * TAU;
    g.quad(pt(a, R, 1.0), pt(a2, R, 1.0), pt(a2, R, 0), pt(a, R, 0), stoneDark, { hint: radAt(a) });
    g.quad(pt(a, R, 1.0), pt(a2, R, 1.0), pt(a2, R - 0.7, 1.0), pt(a, R - 0.7, 1.0), stone, { hint: [0, 1, 0] });
    g.quad(pt(a, R - 0.7, 0.98), pt(a2, R - 0.7, 0.98), pt(a2, R - 0.7, 0.9), pt(a, R - 0.7, 0.9), stoneDark, { hint: [-radAt(a)[0], 0, -radAt(a)[2]] });
    g.quad(pt(a, R - 0.7, 0.62), pt(a2, R - 0.7, 0.62), pt(a2, 2.7, 0.62), pt(a, 2.7, 0.62), water, { hint: [0, 1, 0] });   // basin water
    if (j % 4 === 1) {                                     // jet nozzles
      const rvec = radAt((j + 0.5) / N * TAU);
      g.box([f.x + rvec[0] * 2.6, 0.55, f.z + rvec[2] * 2.6], [rvec[0], 0, rvec[2]], [-rvec[2], 0, rvec[0]], 0.16, 0.5, 0.16, steelDark, { skipBottom: true });
    }
  }
  // ring of water jets around the island: white columns + spray cones (static)
  const NJ = 10;
  for (let i = 0; i < NJ; i++) {
    const a = (i / NJ) * TAU + TAU / (NJ * 2);
    const rvec = radAt(a);
    const bx = f.x + rvec[0] * 4.1, bz = f.z + rvec[2] * 4.1;
    for (let t = 0; t < 4; t++) {
      const h0 = 0.66 + t * 0.5, hw = 0.22 - t * 0.035;
      g.quad([bx - hw, h0, bz], [bx + hw, h0, bz], [bx + hw * 0.5, h0 + 0.5, bz], [bx - hw * 0.5, h0 + 0.5, bz], spray, { double: true });
    }
    g.quad([bx - 0.14, 2.6, bz - 0.14], [bx + 0.14, 2.6, bz - 0.14], [bx + 0.3, 2.66, bz + 0.3], [bx - 0.3, 2.66, bz + 0.3], spray, { hint: [0, 1, 0] });
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
