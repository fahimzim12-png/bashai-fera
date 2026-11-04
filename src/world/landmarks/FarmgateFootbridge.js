// Farmgate footbridge v2 (Milestone 4) - the REAL 2023 BBA rebuild, opened 15 Oct 2023:
// ~63 m main span x ~6.4 m deck across Mirpur Road and the junction, plus a ~21 m wing
// toward Holy Cross School running along the avenue. Louis Kahn-inspired steel trusses
// under the deck, masts with a sagging tensile canopy, cantilevered viewing pockets with
// planters. Below: the plaza with a bus-bay shelter and the police box that opened with it.
// Static scenery; the route JSON clears the junction plots around it.
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';
import { beam } from './util.js';

export function buildFootbridge(g, sg, route, lm) {
  const f = route.space.sample(lm.s, {});
  const deckY = lm.deckY ?? 12.4;
  const half = (lm.span ?? 63) / 2;                        // lateral half-span across the road
  const wingLen = lm.wingLen ?? 21;
  const P = (lat, y, ls = 0) => [f.x + f.fx * ls + f.rx * lat, y, f.z + f.fz * ls + f.rz * lat];
  const ff = [f.fx, f.fz], rr = [f.rx, f.rz];

  const steel = hexToLinear('#79848d'), steelDark = hexToLinear('#5a646c');
  const deckC = hexToLinear('#8a939b'), rail = hexToLinear('#a9b3ba');
  const canopyC = hexToLinear('#cfd4d6'), mastC = hexToLinear('#6d7883');
  const stairC = hexToLinear('#a49c90'), pierC = hexToLinear('#b0aa9e');
  const planter = hexToLinear('#7d6b52'), leaf = hexToLinear('#55703c');
  const concrete = hexToLinear('#b3aea4');

  // --- main deck (6.4 m wide) + railings ------------------------------------------------
  g.box([f.x, deckY - 0.5, f.z], ff, rr, 6.4, 0.5, half * 2, deckC, { skipBottom: true });
  for (const s of [-1, 1]) {
    g.box([f.x + f.fx * s * 3.05, deckY + 0.55, f.z + f.fz * s * 3.05], ff, rr, 0.09, 1.1, half * 2, rail, { skipBottom: true });
  }

  // --- Kahn-style truss under both deck edges -------------------------------------------
  const SEG = 12;
  for (const s of [-1, 1]) {
    const ls = s * 3.05;
    const topA = P(-half, deckY - 0.6, ls), topB = P(half, deckY - 0.6, ls);
    const botA = P(-half, deckY - 2.4, ls), botB = P(half, deckY - 2.4, ls);
    beam(g, topA, topB, 0.11, 0.11, steel, { skipA: true, skipB: true });
    beam(g, botA, botB, 0.11, 0.11, steel, { skipA: true, skipB: true });
    for (let q = 0; q < SEG; q++) {
      const t0 = q / SEG, t1 = (q + 1) / SEG;
      const a0 = [topA[0] + (topB[0] - topA[0]) * t0, topA[1], topA[2] + (topB[2] - topA[2]) * t0];
      const a1 = [topA[0] + (topB[0] - topA[0]) * t1, topA[1], topA[2] + (topB[2] - topA[2]) * t1];
      const b0 = [botA[0] + (botB[0] - botA[0]) * t0, botA[1], botA[2] + (botB[2] - botA[2]) * t0];
      const b1 = [botA[0] + (botB[0] - botA[0]) * t1, botA[1], botA[2] + (botB[2] - botA[2]) * t1];
      beam(g, q % 2 ? a0 : b0, q % 2 ? b1 : a1, 0.08, 0.08, steelDark, { skipA: true, skipB: true });
    }
    // vertical posts every 3rd bay
    for (let q = 0; q <= SEG; q += 3) {
      const t = q / SEG;
      const pt = [topA[0] + (topB[0] - topA[0]) * t, topA[1], topA[2] + (topB[2] - topA[2]) * t];
      const pb = [botA[0] + (botB[0] - botA[0]) * t, botA[1], botA[2] + (botB[2] - botA[2]) * t];
      beam(g, pt, pb, 0.07, 0.07, steelDark, { skipA: true, skipB: true });
    }
  }
  // cross braces under the deck
  for (let q = 1; q < 6; q++) {
    const t = q / 6;
    const lat = -half + half * 2 * t;
    beam(g, P(lat, deckY - 0.7, -3.05), P(lat, deckY - 0.7, 3.05), 0.07, 0.07, steelDark, { skipA: true, skipB: true });
  }

  // --- masts + sagging tensile canopy (the Kahn light idea) -------------------------------
  const mastLat = [-half + 3, -half * 0.35, half * 0.35, half - 3];
  for (const s of [-1, 1]) {
    for (const ml of mastLat) {
      beam(g, P(ml, deckY + 0.9, s * 3.05), P(ml, deckY + 7.6, s * 2.1), 0.13, 0.13, mastC, {});
    }
  }
  // canopy: sagging membrane strips between the mast tops, both deck edges + ridge
  for (const s of [-1, 1]) {
    for (let k = 0; k < mastLat.length - 1; k++) {
      const a = mastLat[k], b = mastLat[k + 1];
      const NB = 3;
      let prev = P(a, deckY + 7.5, s * 2.1);
      for (let q = 1; q <= NB; q++) {
        const t = q / NB;
        const lat = a + (b - a) * t;
        const sag = Math.sin(Math.PI * t) * 0.55;
        const np = P(lat, deckY + 7.5 - sag, s * 2.1);
        g.quad([prev[0], prev[1] + 0.02, prev[2]], [np[0], np[1] + 0.02, np[2]], np, prev, canopyC, { hint: [0, 1, 0], double: true });
        prev = np;
      }
    }
  }
  // ridge beam between mast peaks down the deck centre
  for (let k = 0; k < mastLat.length - 1; k++) {
    beam(g, P(mastLat[k], deckY + 7.6, 0), P(mastLat[k + 1], deckY + 7.6, 0), 0.09, 0.09, mastC, { skipA: true, skipB: true });
  }

  // --- cantilevered viewing pockets with planters (2, over the median sides) --------------
  for (const s of [-1, 1]) {
    const lat = s * 8.5;
    g.box(P(lat, deckY - 0.25, s * 4.4), ff, rr, 2.6, 0.3, 2.4, deckC, { skipBottom: true });
    g.box(P(lat, deckY + 0.1, s * 4.4), ff, rr, 1.8, 0.5, 1.5, planter, { skipBottom: true, top: shade(leaf, 1.2) });
    g.box(P(lat, deckY + 0.35, s * 4.4), ff, rr, 1.7, 0.25, 1.4, leaf, { skipBottom: true });
  }

  // --- support piers at the deck ends ------------------------------------------------------
  for (const s of [-1, 1]) {
    g.box([f.x + f.rx * s * (half - 0.6), 0, f.z + f.rz * s * (half - 0.6)], ff, rr, 0.8, deckY - 0.9, 0.8, pierC, { skipBottom: true });
    g.box([f.x + f.rx * s * (half - 0.6), deckY - 1.1, f.z + f.rz * s * (half - 0.6)], ff, rr, 1.2, 0.5, 1.2, pierC, { skipBottom: true });
  }

  // --- main stairs at both deck ends, climbing along the avenue ----------------------------
  const steps = 22, rise = (deckY - 0.35) / steps, tread = 0.42;
  for (const sd of [-1, 1]) {
    const lat = sd * (half - 1.6);
    const dirS = sd < 0 ? 1 : -1;
    for (let k = 0; k < steps; k++) {
      const h = (steps - k) * rise;
      const ls = dirS * (4.0 + (k + 0.5) * tread);
      g.box([f.x + f.fx * ls + f.rx * lat, 0, f.z + f.fz * ls + f.rz * lat], ff, rr, tread, h, 2.6,
        k % 2 ? shade(stairC, 0.94) : stairC, { skipBottom: true });
    }
    beam(g, P(lat, 0.95, dirS * (4.0 + steps * tread)), P(lat, deckY + 0.9, dirS * 4.0), 0.05, 0.05, steelDark, { skipA: true, skipB: true });
  }

  // --- the Holy Cross wing: deck along the avenue from the left end, then stairs down ------
  {
    const lat0 = -half - 0.0;                                // wing springs from the left deck end
    g.box([f.x + f.fx * wingLen / 2 + f.rx * lat0, deckY - 0.4, f.z + f.fz * wingLen / 2 + f.rz * lat0],
      ff, rr, wingLen, 0.4, 3.0, deckC, { skipBottom: true });
    g.box([f.x + f.fx * wingLen / 2 + f.rx * (lat0 - 1.45), deckY + 0.15, f.z + f.fz * wingLen / 2 + f.rz * (lat0 - 1.45)],
      ff, rr, wingLen, 0.09, 1.0, rail, { skipBottom: true });
    for (let k = 0; k < steps; k++) {
      const h = (steps - k) * rise;
      const ls = wingLen - (k + 0.5) * tread;
      const lat = lat0 - 1.6;
      g.box([f.x + f.fx * ls + f.rx * lat, 0, f.z + f.fz * ls + f.rz * lat], ff, rr, tread, h, 2.4,
        k % 2 ? shade(stairC, 0.94) : stairC, { skipBottom: true });
    }
    // wing support column at its far end
    g.box([f.x + f.fx * (wingLen - 0.5) + f.rx * lat0, 0, f.z + f.fz * (wingLen - 0.5) + f.rz * lat0], ff, rr, 0.7, deckY - 0.8, 0.7, pierC, { skipBottom: true });
  }

  // --- street level: plaza bus-bay shelter + police box (opened with the 2023 bridge) -------
  const shelterLat = -14.6, shelterS = -14;
  g.box(P(shelterLat, 0, shelterS), ff, rr, 0.14, 2.6, 0.14, mastC, { skipBottom: true });
  g.box(P(shelterLat, 0, shelterS - 3.6), ff, rr, 0.14, 2.4, 0.14, mastC, { skipBottom: true });
  g.box(P(shelterLat, 2.6, shelterS - 1.8), ff, rr, 2.2, 0.1, 4.2, shade(canopyC, 0.95), { skipBottom: true });
  g.box(P(shelterLat - 0.5, 0.45, shelterS - 1.8), ff, rr, 2.6, 0.06, 0.5, stairC, { skipBottom: true });   // bench
  g.box(P(shelterLat - 0.5, 0.22, shelterS - 1.8), ff, rr, 2.6, 0.4, 0.12, mastC, { skipBottom: true });
  // police box at the footbridge base
  g.box(P(-11.8, 0, 10), ff, rr, 2.4, 2.7, 2.0, hexToLinear('#e8e6df'), { skipBottom: true, top: hexToLinear('#8a939b') });
  g.box(P(-11.8, 1.7, 10 + 1.01), ff, rr, 1.2, 0.7, 0.06, hexToLinear('#2c3b4b'), { skipBottom: true });
  g.box(P(-11.8, 2.85, 10), ff, rr, 2.6, 0.12, 2.2, hexToLinear('#5a646c'), { skipBottom: true });

  // --- traffic signals at the junction corners (5-arm crossing is signalised) ----------------
  const SIGNS = [[-13.2, -8], [-13.2, 10], [13.2, -10], [13.2, 8]];
  for (const [lat, ls] of SIGNS) {
    g.box(P(lat, 0, ls), ff, rr, 0.16, 4.6, 0.16, hexToLinear('#3c4045'), { skipBottom: true });
    g.box(P(lat, 4.2, ls), ff, rr, 0.4, 1.0, 0.3, hexToLinear('#23262b'), { skipBottom: true, top: hexToLinear('#2c3b4b') });
  }
}
