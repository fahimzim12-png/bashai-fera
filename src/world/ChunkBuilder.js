// Turns the route description into geometry for ONE 60 m chunk of street.
// Pure function of (route, chunkIndex): the same inputs always give the same street, which is what
// makes streaming safe (a chunk can be thrown away and rebuilt identically later).
//
// Output is two arrays-of-geometry:
//   ground : vertex-coloured things (road, footpaths, median, viaduct, poles, shops, roofs...)
//   facade : building walls, textured with the window pattern
import { CONFIG } from '../core/Config.js';
import { Rng, hashString } from '../core/Rng.js';
import { lerp } from '../core/MathUtil.js';
import { GeometryBuilder, hexToLinear, shade } from '../render/GeometryBuilder.js';

const UP = [0, 1, 0];
const DOWN = [0, -1, 0];
const POLE_SPACING = 32;
const LAMP_SPACING = 36;
const DASH = 3, DASH_PERIOD = 6;

const W = (f, lat, y) => [f.x + f.rx * lat, y, f.z + f.rz * lat];          // route frame -> world point
const poleS = (side, k) => k * POLE_SPACING + (hashString(`pole:${side}:${k}`) / 4294967296) * 6;
const lampS = (side, k) => k * LAMP_SPACING + (side < 0 ? 9 : 27);

export function chunkIndexForS(s) { return Math.floor(s / CONFIG.world.chunkLength); }

export function buildChunk(route, ci) {
  const L = CONFIG.world.chunkLength, STEP = CONFIG.world.sliceStep;
  const s0 = ci * L, s1 = s0 + L;
  const ground = new GeometryBuilder();
  const facade = new GeometryBuilder({ uv: true });
  const rng = new Rng(`${route.id}:chunk:${ci}`);
  const jit = (hex, amt = 0.06) => shade(hexToLinear(hex), 1 + (rng.next() - 0.5) * amt);

  // road cross-sections every STEP metres
  const n = Math.round(L / STEP);
  const frames = [];
  for (let i = 0; i <= n; i++) {
    const s = s0 + i * STEP;
    const f = route.space.sample(s, {});
    f.s = s; f.profile = route.profileAt(s);
    frames.push(f);
  }

  surfaces(ground, frames, jit);
  laneMarkings(ground, route, s0, s1);
  viaduct(ground, route, frames, s0, s1);
  poles(ground, route, s0, s1);
  lamps(ground, route, s0, s1);
  buildings(ground, facade, route, s0, s1);
  landmarks(ground, route, s0, s1);

  return { ground: ground.finish(), facade: facade.finish(), ci, s0, s1 };
}

// ---- road, footpaths, median --------------------------------------------------------------
function surfaces(g, frames, jit) {
  const kerb = hexToLinear('#c9c3b7');
  for (let i = 0; i < frames.length - 1; i++) {
    const A = frames[i], B = frames[i + 1];
    for (let e = 0; e < A.profile.elements.length; e++) {
      const ea = A.profile.elements[e], eb = B.profile.elements[e];
      const y = ea.height, yb = eb.height;
      g.quad(W(A, ea.x0, y), W(B, eb.x0, yb), W(B, eb.x1, yb), W(A, ea.x1, y), jit(ea.color), { hint: UP });
      if (ea.kind === 'footpath') {                       // kerb face toward the road
        const roadward = (ea.x0 + ea.x1) / 2 < 0 ? 1 : -1;
        const xa = roadward > 0 ? ea.x1 : ea.x0, xb = roadward > 0 ? eb.x1 : eb.x0;
        g.quad(W(A, xa, 0), W(B, xb, 0), W(B, xb, yb), W(A, xa, y), kerb, { hint: [roadward * A.rx, 0, roadward * A.rz] });
      } else if (ea.kind === 'median') {                  // concrete wall faces on both sides
        const wall = hexToLinear('#8d887e');
        g.quad(W(A, ea.x0, 0), W(B, eb.x0, 0), W(B, eb.x0, yb), W(A, ea.x0, y), wall, { hint: [-A.rx, 0, -A.rz] });
        g.quad(W(A, ea.x1, 0), W(B, eb.x1, 0), W(B, eb.x1, yb), W(A, ea.x1, y), wall, { hint: [A.rx, 0, A.rz] });
      }
    }
  }
}

// ---- dashed lane lines ---------------------------------------------------------------------
function laneMarkings(g, route, s0, s1) {
  const paint = hexToLinear('#d9d5c9');
  const fa = {}, fb = {};
  for (let sd = Math.floor(s0 / DASH_PERIOD) * DASH_PERIOD; sd < s1; sd += DASH_PERIOD) {
    const a = Math.max(sd, s0), b = Math.min(sd + DASH, s1);
    if (b - a < 0.2) continue;
    const prof = route.profileAt((a + b) / 2);
    route.space.sample(a, fa); route.space.sample(b, fb);
    for (const el of prof.elements) {
      if (el.kind !== 'road' || !(el.lanes > 1)) continue;
      for (let k = 1; k < el.lanes; k++) {
        const lat = lerp(el.x0, el.x1, k / el.lanes), hw = 0.075, y = el.height + 0.015;
        g.quad(W(fa, lat - hw, y), W(fb, lat - hw, y), W(fb, lat + hw, y), W(fa, lat + hw, y), paint, { hint: UP });
      }
    }
  }
}

// ---- Metro Rail viaduct over the median -----------------------------------------------------
function viaduct(g, route, frames, s0, s1) {
  const top = hexToLinear('#aaa59c'), sideC = hexToLinear('#bdb8ae'), under = hexToLinear('#7f7b73');
  for (let i = 0; i < frames.length - 1; i++) {
    const A = frames[i], B = frames[i + 1];
    const ma = A.profile.elements.find((e) => e.viaduct), mb = B.profile.elements.find((e) => e.viaduct);
    if (!ma || !mb) continue;
    const v = ma.viaduct, hw = v.width / 2;
    g.quad(W(A, -hw, v.top), W(B, -hw, v.top), W(B, hw, v.top), W(A, hw, v.top), top, { hint: UP });
    g.quad(W(A, -hw, v.bottom), W(B, -hw, v.bottom), W(B, hw, v.bottom), W(A, hw, v.bottom), under, { hint: DOWN });
    g.quad(W(A, -hw, v.bottom), W(B, -hw, v.bottom), W(B, -hw, v.top), W(A, -hw, v.top), sideC, { hint: [-A.rx, 0, -A.rz] });
    g.quad(W(A, hw, v.bottom), W(B, hw, v.bottom), W(B, hw, v.top), W(A, hw, v.top), sideC, { hint: [A.rx, 0, A.rz] });
  }
  const spacing = 28, f = {};
  const colC = hexToLinear('#b3aea4'), colCap = hexToLinear('#a39f96');
  for (let k = Math.ceil(s0 / spacing); k * spacing < s1; k++) {
    const s = k * spacing;
    const prof = route.profileAt(s);
    const m = prof.elements.find((e) => e.viaduct);
    if (!m) continue;
    route.space.sample(s, f);
    const base = [f.x, 0, f.z], ff = [f.fx, f.fz], rr = [f.rx, f.rz];
    g.box(base, ff, rr, 1.7, m.viaduct.bottom - 1.4, 1.5, colC, { skipBottom: true });
    g.box([f.x, m.viaduct.bottom - 1.4, f.z], ff, rr, 2.0, 1.4, 4.8, colCap, { skipBottom: true });
  }
}

// ---- Utility poles with sagging cables (a very recognisable Dhaka sight) --------------------
function poles(g, route, s0, s1) {
  const dark = hexToLinear('#3d3b38'), wire = hexToLinear('#1d1d1f');
  const fa = {}, fb = {};
  for (const side of [-1, 1]) {
    const latOf = (s) => {
      const fp = route.profileAt(s).elements.filter((e) => e.kind === 'footpath');
      return side < 0 ? fp[0].x0 + 0.45 : fp[fp.length - 1].x1 - 0.45;
    };
    for (let k = Math.floor(s0 / POLE_SPACING) - 1; k <= Math.ceil(s1 / POLE_SPACING) + 1; k++) {
      const sA = poleS(side, k);
      if (sA < s0 || sA >= s1) continue;
      route.space.sample(sA, fa);
      const latA = latOf(sA);
      g.box([fa.x + fa.rx * latA, 0, fa.z + fa.rz * latA], [fa.fx, fa.fz], [fa.rx, fa.rz], 0.22, 8.2, 0.22, dark, { skipBottom: true });
      g.box([fa.x + fa.rx * latA, 7.55, fa.z + fa.rz * latA], [fa.fx, fa.fz], [fa.rx, fa.rz], 0.14, 0.14, 1.9, dark, { skipBottom: true });
      const sB = poleS(side, k + 1);
      route.space.sample(sB, fb);
      const latB = latOf(sB);
      for (let j = 0; j < 3; j++) {
        const off = (j - 1) * 0.75, y = 7.9 + j * 0.1;
        const pA = W(fa, latA + off, y), pB = W(fb, latB + off, y);
        const SEG = 4;
        let prev = pA;
        for (let q = 1; q <= SEG; q++) {
          const t = q / SEG;
          const p = [lerp(pA[0], pB[0], t), lerp(pA[1], pB[1], t) - 0.5 * 4 * t * (1 - t), lerp(pA[2], pB[2], t)];
          g.quad([prev[0], prev[1] + 0.03, prev[2]], [p[0], p[1] + 0.03, p[2]], [p[0], p[1] - 0.03, p[2]], [prev[0], prev[1] - 0.03, prev[2]], wire, { double: true });
          prev = p;
        }
      }
    }
  }
}

// ---- Street lights on the road side of each footpath --------------------------------------------
function lamps(g, route, s0, s1) {
  const pole = hexToLinear('#44474d'), head = hexToLinear('#fff1c4');
  const f = {};
  for (const side of [-1, 1]) {
    for (let k = Math.floor(s0 / LAMP_SPACING) - 1; k <= Math.ceil(s1 / LAMP_SPACING) + 1; k++) {
      const s = lampS(side, k);
      if (s < s0 || s >= s1) continue;
      const fp = route.profileAt(s).elements.filter((e) => e.kind === 'footpath');
      const lat = side < 0 ? fp[0].x1 - 0.5 : fp[fp.length - 1].x0 + 0.5;
      const toRoad = side < 0 ? 1 : -1;
      route.space.sample(s, f);
      const ff = [f.fx, f.fz], rr = [f.rx, f.rz];
      g.box([f.x + f.rx * lat, 0, f.z + f.rz * lat], ff, rr, 0.16, 6.6, 0.16, pole, { skipBottom: true });
      const armLat = lat + toRoad * 0.8;
      g.box([f.x + f.rx * armLat, 6.5, f.z + f.rz * armLat], ff, rr, 0.1, 0.1, 1.7, pole, { skipBottom: true });
      const headLat = lat + toRoad * 1.55;
      g.box([f.x + f.rx * headLat, 6.38, f.z + f.rz * headLat], ff, rr, 0.32, 0.14, 0.6, pole, { top: pole, side: pole, bottom: head });
    }
  }
}

// ---- Buildings: facades (textured) + roofs, shopfronts, awnings, tanks, billboards ---------------
function buildings(g, fac, route, s0, s1) {
  const f = {};
  for (const b of route.buildings) {
    if (b.sMid < s0 || b.sMid >= s1) continue;
    const r = new Rng(b.seed);
    const pal = route.palettes[b.palette];
    route.space.sample(b.sMid, f);
    const prof = route.profileAt(b.sMid);
    const side = b.side;
    const front = side < 0 ? prof.frontageL : prof.frontageR;
    const P = (ls, lat, y) => [f.x + f.fx * ls + f.rx * lat, y, f.z + f.fz * ls + f.rz * lat];
    const toRoad = [-side * f.rx, 0, -side * f.rz];
    const hw = b.w / 2, back = front + side * b.depth;
    const y1 = b.h;
    const wall = shade(hexToLinear(b.wall), 0.94 + r.next() * 0.1);
    const u0 = r.int(0, 3) / 4;
    const uv = (ls, y) => [(ls + hw) / 12 + u0, (y - 0.4) / 12.8];

    // front facade above the shop band
    fac.quad(P(-hw, front, 3.6), P(hw, front, 3.6), P(hw, front, y1), P(-hw, front, y1), wall,
      { hint: toRoad, uv: [uv(-hw, 3.6), uv(hw, 3.6), uv(hw, y1), uv(-hw, y1)] });
    // the two side walls (seen through alleys / at gaps)
    for (const sg of [-1, 1]) {
      const ls = sg * hw, d = (lat) => [Math.abs(lat - front) / 12 + u0, 0];
      fac.quad(P(ls, front, 0.4), P(ls, back, 0.4), P(ls, back, y1), P(ls, front, y1), shade(wall, 0.9),
        { hint: [sg * f.fx, 0, sg * f.fz], uv: [[d(front)[0], 0], [d(back)[0], 0], [d(back)[0], (y1 - 0.4) / 12.8], [d(front)[0], (y1 - 0.4) / 12.8]] });
    }
    // roof
    g.quad(P(-hw, front, y1), P(hw, front, y1), P(hw, back, y1), P(-hw, back, y1), hexToLinear(b.roof), { hint: UP });
    const rf = [f.fx, f.fz], rr = [f.rx, f.rz];
    const roofPt = (ls, lat) => [f.x + f.fx * ls + f.rx * lat, y1, f.z + f.fz * ls + f.rz * lat];
    if (r.chance(0.45)) g.box(roofPt(r.range(-hw / 2, hw / 2), front + side * b.depth * 0.6), rf, rr, 1.6, 1.4, 1.6, '#3f5566', { skipBottom: true });
    if (r.chance(0.25)) g.box(roofPt(r.range(-hw / 2, hw / 2), front + side * b.depth * 0.35), rf, rr, 3.0, 2.4, 3.0, shade(wall, 0.8), { skipBottom: true });
    if (r.chance(0.12) && b.w > 8) {                         // rooftop billboard
      const bl = front - side * 0.3, w2 = b.w * 0.8;
      g.quad(P(-w2 / 2, bl, y1 + 0.6), P(w2 / 2, bl, y1 + 0.6), P(w2 / 2, bl, y1 + 3.6), P(-w2 / 2, bl, y1 + 3.6), r.pick(pal.signs), { hint: toRoad });
      g.quad(P(-w2 / 2, bl + side * 0.05, y1 + 0.6), P(w2 / 2, bl + side * 0.05, y1 + 0.6), P(w2 / 2, bl + side * 0.05, y1 + 3.6), P(-w2 / 2, bl + side * 0.05, y1 + 3.6), '#4a4a4a', { hint: [-toRoad[0], 0, -toRoad[2]] });
    }

    // shopfronts at street level: shutters, signboards, awnings
    const shops = Math.max(1, Math.round(b.w / 3.6)), sw = b.w / shops, latF = front - side * 0.05;
    for (let j = 0; j < shops; j++) {
      const a0 = -hw + j * sw + 0.04, a1 = -hw + (j + 1) * sw - 0.04;
      g.quad(P(a0, latF, 0.18), P(a1, latF, 0.18), P(a1, latF, 3.0), P(a0, latF, 3.0), r.pick(pal.shutters), { hint: toRoad });
      g.quad(P(a0, latF, 3.0), P(a1, latF, 3.0), P(a1, latF, 3.6), P(a0, latF, 3.6), r.pick(pal.signs), { hint: toRoad });
      const aw = r.pick(pal.awnings), out = latF - side * 1.0;
      g.quad(P(a0, latF, 3.0), P(a1, latF, 3.0), P(a1, out, 2.5), P(a0, out, 2.5), aw, { hint: [toRoad[0] * 0.4, 1, toRoad[2] * 0.4] });
    }
  }
}

// ---- Landmarks (placeholders until real models exist) ----------------------------------------------
function landmarks(g, route, s0, s1) {
  const f = {};
  for (const lm of route.landmarks) {
    if (lm.kind !== 'fountain-circle') continue;
    const sc = route.length + lm.aheadOfEnd;
    if (sc < s0 || sc >= s1) continue;
    route.space.sample(sc, f);
    const R = lm.radius, N = 16, stone = hexToLinear('#a39a8b'), water = hexToLinear('#5d9fb0');
    const pt = (a, rad, y) => [f.x + f.fx * Math.cos(a) * rad + f.rx * Math.sin(a) * rad, y, f.z + f.fz * Math.cos(a) * rad + f.rz * Math.sin(a) * rad];
    for (let j = 0; j < N; j++) {
      const a = (j / N) * Math.PI * 2, a2 = ((j + 1) / N) * Math.PI * 2;
      const tan = [f.fx * -Math.sin(a) + f.rx * Math.cos(a), f.fz * -Math.sin(a) + f.rz * Math.cos(a)];
      const rad = [f.fx * Math.cos(a) + f.rx * Math.sin(a), f.fz * Math.cos(a) + f.rz * Math.sin(a)];
      const c = pt(a, R, 0);
      g.box([c[0], 0, c[2]], tan, rad, (2 * Math.PI * R / N) * 1.06, 0.9, 1.4, stone, { skipBottom: true });
      g.tri([f.x, 0.55, f.z], pt(a, R - 0.7, 0.55), pt(a2, R - 0.7, 0.55), water, UP);
    }
    const steel = hexToLinear('#9aa3ab'), ff = [f.fx, f.fz], rr = [f.rx, f.rz];
    g.box([f.x, 0.5, f.z], ff, rr, 1.4, lm.height - 0.5, 1.4, steel, { skipBottom: true });
    g.box([f.x, 3.6, f.z], ff, rr, 5.0, 0.35, 0.35, steel, { skipBottom: true });
    g.box([f.x, 6.4, f.z], ff, rr, 0.35, 0.35, 5.0, steel, { skipBottom: true });
  }
}
