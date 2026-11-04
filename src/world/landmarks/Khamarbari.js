// Khamarbari government agriculture complex (Milestone 4) - the institutional face of the
// corridor's opening stretch on the LEFT (east) side: cream mosaic blocks with red-brick
// bases and flag masts (Dept. of Agricultural Extension / BARC / KIB territory), a hoarding
// fence along the footpath, and the Shahid Anwara Udyan park remnant with DMTCL site
// containers behind the fence. Static scenery; clears the generated streetwall.
import { Rng } from '../../core/Rng.js';
import { hexToLinear, shade } from '../../render/GeometryBuilder.js';

export function buildKhamarbari(g, sg, route, lm) {
  const rng = new Rng(`${route.id}:${lm.id}`);
  const side = lm.side ?? -1;
  const s0 = lm.s0, s1 = lm.s1;

  const frameCache = new Map();
  const frameAt = (s) => {
    const key = Math.round(s * 2) / 2;
    if (!frameCache.has(key)) {
      const f = route.space.sample(key, {});
      const prof = route.profileAt(Math.min(Math.max(key, 0), route.length));
      f.front = Math.abs(prof[side < 0 ? 'frontageL' : 'frontageR']);   // positive = into the complex side
      frameCache.set(key, f);
    }
    return frameCache.get(key);
  };
  const P = (f, ls, lat, y) => [f.x + f.fx * ls + f.rx * lat * side, y, f.z + f.fz * ls + f.rz * lat * side];

  const plaster = hexToLinear('#d8ccaf'), plasterB = hexToLinear('#c9bda2');
  const brick = hexToLinear('#8a5a44'), win = hexToLinear('#2c3b4b');
  const tin = hexToLinear('#9aa0a6'), posterA = hexToLinear('#c9403a'), posterB = hexToLinear('#2e7dab');
  const wallC = hexToLinear('#b9b2a6'), green = hexToLinear('#55703c'), trunkC = hexToLinear('#6b5138');
  const container = hexToLinear('#dfe3e0'), flagR = hexToLinear('#c9403a'), flagG = hexToLinear('#2e7d4f');

  // three institutional blocks
  const blocks = [[s0 + 22, 26, 10.0], [(s0 + s1) / 2 + 8, 30, 12.6], [s1 - 26, 24, 9.4]];
  for (const [bs, bw, bh] of blocks) {
    const fa = frameAt(bs - bw / 2), fb = frameAt(bs + bw / 2);
    const front = fa.front;
    const D = 18;
    // walls: brick base + plaster upper + window strips + parapet
    g.quad(P(fa, 0, front, 0), P(fb, 0, fb.front, 0), P(fb, 0, fb.front, 2.4), P(fa, 0, front, 2.4), brick, { hint: [-side * fa.rx, 0, -side * fa.rz] });
    g.quad(P(fa, 0, front, 2.4), P(fb, 0, fb.front, 2.4), P(fb, 0, fb.front, bh), P(fa, 0, front, bh), plaster, { hint: [-side * fa.rx, 0, -side * fa.rz] });
    const floors = Math.max(2, Math.round((bh - 2.4) / 3.4));
    for (let k = 0; k < floors; k++) {
      const wy = 3.4 + k * 3.4;
      if (wy > bh - 1.4) break;
      g.quad(P(fa, 0, front - 0.02, wy), P(fb, 0, fb.front - 0.02, wy), P(fb, 0, fb.front - 0.02, wy + 1.5), P(fa, 0, front - 0.02, wy + 1.5), win, { hint: [-side * fa.rx, 0, -side * fa.rz] });
    }
    g.quad(P(fa, 0, front - 0.14, bh), P(fb, 0, fb.front - 0.14, bh), P(fb, 0, fb.front - 0.14, bh + 0.5), P(fa, 0, front - 0.14, bh + 0.5), plasterB, { hint: [-side * fa.rx, 0, -side * fa.rz] });
    // roof + flag mast on the first block
    g.quad(P(fa, 0, front, bh + 0.5), P(fb, 0, fb.front, bh + 0.5), P(fb, 0, fb.front + D, bh + 0.5), P(fa, 0, front + D, bh + 0.5), shade(plaster, 0.8), { hint: [0, 1, 0] });
    if (bs === blocks[0][0]) {
      const fm = frameAt(bs);
      g.box(P(fm, 0, front + D * 0.4, bh + 0.5), [fm.fx, fm.fz], [fm.rx, fm.rz], 0.07, 4.6, 0.07, '#c9c9c4', { skipBottom: true });
      g.quad(P(fm, 0.05, front + D * 0.4, bh + 4.6), P(fm, 0.05, front + D * 0.4 + 1.3, bh + 4.6), P(fm, 0.05, front + D * 0.4 + 1.3, bh + 4.15), P(fm, 0.05, front + D * 0.4, bh + 4.15), flagR, { hint: [side * fm.rx, 0, side * fm.rz] });
      g.quad(P(fm, 0.1, front + D * 0.4 + 0.55, bh + 4.6), P(fm, 0.1, front + D * 0.4 + 1.0, bh + 4.6), P(fm, 0.1, front + D * 0.4 + 1.0, bh + 4.32), P(fm, 0.1, front + D * 0.4 + 0.55, bh + 4.32), flagG, { hint: [side * fm.rx, 0, side * fm.rz] });
    }
  }

  // hoarding fence along the footpath with posters
  for (let s = s0; s < s1 - 3; s += 3.2) {
    const fa = frameAt(s), fb = frameAt(Math.min(s + 3.0, s1));
    const fr = fa.front;
    g.quad(P(fa, 0, fr, 0), P(fb, 0, fb.front, 0), P(fb, 0, fb.front, 2.6), P(fa, 0, fr, 2.6), rng.chance(0.6) ? tin : wallC, { hint: [-side * fa.rx, 0, -side * fa.rz] });
    if (rng.chance(0.4)) {
      const roll = rng.next();
      g.quad(P(fa, 0.02, fr - 0.02, 0.7), P(fb, 0.02, fb.front - 0.02, 0.7), P(fb, 0.02, fb.front - 0.02, 2.2), P(fa, 0.02, fr - 0.02, 2.2), roll < 0.4 ? posterA : posterB, { hint: [-side * fa.rx, 0, -side * fa.rz] });
    }
  }
  // gate posts at the middle block
  {
    const fm = frameAt((s0 + s1) / 2);
    for (const dl of [-2.2, 2.2]) {
      g.box(P(fm, dl, fm.front, 0), [fm.fx, fm.fz], [fm.rx, fm.rz], 0.4, 3.0, 0.4, plasterB, { skipBottom: true });
    }
  }

  // park remnant: trees + DMTCL site containers behind the fence
  for (let k = 0; k < 7; k++) {
    const s = s0 + 8 + rng.next() * (s1 - s0 - 16);
    const f = frameAt(s);
    const lat = f.front + 7 + rng.next() * 9;
    const th = 3.2 + rng.next() * 2.4;
    g.box(P(f, 0, lat, 0), [f.fx, f.fz], [f.rx, f.rz], 0.34, th, 0.34, trunkC, { skipBottom: true });
    g.box(P(f, 0, lat, th), [f.fx, f.fz], [f.rx, f.rz], 2.6 + rng.next() * 1.4, 1.8, 2.6 + rng.next() * 1.4, green, { skipBottom: true });
    g.box(P(f, 0, lat, th + 1.5), [f.fx, f.fz], [f.rx, f.rz], 1.8, 1.2, 1.8, shade(green, 1.15), { skipBottom: true });
  }
  for (const [cs, cl] of [[s0 + 40, 10.5], [s0 + 58, 12.5]]) {
    const f = frameAt(cs);
    g.box(P(f, 0, f.front + 8, 0), [f.fx, f.fz], [f.rx, f.rz], cl, 2.6, 2.4, container, { skipBottom: true, top: shade(container, 0.9) });
    g.quad(P(f, -cl / 2, f.front + 8 - 1.2, 1.9), P(f, cl / 2, f.front + 8 - 1.2, 1.9), P(f, cl / 2, f.front + 8 - 1.2, 2.0), P(f, -cl / 2, f.front + 8 - 1.2, 2.0), shade(container, 0.82), { hint: [side * f.rx, 0, side * f.rz] });
  }
}
