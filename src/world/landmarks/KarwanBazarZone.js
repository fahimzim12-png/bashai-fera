// Kawran Bazar zone (Milestone 4) - everything BEHIND the wholesale sheds on the LEFT
// (east) side of the avenue, from press/OSM ground truth: the DNCC concrete kitchen-market
// block, the fish market strip with ice, parked staff buses and a covered van (they hold
// the roadside all day per Daily Star reporting), the trunk railway with the Karwan Bazar
// level crossing, the elevated expressway mainline + FDC ramp above it, the 17th-century
// three-domed Mughal mosque on its raised platform, the FDC compound with its 12-storey
// concrete skeleton, and the BDBL/BSEC tower backdrop. Static scenery.
import { Rng } from '../../core/Rng.js';
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';
import { designByText, designUV, designSpanWidth } from '../signCatalog.js';

const smoothstep = (t) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

export function buildKarwanZone(g, sg, route, lm) {
  const rng = new Rng(`${route.id}:${lm.id}`);
  const side = lm.side ?? -1;
  const s0 = lm.s0, s1 = lm.s1;

  const frameCache = new Map();
  const frameAt = (s) => {
    const key = Math.round(s * 2) / 2;
    if (!frameCache.has(key)) {
      const f = route.space.sample(key, {});
      const prof = route.profileAt(Math.min(Math.max(key, 0), route.length));
      f.front = Math.abs(prof[side < 0 ? 'frontageL' : 'frontageR']);   // positive = into the market side
      frameCache.set(key, f);
    }
    return frameCache.get(key);
  };
  // ls along route from s (local), lat lateral INTO the market side, y up
  const P = (f, ls, lat, y) => [f.x + f.fx * ls + f.rx * lat * side, y, f.z + f.fz * ls + f.rz * lat * side];

  const concrete = hexToLinear('#b0a99c'), concreteD = hexToLinear('#8f8a80');
  const win = hexToLinear('#3a4148'), stain = hexToLinear('#6e6a60');
  const fishBlue = hexToLinear('#3a6ea8'), ice = hexToLinear('#e8eef0');
  const rail = hexToLinear('#6a6d72'), sleeper = hexToLinear('#4a4038'), ballast = hexToLinear('#7a756c');
  const mosque = hexToLinear('#e8e4da'), mosqueD = hexToLinear('#c9c2b2'), domeG = hexToLinear('#2e7d5c');
  const tin = hexToLinear('#9aa0a6'), brick = hexToLinear('#8a4a32'), busWhite = hexToLinear('#d8d8d4');
  const towerA = hexToLinear('#a8b3b8'), towerB = hexToLinear('#8fa1ad');
  const bamboo = hexToLinear('#b8a25c');

  const signQuad = (f, ls, lat, y, w, h, di, flip = false) => {
    if (di < 0) return;
    const du = designUV(di), w2 = Math.min(w, designSpanWidth(di));
    const a = P(f, ls - w2 / 2, lat, y), b = P(f, ls + w2 / 2, lat, y);
    const c = P(f, ls + w2 / 2, lat, y + h), d = P(f, ls - w2 / 2, lat, y + h);
    sg.quad(a, b, c, d, '#ffffff', {
      hint: flip ? [side * f.rx, 0, side * f.rz] : [-side * f.rx, 0, -side * f.rz],
      uv: [[du[0], du[1]], [du[2], du[1]], [du[2], du[3]], [du[0], du[3]]],
    });
  };

  // ---- DNCC concrete kitchen-market block (s ~900-985, multi-storey) ------------------------
  {
    const fa = frameAt(900), fb = frameAt(985);
    const fr = fa.front, D = 20, H = 13.6;
    for (let k = 0; k < 4; k++) {
      const y0 = k * 3.4;
      g.quad(P(fa, 0, fr, y0 + 0.15), P(fb, 0, fb.front, y0 + 0.15), P(fb, 0, fb.front, y0 + 3.1), P(fa, 0, fr, y0 + 3.1), k % 2 ? shade(concrete, 0.94) : concrete, { hint: [-side * fa.rx, 0, -side * fa.rz] });
      g.quad(P(fa, 0, fr, y0), P(fb, 0, fb.front, y0), P(fb, 0, fb.front, y0 + 0.18), P(fa, 0, fr, y0 + 0.18), concreteD, { hint: [-side * fa.rx, 0, -side * fa.rz] });   // slab band
    }
    for (const wy of [4.6, 8.0, 11.4]) {                    // shutter rows
      for (let x = 6; x < 78; x += 8) {
        const fa2 = frameAt(902 + x), fb2 = frameAt(906 + x);
        g.quad(P(fa2, 0, fr - 0.03, wy), P(fb2, 0, fb2.front - 0.03, wy), P(fb2, 0, fb2.front - 0.03, wy + 2.0), P(fa2, 0, fr - 0.03, wy + 2.0), shade(win, 1 + (x % 16) * 0.01), { hint: [-side * fa2.rx, 0, -side * fa2.rz] });
      }
    }
    for (const sx of [14, 40, 66]) {                        // monsoon stains
      const f = frameAt(900 + sx);
      g.quad(P(f, 0, fr - 0.04, 2.0), P(f, 0.9, fr - 0.04, 2.0), P(f, 0.9, fr - 0.04, 9.5), P(f, 0, fr - 0.04, 9.5), stain, { hint: [-side * f.rx, 0, -side * f.rz] });
    }
    g.quad(P(fa, 0, fr, H), P(fb, 0, fb.front, H), P(fb, 0, fb.front + D, H), P(fa, 0, fr + D, H), shade(concrete, 0.8), { hint: [0, 1, 0] });
    signQuad(frameAt(942), 0, fr - 0.06, 6.0, 4.8, 1.2, designByText('KAWRAN BAZAR COMPLEX'));
    // water tanks on the roof
    for (const tx of [16, 60]) {
      const f = frameAt(900 + tx);
      g.box(P(f, 0, fr + 8, H), [f.fx, f.fz], [f.rx, f.rz], 1.7, 1.5, 1.7, '#3f5566', { skipBottom: true });
    }
  }

  // ---- fish market strip (s 995-1045): blue stalls + ice + pennants --------------------------
  {
    const fr = frameAt(995).front;
    for (let s = 995; s < 1043; s += 4) {
      const fa = frameAt(s), fb = frameAt(s + 3.6);
      g.quad(P(fa, 0, fr + 1.2, 0), P(fb, 0, fb.front + 1.2, 0), P(fb, 0, fb.front + 1.2, 2.6), P(fa, 0, fr + 1.2, 2.6), shade(fishBlue, 0.9 + (s % 8) * 0.01), { hint: [-side * fa.rx, 0, -side * fa.rz] });
      g.quad(P(fa, 0, fr + 1.2, 2.6), P(fb, 0, fb.front + 1.2, 2.6), P(fb, 0, fb.front + 3.6, 3.3), P(fa, 0, fr + 1.2, 3.3), tin, { hint: [0, 1, 0] });
      g.quad(P(fa, 0, fr + 1.5, 1.0), P(fb, 0, fb.front + 1.5, 1.0), P(fb, 0, fb.front + 2.4, 1.0), P(fa, 0, fr + 1.5, 1.0), rng.chance(0.5) ? ice : shade(ice, 0.9), { hint: [0, 1, 0] });   // ice slab / counter
    }
    // pennant line over the strip
    for (let s = 996; s < 1042; s += 3.2) {
      const f = frameAt(s), f2 = frameAt(s + 3.2);
      g.box(P(f, 0, fr + 4.4, 3.5), [f.fx, f.fz], [f.rx, f.rz], 0.05, 2.6, 0.05, bamboo, { skipBottom: true });
      const a = P(f, 0, fr + 4.35, 3.4), b = P(f2, 0, fr + 4.35, 3.4);
      const mid = [(a[0] + b[0]) / 2, 3.02, (a[2] + b[2]) / 2];
      g.tri(a, b, mid, rng.chance(0.5) ? fishBlue : hexToLinear('#c9403a'), [0, 1, 0]);
    }
    signQuad(frameAt(1019), 0, fr - 0.06, 3.6, 4.8, 1.2, designByText('FISH MARKET'));
  }

  // ---- parked staff buses + covered van (the all-day parking row, s 950-1015) -----------------
  const busZones = [[952, 0], [972, 0], [992, 0], [1008, 1]];
  for (const [bs, isVan] of busZones) {
    const f = frameAt(bs);
    const lat = f.front + 5.4;
    if (!isVan) {
      g.box(P(f, 0, lat, 0.55), [f.fx, f.fz], [f.rx, f.rz], 10.4, 2.0, 2.45, shade(busWhite, 0.9 + (bs % 3) * 0.05), { skipBottom: true });
      g.box(P(f, 0, lat, 1.5), [f.fx, f.fz], [f.rx, f.rz], 9.6, 0.85, 2.48, win, { skipBottom: true });
      g.box(P(f, 0, lat, 2.55), [f.fx, f.fz], [f.rx, f.rz], 10.0, 0.12, 2.3, shade(busWhite, 0.75), { skipBottom: true });
    } else {
      g.box(P(f, 0, lat, 0.4), [f.fx, f.fz], [f.rx, f.rz], 3.4, 1.5, 1.9, busWhite, { skipBottom: true });
      g.box(P(f, -2.6, lat, 0.34), [f.fx, f.fz], [f.rx, f.rz], 1.6, 1.1, 1.85, busWhite, { skipBottom: true });
    }
    for (const wz of [-3.4, 3.4]) {
      g.box(P(f, wz, lat, 0), [f.fx, f.fz], [f.rx, f.rz], 0.5, 0.55, 0.5, '#141519', { skipBottom: true });
    }
  }

  // ---- trunk railway + level crossing (s 1000-1120, lat ~46) -----------------------------------
  {
    const RLAT = 46;
    for (let s = s0; s < s1 - 30; s += 30) {
      const fa = frameAt(s), fb = frameAt(Math.min(s + 30, s1 - 30));
      g.quad(P(fa, 0, RLAT - 2.6, 0.1), P(fb, 0, RLAT - 2.6, 0.1), P(fb, 0, RLAT + 2.6, 0.1), P(fa, 0, RLAT + 2.6, 0.1), ballast, { hint: [0, 1, 0] });
      for (const rl of [-0.72, 0.72]) {
        g.box(P(fa, 15, RLAT + rl, 0.12), [fa.fx, fa.fz], [fa.rx, fa.rz], Math.min(30, s1 - 30 - s), 0.22, 0.14, rail, { skipBottom: true });
      }
    }
    // sleepers only near the crossing (keeps the tri count honest)
    for (let s = 1002; s < 1068; s += 2.4) {
      const f = frameAt(s);
      g.box(P(f, 0, RLAT, 0.02), [f.fx, f.fz], [f.rx, f.rz], 2.2, 0.09, 0.24, sleeper, { skipBottom: true });
    }
    // level crossing at s 1035: barriers + crossbuck
    const f = frameAt(1035);
    for (const dl of [-3.4, 3.4]) {
      g.box(P(f, dl, f.front + 3.6, 0), [f.fx, f.fz], [f.rx, f.rz], 0.22, 2.6, 0.22, hexToLinear('#e8e6df'), { skipBottom: true });
      g.box(P(f, dl, f.front + 3.6, 2.3), [f.fx, f.fz], [f.rx, f.rz], 0.16, 0.5, 0.16, hexToLinear('#c9403a'), { skipBottom: true });
    }
    signQuad(f, 0, f.front + 4.3, 1.6, 4.8, 1.2, designByText('NO RAW PRODUCE'));
  }

  // ---- expressway mainline above the rail + FDC ramp down to the gate --------------------------
  {
    const ELAT = 50, EW = 5.5, EY = 19;
    for (let s = s0; s < s1 - 30; s += 6) {
      const fa = frameAt(s), fb = frameAt(s + 6);
      g.quad(P(fa, 0, ELAT - EW, EY), P(fb, 0, ELAT - EW, EY), P(fb, 0, ELAT + EW, EY), P(fa, 0, ELAT + EW, EY), concrete, { hint: [0, 1, 0] });
      for (const rl of [ELAT - EW, ELAT + EW]) {
        g.quad(P(fa, 0, rl, EY), P(fb, 0, rl, EY), P(fb, 0, rl, EY + 1.0), P(fa, 0, rl, EY + 1.0), shade(concrete, 1.08), { hint: [fa.rx * (rl < ELAT ? 1 : -1) * side, 0, fa.rz * (rl < ELAT ? 1 : -1) * side] });
      }
    }
    // FDC ramp: descends from the mainline to the FDC gate (s ~1140-1195)
    for (let s = 1128; s < 1194; s += 6) {
      const t0 = smoothstep((s - 1128) / (1194 - 1128));
      const t1 = smoothstep((s + 6 - 1128) / (1194 - 1128));
      const fa = frameAt(s), fb = frameAt(s + 6);
      const y0 = EY * (1 - t0) + 0.9, y1v = EY * (1 - t1) + 0.9;
      g.quad(P(fa, 0, ELAT - EW, y0), P(fb, 0, ELAT - EW, y1v), P(fb, 0, ELAT + EW, y1v), P(fa, 0, ELAT + EW, y0), concrete, { hint: [0, 1, 0] });
      for (const rl of [ELAT - EW, ELAT + EW]) {
        g.quad(P(fa, 0, rl, y0), P(fb, 0, rl, y1v), P(fb, 0, rl, y1v + 0.9), P(fa, 0, rl, y0 + 0.9), shade(concrete, 1.08), { hint: [fa.rx * (rl < ELAT ? 1 : -1) * side, 0, fa.rz * (rl < ELAT ? 1 : -1) * side] });
      }
    }
    // mainline piers
    for (let s = s0 + 13; s < 1120; s += 26) {
      const f = frameAt(s);
      for (const dl of [-1.6, 1.6]) {
        g.box(P(f, 0, ELAT + dl, 0), [f.fx, f.fz], [f.rx, f.rz], 1.0, EY - 1.4, 1.0, concreteD, { skipBottom: true });
      }
      g.box(P(f, 0, ELAT, EY - 1.5), [f.fx, f.fz], [f.rx, f.rz], 1.2, 1.5, 6.4, concrete, { skipBottom: true });
    }
  }

  // ---- Mughal mosque: raised platform + hall + three domes + minarets (s ~1075, lat ~31) -------
  {
    const f = frameAt(1075);
    const lat = f.front + 6, W = 9, D = 12;
    g.box(P(f, 0, lat + D / 2, 0), [f.fx, f.fz], [f.rx, f.rz], D + 2.4, 1.5, W + 2.4, mosqueD, { skipBottom: true });   // raised platform (~12 ft read)
    g.box(P(f, 0, lat + D / 2, 1.5), [f.fx, f.fz], [f.rx, f.rz], D, 3.4, W, mosque, { skipBottom: true });              // hall
    const dome = (ls, dl, r) => {
      const c = P(f, ls, lat + dl, 4.9);
      for (let k = 0; k < 3; k++) {
        const rr = r * (1 - k * 0.28), y = 4.9 + k * r * 0.5;
        g.box([c[0], y, c[2]], [f.fx, f.fz], [f.rx, f.rz], rr * 2, r * 0.5, rr * 2, k === 2 ? domeG : mosque, { skipBottom: true });
      }
    };
    dome(0, D / 2, 2.0); dome(0, 2.2, 1.35); dome(0, D - 2.2, 1.35);
    for (const dl of [-0.8, D + 0.8]) {
      g.box(P(f, 0, lat + dl, 1.5), [f.fx, f.fz], [f.rx, f.rz], 1.1, 6.8, 1.1, mosque, { skipBottom: true });
      g.box(P(f, 0, lat + dl, 8.3), [f.fx, f.fz], [f.rx, f.rz], 1.3, 0.9, 1.3, domeG, { skipBottom: true });
    }
  }

  // ---- FDC compound: wall + gate + 12-storey skeleton + sign (s 1130-1195, lat ~36) -------------
  {
    const fa = frameAt(1132), fb = frameAt(1194);
    const fr = fa.front;
    g.quad(P(fa, 0, fr, 0), P(fb, 0, fb.front, 0), P(fb, 0, fb.front, 2.8), P(fa, 0, fr, 2.8), brick, { hint: [-side * fa.rx, 0, -side * fa.rz] });
    for (const dl of [-3.0, 3.0]) {
      g.box(P(frameAt(1160), dl, fr, 0), [fa.fx, fa.fz], [fa.rx, fa.rz], 0.5, 4.2, 0.5, concreteD, { skipBottom: true });
    }
    // 12-storey concrete skeleton behind the wall
    const sk = frameAt(1160), skLat = fr + 12, H = 12 * 3.2;
    for (const dl of [-5.5, 5.5]) for (const dt of [-4, 4]) {
      const c = P(sk, dt, skLat + dl, 0);
      g.box([c[0], 0, c[2]], [sk.fx, sk.fz], [sk.rx, sk.rz], 0.55, H, 0.55, concreteD, { skipBottom: true });
    }
    for (let k = 0; k <= 12; k++) {
      const c = P(sk, 0, skLat, k * 3.2);
      g.box([c[0], k * 3.2, c[2]], [sk.fx, sk.fz], [sk.rx, sk.rz], 11.5, 0.4, 9.0, shade(concrete, 0.95), { skipBottom: true });
    }
    // bamboo scaffold on one corner
    for (const dl of [-5.8, -4.4]) {
      const c = P(sk, -5, skLat + dl, 0);
      g.box([c[0], 0, c[2]], [sk.fx, sk.fz], [sk.rx, sk.rz], 0.09, H + 1.5, 0.09, bamboo, { skipBottom: true });
    }
    signQuad(sk, 0, fr - 0.06, 4.4, 4.8, 1.2, designByText('BFDC'));
  }

  // ---- tower backdrop: BDBL Bhaban (18F) + BSEC Bhaban ------------------------------------------
  const tower = (ts, tl, tw, th, col) => {
    const f = frameAt(ts);
    const lat = tl;
    g.box(P(f, 0, lat, 0), [f.fx, f.fz], [f.rx, f.rz], tw, th, tw * 0.8, col, { skipBottom: true });
    for (let y = 4; y < th - 2; y += 3.2) {
      g.quad(P(f, -tw / 2 + 0.3, lat - tw * 0.4 - 0.02, y), P(f, tw / 2 - 0.3, lat - tw * 0.4 - 0.02, y), P(f, tw / 2 - 0.3, lat - tw * 0.4 - 0.02, y + 1.6), P(f, -tw / 2 + 0.3, lat - tw * 0.4 - 0.02, y + 1.6), win, { hint: [-side * f.rx, 0, -side * f.rz] });
    }
    g.box(P(f, 0, lat, th), [f.fx, f.fz], [f.rx, f.rz], tw * 0.4, 2.4, tw * 0.3, shade(col, 0.85), { skipBottom: true });   // roof machine room
  };
  tower(1005, 50, 15, 58, towerA);      // BDBL Bhaban, 18 floors
  tower(945, 52, 12, 40, towerB);       // BSEC Bhaban (RTV)
}
