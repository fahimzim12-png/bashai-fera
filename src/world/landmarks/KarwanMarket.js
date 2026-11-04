// Karwan Bazar wholesale kitchen market - static scenery. Long gabled steel-truss sheds with
// corrugated roofs (faked with alternating panel shading - zero textures needed), open
// road-facing sides with hanging produce strips, grimy background wholesale blocks, and
// tarpaulin-covered gaps between sheds. Sits on the side away from the walkable footpath
// (route JSON clears the generated buildings there). No collision, no interaction.
import { Rng } from '../../core/Rng.js';
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';
import { beam } from './util.js';

export function buildMarket(g, sg, route, lm) {
  const rng = new Rng(`${route.id}:${lm.id}`);
  const side = lm.side ?? -1;                             // -1 = LEFT of travel (the real market side)
  const depth = 13, eave = 4.2, ridge = 6.6;
  const MODULE = 24, SHED = 20, BAY = 2.5;

  const steelCol = hexToLinear('#6e747c'), truss = hexToLinear('#5d636b');
  const darkIn = hexToLinear('#2a2622'), wallBack = hexToLinear('#8a7f70');
  const blockA = hexToLinear('#7d7466'), blockWin = hexToLinear('#3a4148');
  // photo q3_karwan_*: blue + grey canvas tarps over the gaps (add green — banana-leaf blue-greens)
  const tarpBlue = hexToLinear('#2f6ea8'), tarpOrange = hexToLinear('#d97e2f'), tarpGreen = hexToLinear('#3f8a5c');
  const bamboo = hexToLinear('#b8a25c');
  const crate = hexToLinear('#8a6b42'), crateTop = hexToLinear('#c94f3f'), crateBlue = hexToLinear('#2a5fa8');
  const PRODUCE = ['#c4453a', '#3f9a4e', '#d98e2b', '#b5432f', '#4f8a3d', '#c9b23c'].map(hexToLinear);
  // M5 photo regrade: the big saturated GROUND piles (q3_karwan_2: bananas/cauliflower greens)
  const MOUND = ['#77a07f', '#8fae5c', '#a4b16d', '#c4453a', '#d98e2b', '#5c8a3d'].map(hexToLinear);

  const frameCache = new Map();
  const frameAt = (s) => {
    const key = Math.round(s * 2) / 2;
    if (!frameCache.has(key)) {
      const f = route.space.sample(key, {});
      const prof = route.profileAt(Math.min(Math.max(key, 0), route.length));
      // builder latitude = distance INTO the market side (positive); P() applies the side sign
      const frontage = side < 0 ? prof.frontageL : prof.frontageR;
      f.front = Math.abs(frontage);
      frameCache.set(key, f);
    }
    return frameCache.get(key);
  };
  // world point: ls along route, lat lateral INTO the market side (positive), height y
  const P = (f, ls, lat, y) => [f.x + f.fx * ls + f.rx * lat * side, y, f.z + f.fz * ls + f.rz * lat * side];

  for (let ms = lm.s0; ms + SHED <= lm.s1 + 0.01; ms += MODULE) {
    const fA = frameAt(ms), fB = frameAt(ms + SHED);
    const frontA = fA.front, frontB = fB.front;
    const midA = frontA + depth / 2, midB = frontB + depth / 2;

    // gabled roof: two slopes per bay, alternating panel shade = corrugated tin read
    const nb = Math.round(SHED / BAY);
    for (let b = 0; b < nb; b++) {
      const t0 = b / nb, t1 = (b + 1) / nb;
      const fa = frameAt(ms + SHED * t0), fb = frameAt(ms + SHED * t1);
      const frA = fa.front, frB = fb.front;
      const sh = b % 2 ? 0.85 : 1.0;
      g.quad(P(fa, 0, frA + 0.3, eave), P(fb, 0, frB + 0.3, eave), P(fb, 0, frB + depth / 2, ridge), P(fa, 0, frA + depth / 2, ridge), shade(steelCol, sh), { hint: [0, 1, 0] });
      g.quad(P(fa, 0, frA + depth / 2, ridge), P(fb, 0, frB + depth / 2, ridge), P(fb, 0, frB + depth - 0.3, eave), P(fa, 0, frA + depth - 0.3, eave), shade(steelCol, sh * 0.94), { hint: [0, 1, 0] });
      // ridge cap strip
      g.quad(P(fa, 0, frA + depth / 2 - 0.22, ridge + 0.08), P(fb, 0, frB + depth / 2 - 0.22, ridge + 0.08), P(fb, 0, frB + depth / 2 + 0.22, ridge + 0.08), P(fa, 0, frA + depth / 2 + 0.22, ridge + 0.08), shade(steelCol, 0.7), { hint: [0, 1, 0] });
    }

    // open road-facing front: columns, produce strips, counters
    const cols = Math.round(SHED / 4);
    for (let c = 0; c <= cols; c++) {
      const t = c / cols, f = frameAt(ms + SHED * t);
      g.box(P(f, 0, f.front + 0.45, 0), [f.fx, f.fz], [f.rx, f.rz], 0.2, eave, 0.2, truss, { skipBottom: true });
    }
    for (let b = 0; b < nb; b++) {
      const fa = frameAt(ms + SHED * (b / nb)), fb = frameAt(ms + SHED * ((b + 0.5) / nb));
      const fr = fa.front;
      // hanging rail + 2 produce strips (colour zones: meat reds / greens / spices)
      g.quad(P(fa, 0, fr + 0.55, 2.5), P(fb, 0, fr + 0.55, 2.5), P(fb, 0, fr + 0.55, 2.62), P(fa, 0, fr + 0.55, 2.62), truss, { hint: [0, 1, 0] });
      const k = 2;
      for (let h = 0; h < k; h++) {
        const col = PRODUCE[(b * 2 + h + rng.int(0, 2)) % PRODUCE.length];
        const fa2 = frameAt(ms + SHED * (b / nb) + (h + 0.5) * (BAY / k));
        const fb2 = frameAt(ms + SHED * (b / nb) + (h + 1) * (BAY / k));
        g.quad(P(fa2, 0, fr + 0.55, 2.45), P(fb2, 0, fr + 0.55, 2.45), P(fb2, 0, fr + 0.55, 1.25), P(fa2, 0, fr + 0.55, 1.25), col, { hint: [side * fa2.rx, 0, side * fa2.rz] });
      }
      if (rng.chance(0.5)) {                               // market counter / pushcart under the strip
        const fc = frameAt(ms + SHED * ((b + 0.5) / nb));
        g.box(P(fc, 0, fr + 1.6, 0), [fc.fx, fc.fz], [fc.rx, fc.rz], 1.9, 0.95, 0.8, shade(wallBack, 0.8), { skipBottom: true });
      }
    }

    // closed back wall
    for (let b = 0; b < nb; b++) {
      const fa = frameAt(ms + SHED * (b / nb)), fb = frameAt(ms + SHED * ((b + 1) / nb));
      g.quad(P(fa, 0, fa.front + depth - 0.05, 0), P(fb, 0, fb.front + depth - 0.05, 0), P(fb, 0, fb.front + depth - 0.05, eave), P(fa, 0, fa.front + depth - 0.05, eave), shade(wallBack, 0.92 + 0.1 * (b % 2)), { hint: [-side * fa.rx, 0, -side * fa.rz] });
    }

    // gable ends: dark interior + king-post truss silhouette
    for (const [tEnd, fEnd] of [[0, fA], [1, fB]]) {
      const fr = fEnd.front, ls = SHED * tEnd;
      g.tri(P(fEnd, ls, fr + 0.32, eave), P(fEnd, ls, fr + depth / 2, ridge), P(fEnd, ls, fr + depth - 0.32, eave), darkIn, [side * fEnd.rx, 0, side * fEnd.rz]);
      const hint = [side * fEnd.rx, 0, side * fEnd.rz];
      g.quad(P(fEnd, ls, fr + 0.3, 0), P(fEnd, ls, fr + depth - 0.3, 0), P(fEnd, ls, fr + depth - 0.3, eave), P(fEnd, ls, fr + 0.3, eave), shade(wallBack, 0.8), { hint });
      const A = P(fEnd, ls, fr + 0.45, eave), Bp = P(fEnd, ls, fr + depth / 2, ridge), C = P(fEnd, ls, fr + depth - 0.45, eave), D = P(fEnd, ls, fr + depth / 2, 0.2);
      beam(g, A, Bp, 0.07, 0.07, truss, { skipA: true, skipB: true });
      beam(g, Bp, C, 0.07, 0.07, truss, { skipA: true, skipB: true });
      beam(g, D, Bp, 0.06, 0.06, truss, { skipA: true, skipB: true });
    }

    // gap to the next shed: bamboo poles + tarpaulin roof
    if (ms + MODULE <= lm.s1 + 0.01) {
      const ga = frameAt(ms + SHED), gb = frameAt(ms + SHED + (MODULE - SHED));
      const fr = ga.front;
      for (const lt of [0.35, 0.75]) {
        const f = frameAt(ms + SHED + (MODULE - SHED) * lt);
        g.box(P(f, 0, fr + 1.2, 0), [f.fx, f.fz], [f.rx, f.rz], 0.09, 3.4, 0.09, bamboo, { skipBottom: true });
        g.box(P(f, 0, fr + depth - 1.2, 0), [f.fx, f.fz], [f.rx, f.rz], 0.09, 3.2, 0.09, bamboo, { skipBottom: true });
      }
      const tarp = rng.chance(0.4) ? tarpBlue : rng.chance(0.5) ? tarpOrange : tarpGreen;
      g.quad(P(ga, 0, fr + 0.6, 3.4), P(gb, 0, gb.front + 0.6, 3.2), P(gb, 0, gb.front + depth - 0.6, 3.2), P(ga, 0, fr + depth - 0.6, 3.4), tarp, { hint: [0, 1, 0] });
    }

    // crate stacks + bamboo basket rings in front of the sheds (porter gear, tukri baskets)
    for (let b = 0; b < nb; b += 2) {
      const fc = frameAt(ms + SHED * ((b + 0.5) / nb));
      const fr2 = fc.front;
      for (let j = 0; j < 3; j++) {
        const off = (j - 1) * 1.1;
        g.box(P(fc, off, fr2 + 1.4, j * 0.42), [fc.fx, fc.fz], [fc.rx, fc.rz], 0.62, 0.4, 0.62, j % 2 ? crate : crateBlue, { skipBottom: true, top: j % 2 ? crateTop : shade(crateBlue, 1.2) });
      }
      // bamboo tukri basket on the ground
      const bp = P(fc, 1.9, fr2 + 1.2, 0);
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2, a2 = ((j + 1) / 6) * Math.PI * 2;
        g.tri([bp[0], bp[1] + 0.3, bp[2]],
          [bp[0] + Math.sin(a) * fc.rx * 0.42 + Math.cos(a) * fc.fx * 0.42, bp[1], bp[2] + Math.sin(a) * fc.rz * 0.42 + Math.cos(a) * fc.fz * 0.42],
          [bp[0] + Math.sin(a2) * fc.rx * 0.42 + Math.cos(a2) * fc.fx * 0.42, bp[1], bp[2] + Math.sin(a2) * fc.rz * 0.42 + Math.cos(a2) * fc.fz * 0.42],
          shade(bamboo, 0.85 + (j % 2) * 0.2), [0, 1, 0]);
      }
      // M5 PHOTO REGRADE: the wholesale ground piles — saturated mounds of greens/red/orange
      // spilling toward the road (q3_karwan_2), the single strongest colour note of the district
      const nm = 2 + (b % 2);
      for (let m = 0; m < nm; m++) {
        const mp = P(fc, -2.4 + m * 2.1, fr2 + 2.6 + rng.next() * 1.2, 0);
        const col = MOUND[(b * 3 + m + rng.int(0, 2)) % MOUND.length];
        const R = 0.75 + rng.next() * 0.45;
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * Math.PI * 2, a2 = ((j + 1) / 6) * Math.PI * 2;
          g.tri([mp[0], mp[1] + R * 0.55, mp[2]],
            [mp[0] + Math.sin(a) * fc.rx * R + Math.cos(a) * fc.fx * R, mp[1], mp[2] + Math.sin(a) * fc.rz * R + Math.cos(a) * fc.fz * R],
            [mp[0] + Math.sin(a2) * fc.rx * R + Math.cos(a2) * fc.fx * R, mp[1], mp[2] + Math.sin(a2) * fc.rz * R + Math.cos(a2) * fc.fz * R],
            j % 2 ? col : shade(col, 1.18), [0, 1, 0]);
        }
      }
    }

    // background wholesale block (grimy, small windows) on most modules
    if (rng.chance(0.72)) {
      const bh = 11 + rng.next() * 6;
      const fA2 = frameAt(ms + 1), fB2 = frameAt(ms + SHED - 1);
      const b0 = frontA + depth + 2, b1 = frontA + depth + 14;
      g.quad(P(fA2, 0, b0, 0), P(fB2, 0, fB2.front + depth + 2, 0), P(fB2, 0, fB2.front + depth + 2, bh), P(fA2, 0, b0, bh), blockA, { hint: [-side * fA2.rx, 0, -side * fA2.rz] });
      g.quad(P(fA2, 0, b1, 0), P(fB2, 0, fB2.front + depth + 14, 0), P(fB2, 0, fB2.front + depth + 14, bh), P(fA2, 0, b1, bh), shade(blockA, 0.9), { hint: [side * fA2.rx, 0, side * fA2.rz] });
      for (const wy of [bh * 0.45, bh * 0.72]) {
        g.quad(P(fA2, 0, b0 - 0.03, wy), P(fB2, 0, fB2.front + depth + 2 - 0.03, wy), P(fB2, 0, fB2.front + depth + 2 - 0.03, wy + 1.5), P(fA2, 0, b0 - 0.03, wy + 1.5), blockWin, { hint: [-side * fA2.rx, 0, -side * fA2.rz] });
      }
      g.quad(P(fA2, 0, b0, bh), P(fB2, 0, fB2.front + depth + 2, bh), P(fB2, 0, fB2.front + depth + 14, bh), P(fA2, 0, b1, bh), shade(blockA, 0.75), { hint: [0, 1, 0] });
    }
  }
}
