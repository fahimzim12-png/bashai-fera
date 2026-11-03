// Turns the route description into geometry for ONE 60 m chunk of street.
// Pure function of (route, chunkIndex): the same inputs always give the same street, which is what
// makes streaming safe (a chunk can be thrown away and rebuilt identically later).
//
// Output is three arrays-of-geometry:
//   ground : vertex-coloured things (road, footpaths, median, viaduct, poles, shops, roofs,
//            clothing stalls with hanging garments, street furniture...)
//   facade : building walls, textured with the window pattern
//   signs  : signboard quads UV-mapped into the shared text atlas (real Bengali/English text)
import { CONFIG } from '../core/Config.js';
import { Rng, hashString } from '../core/Rng.js';
import { lerp } from '../core/MathUtil.js';
import { GeometryBuilder, hexToLinear, shade } from '../render/GeometryBuilder.js';
import { clearsBuildings } from './landmarks/registry.js';
import { pickDesign, designUV, designSpanWidth } from './signCatalog.js';

const UP = [0, 1, 0];
const TARPS = ['#2f6ea8', '#c4552f', '#3fae6b'];
const UMBS = ['#d94f3f', '#3fa0d9', '#e2b23f', '#4fae6b'];
const CARTS = ['#2f6ea8', '#c4552f', '#555f68'];
const PLASTIC = ['#c94f3f', '#3f7dc9', '#3fae6b', '#e2b23f'];
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
  const signs = new GeometryBuilder({ uv: true });
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
  buildings(ground, facade, signs, route, s0, s1);
  stains(ground, route, s0, s1);
  clutter(ground, route, s0, s1);
  clothingStalls(ground, route, s0, s1);
  streetLife(ground, route, s0, s1);
  crossings(ground, route, s0, s1);
  wallACUnits(ground, route, s0, s1);

  return { ground: ground.finish(), facade: facade.finish(), signs: signs.finish(), ci, s0, s1 };
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
      // dressing.cables > 1 adds the chaotic extra tangle Dhaka is famous for
      const dr = route.segmentAt(sA).dressing || {};
      const extra = Math.max(0, Math.min(4, Math.round((dr.cables ?? 1) * 2) - 1));
      for (let j = 0; j < 3 + extra; j++) {
        const h1 = hashString(`wire:${side}:${k}:${j}`) / 4294967296;
        const h2 = hashString(`wirey:${side}:${k}:${j}`) / 4294967296;
        const off = j < 3 ? (j - 1) * 0.75 : (h1 - 0.5) * 2.6;
        const y = j < 3 ? 7.9 + j * 0.1 : 7.5 + h2 * 0.7;
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
function buildings(g, fac, sg, route, s0, s1) {
  const f = {};
  for (const b of route.buildings) {
    if (b.sMid < s0 || b.sMid >= s1) continue;
    if (route.landmarks.some((lm) => clearsBuildings(lm, b.side, b.sMid))) continue;   // landmark owns this plot
    const r = new Rng(b.seed);
    const pal = route.palettes[b.palette];
    const dr = route.segmentAt(b.sMid).dressing || {};
    route.space.sample(b.sMid, f);
    const prof = route.profileAt(b.sMid);
    const side = b.side;
    const front = side < 0 ? prof.frontageL : prof.frontageR;
    const P = (ls, lat, y) => [f.x + f.fx * ls + f.rx * lat, y, f.z + f.fz * ls + f.rz * lat];
    const toRoad = [-side * f.rx, 0, -side * f.rz];
    const hw = b.w / 2, back = front + side * b.depth;
    const y1 = b.h;
    const wall = shade(hexToLinear(b.wall), 0.94 + r.next() * 0.1);
    const u0 = r.int(0, 7) / 8;
    const uv = (ls, y) => [(ls + hw) / 24 + u0, (y - 0.4) / 25.6];

    // front facade above the shop band
    fac.quad(P(-hw, front, 3.6), P(hw, front, 3.6), P(hw, front, y1), P(-hw, front, y1), wall,
      { hint: toRoad, uv: [uv(-hw, 3.6), uv(hw, 3.6), uv(hw, y1), uv(-hw, y1)] });
    // the two side walls (seen through alleys / at gaps)
    for (const sg of [-1, 1]) {
      const ls = sg * hw, d = (lat) => [Math.abs(lat - front) / 24 + u0, 0];
      fac.quad(P(ls, front, 0.4), P(ls, back, 0.4), P(ls, back, y1), P(ls, front, y1), shade(wall, 0.9),
        { hint: [sg * f.fx, 0, sg * f.fz], uv: [[d(front)[0], 0], [d(back)[0], 0], [d(back)[0], (y1 - 0.4) / 25.6], [d(front)[0], (y1 - 0.4) / 25.6]] });
    }
    // roof
    g.quad(P(-hw, front, y1), P(hw, front, y1), P(hw, back, y1), P(-hw, back, y1), hexToLinear(b.roof), { hint: UP });
    const rf = [f.fx, f.fz], rr = [f.rx, f.rz];
    const roofPt = (ls, lat) => [f.x + f.fx * ls + f.rx * lat, y1, f.z + f.fz * ls + f.rz * lat];
    if (r.chance(0.45)) g.box(roofPt(r.range(-hw / 2, hw / 2), front + side * b.depth * 0.6), rf, rr, 1.6, 1.4, 1.6, '#3f5566', { skipBottom: true });
    if (r.chance(0.25)) g.box(roofPt(r.range(-hw / 2, hw / 2), front + side * b.depth * 0.35), rf, rr, 3.0, 2.4, 3.0, shade(wall, 0.8), { skipBottom: true });
    if (r.chance(0.03 + 0.2 * Math.min(1.5, dr.billboards ?? 0.3)) && b.w > 8) {     // rooftop billboard (density by district)
      const bl = front - side * 0.3;
      const di = pickDesign(`${route.id}:bb:${side}:${b.sMid.toFixed(1)}`, 'ad', 2);
      const du = designUV(di), w2 = designSpanWidth(di);
      const by0 = y1 + 0.9, by1 = y1 + 2.1;
      sg.quad(P(-w2 / 2, bl, by0), P(w2 / 2, bl, by0), P(w2 / 2, bl, by1), P(-w2 / 2, bl, by1), '#ffffff',
        { hint: toRoad, uv: [[du[0], du[1]], [du[2], du[1]], [du[2], du[3]], [du[0], du[3]]] });
      g.quad(P(-w2 / 2, bl + side * 0.05, by0), P(w2 / 2, bl + side * 0.05, by0), P(w2 / 2, bl + side * 0.05, by1), P(-w2 / 2, bl + side * 0.05, by1), '#4a4a4a', { hint: [-toRoad[0], 0, -toRoad[2]] });
      for (const px of [-w2 / 2 + 0.35, w2 / 2 - 0.35]) {
        g.box(P(px, front - side * 0.5, y1), rf, rr, 0.14, 0.95, 0.14, '#5c5c5c', { skipBottom: true });
      }
    }

    // building name board above the shop band (some mid-size buildings have one)
    if (b.w > 8 && r.chance(0.3)) {
      const di = pickDesign(`${route.id}:bn:${side}:${b.sMid.toFixed(1)}`, 'building', 2);
      const du = designUV(di), w2 = designSpanWidth(di);
      const latS = front - side * 0.04;
      sg.quad(P(-w2 / 2, latS, 3.72), P(w2 / 2, latS, 3.72), P(w2 / 2, latS, 4.26), P(-w2 / 2, latS, 4.26), '#ffffff',
        { hint: toRoad, uv: [[du[0], du[1]], [du[2], du[1]], [du[2], du[3]], [du[0], du[3]]] });
    }

    // shopfronts at street level: shutters, signboards with script suggestion, awnings
    const shops = Math.max(1, Math.round(b.w / 3.6)), sw = b.w / shops, latF = front - side * 0.05;
    for (let j = 0; j < shops; j++) {
      const a0 = -hw + j * sw + 0.04, a1 = -hw + (j + 1) * sw - 0.04;
      if (r.chance(0.28)) {
        // open shop: dark interior with a hint of goods inside
        g.quad(P(a0, latF, 0.18), P(a1, latF, 0.18), P(a1, latF, 3.0), P(a0, latF, 3.0), '#221f1b', { hint: toRoad });
        g.quad(P(a0 + sw * 0.2, latF - side * 0.012, 0.5), P(a0 + sw * 0.5, latF - side * 0.012, 0.5), P(a0 + sw * 0.5, latF - side * 0.012, 1.5), P(a0 + sw * 0.2, latF - side * 0.012, 1.5), r.pick(pal.awnings), { hint: toRoad });
      } else {
        g.quad(P(a0, latF, 0.18), P(a1, latF, 0.18), P(a1, latF, 3.0), P(a0, latF, 3.0), r.pick(pal.shutters), { hint: toRoad });
      }
      // signboard: coloured backing band + a REAL readable sign quad from the text atlas
      const sign = r.pick(pal.signs), signCol = hexToLinear(sign);
      const latS = latF - side * 0.012;
      g.quad(P(a0, latF, 3.0), P(a1, latF, 3.0), P(a1, latF, 3.6), P(a0, latF, 3.6), signCol, { hint: toRoad });
      const di = pickDesign(`${route.id}:sign:${side}:${b.sMid.toFixed(1)}:${j}`, r.chance(0.15) ? 'ad' : 'shop', 1);
      const du = designUV(di), wS = designSpanWidth(di);
      const cx = (a0 + a1) / 2, s0u = Math.max(a0 + 0.04, cx - wS / 2), s1u = Math.min(a1 - 0.04, cx + wS / 2);
      sg.quad(P(s0u, latS, 3.03), P(s1u, latS, 3.03), P(s1u, latS, 3.57), P(s0u, latS, 3.57), '#ffffff',
        { hint: toRoad, uv: [[du[0], du[1]], [du[2], du[1]], [du[2], du[3]], [du[0], du[3]]] });
      const aw = r.pick(pal.awnings), out = latF - side * 1.0;
      if (r.chance(0.3)) {
        // two-tone striped awning
        const mid = (a0 + a1) / 2, aw2 = shade(hexToLinear(aw), 0.55);
        g.quad(P(a0, latF, 3.0), P(mid, latF, 3.0), P(mid, out, 2.5), P(a0, out, 2.5), aw, { hint: [toRoad[0] * 0.4, 1, toRoad[2] * 0.4] });
        g.quad(P(mid, latF, 3.0), P(a1, latF, 3.0), P(a1, out, 2.5), P(mid, out, 2.5), aw2, { hint: [toRoad[0] * 0.4, 1, toRoad[2] * 0.4] });
      } else {
        g.quad(P(a0, latF, 3.0), P(a1, latF, 3.0), P(a1, out, 2.5), P(a0, out, 2.5), aw, { hint: [toRoad[0] * 0.4, 1, toRoad[2] * 0.4] });
      }
    }
  }
}

// ---- Street clutter: tea stalls, vendor umbrellas, crate stacks -------------------------------------
// ALWAYS on the far (right) footpath - the player walks the left one, so nothing here ever
// reads as an obstacle. Density comes from dressing.stalls (Farmgate + Karwan Bazar are busy).
function clutter(g, route, s0, s1) {
  const f = {};
  for (let k = Math.floor(s0 / 9); k * 9 < s1; k++) {
    const s = k * 9 + (hashString(`clut:${k}`) / 4294967296) * 6;
    if (s < s0 || s >= s1) continue;
    const dr = route.segmentAt(s).dressing || {};
    if (hashString(`clutc:${k}`) / 4294967296 > (dr.stalls ?? 0.2) * 0.6) continue;
    route.space.sample(s, f);
    const fp = route.profileAt(s).elements.filter((e) => e.kind === 'footpath');
    const right = fp[fp.length - 1];
    if (!right) continue;
    const lat = right.x1 - 0.8;
    const P = (ls, lt, y) => [f.x + f.fx * ls + f.rx * lt, y, f.z + f.fz * ls + f.rz * lt];
    const ff = [f.fx, f.fz], rr = [f.rx, f.rz];
    const kind = hashString(`clutk:${k}`) / 4294967296;
    if (kind < 0.45) {
      // tea stall: tin box with a tarpaulin awning and a warm interior glow quad
      const tin = hexToLinear('#5a6168');
      g.box(P(0, lat, 0), ff, rr, 1.8, 2.0, 1.3, tin, { skipBottom: true });
      g.box(P(0, lat - 0.66, 0.15), ff, rr, 1.6, 0.5, 0.06, hexToLinear('#2a2d31'), { skipBottom: true, top: hexToLinear('#ffd9a0') });
      g.box(P(0, lat + 1.05, 2.0), ff, rr, 2.2, 0.06, 1.4, hashString(`clutt:${k}`) / 4294967296 > 0.5 ? hexToLinear('#2f6ea8') : hexToLinear('#c4552f'), { skipBottom: true });
    } else if (kind < 0.7) {
      // vendor umbrella: bamboo pole + 6-segment cloth cone
      const col = hexToLinear(UMBS[((k % 4) + 4) % 4]);
      g.box(P(0, lat, 0), ff, rr, 0.07, 2.2, 0.07, hexToLinear('#b8a25c'), { skipBottom: true });
      const tip = P(0, lat, 2.35), R = 1.15;
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2, a2 = ((j + 1) / 6) * Math.PI * 2;
        g.tri(tip, P(Math.sin(a) * R, lat + Math.cos(a) * R, 2.15), P(Math.sin(a2) * R, lat + Math.cos(a2) * R, 2.15), j % 2 ? col : shade(col, 0.82), [0, 1, 0]);
      }
      g.box(P(0.2, lat, 0.5), ff, rr, 0.9, 0.55, 0.7, shade(hexToLinear('#8a7f70'), 0.9), { skipBottom: true });  // goods cart
    } else {
      // crate + basket stack against the fence line
      const crate = hexToLinear('#8a6b42'), basket = hexToLinear('#a8894f');
      for (let j = 0; j < 3; j++) {
        const off = (hashString(`clutb:${k}:${j}`) / 4294967296 - 0.5) * 0.8;
        g.box(P(off * 0.4, lat + off, j * 0.42), ff, rr, 0.62, 0.4, 0.62, j % 2 ? crate : basket, { skipBottom: true });
      }
    }
  }
}

// ---- Ground wear: oil stains and damp patches, density by district ---------------------------------
function stains(g, route, s0, s1) {
  const f = {};
  for (let k = Math.floor(s0 / 7); k * 7 < s1; k++) {
    const s = k * 7 + (hashString(`stain:${k}`) / 4294967296) * 5;
    if (s < s0 || s >= s1) continue;
    const dr = route.segmentAt(s).dressing || {};
    if (!((dr.stains ?? 0.08) > 0.15)) continue;
    const h1 = hashString(`stainx:${k}`) / 4294967296, h2 = hashString(`stainr:${k}`) / 4294967296;
    route.space.sample(s, f);
    const road = route.profileAt(s).elements.find((e) => e.kind === 'road' && e.x0 < 0);
    if (!road) continue;
    const lat = lerp(road.x0 + 0.8, road.x1 - 0.8, h1);
    const r = 0.7 + h2 * 1.6;
    const c = shade(hexToLinear(road.color), 0.76);
    g.quad(W(f, lat - r, 0.012), W(f, lat + r * 0.55, 0.012), W(f, lat + r, 0.012), W(f, lat - r * 0.45, 0.012), c, { hint: UP });
  }
}

// ---- Clothing commerce: racks with hanging garments + wall displays ---------------------------------
// The signature Dhaka look. Racks go ONLY on the far (right) footpath; wall displays hang
// flush against building fronts on either side, so the player's walkable strip stays clear.
const GARMENTS = ['#c23b5a', '#2e7dab', '#3a8c5c', '#c9a23a', '#7d3ac1', '#d4692e', '#b03a68', '#e8e4da', '#5c7d6b', '#31435c'];

function clothingStalls(g, route, s0, s1) {
  const f = {};
  for (let k = Math.floor(s0 / 7); k * 7 < s1; k++) {
    const s = k * 7 + (hashString(`cloth:${k}`) / 4294967296) * 4;
    if (s < s0 || s >= s1) continue;
    const dr = route.segmentAt(s).dressing || {};
    if (hashString(`clothc:${k}`) / 4294967296 > (dr.cloth ?? 0.3) * 0.55) continue;
    route.space.sample(s, f);
    const fp = route.profileAt(s).elements.filter((e) => e.kind === 'footpath');
    const right = fp[fp.length - 1];
    if (!right) continue;
    const lat = right.x1 - 1.5 - (hashString(`clothl:${k}`) / 4294967296) * 0.8;
    const P = (ls, lt, y) => [f.x + f.fx * ls + f.rx * lt, y, f.z + f.fz * ls + f.rz * lt];
    const ff = [f.fx, f.fz], rr = [f.rx, f.rz];
    const frame = hexToLinear('#6b6459');

    if (hashString(`clothk:${k}`) / 4294967296 < 0.62) {
      // A-frame rack with a bar of hanging garments (shirts / kameez / panjabi)
      g.box(P(0, lat - 0.9, 0), ff, rr, 0.07, 1.65, 0.07, frame, { skipBottom: true });
      g.box(P(0, lat + 0.9, 0), ff, rr, 0.07, 1.65, 0.07, frame, { skipBottom: true });
      g.box(P(0, lat, 1.6), ff, rr, 2.0, 0.05, 0.05, frame, { skipBottom: true });
      const n = 5 + (hashString(`clothn:${k}`) / 4294967296) * 4 | 0;
      for (let j = 0; j < n; j++) {
        const gx = -0.85 + (j + 0.5) * (1.7 / n);
        const col = hexToLinear(GARMENTS[(hashString(`clothg:${k}:${j}`) >>> 0) % GARMENTS.length]);
        const sway = ((hashString(`cloths:${k}:${j}`) / 4294967296) - 0.5) * 0.1;
        g.quad(P(gx - 0.19, lat + sway, 1.0), P(gx + 0.19, lat + sway, 1.0),
          P(gx + 0.23, lat - sway * 0.4, 0.38), P(gx - 0.23, lat - sway * 0.4, 0.38),
          col, { hint: [f.fx * 0.2, 1, f.fz * 0.2], double: true });           // garment
        g.box(P(gx, lat + sway, 1.56), ff, rr, 0.02, 0.12, 0.02, '#3a3a3a', { skipBottom: true });  // hanger
      }
      // folded stacks on the rack foot board
      for (let j = 0; j < 2; j++) {
        const fx2 = -0.55 + j * 1.1;
        const col = hexToLinear(GARMENTS[(hashString(`clothf:${k}:${j}`) >>> 0) % GARMENTS.length]);
        g.box(P(fx2, lat + 0.45, 0.16), ff, rr, 0.42, 0.30, 0.34, col, { skipBottom: true, top: shade(col, 1.12) });
      }
    } else {
      // makeshift roadside stall: bamboo frame + garments on lines, tarp roof
      const tarp = hexToLinear(TARPS[((k % 3) + 3) % 3]);
      for (const px of [-1.1, 1.1]) g.box(P(px, lat, 0), ff, rr, 0.06, 2.1, 0.06, hexToLinear('#b8a25c'), { skipBottom: true });
      g.box(P(0, lat, 2.15), ff, rr, 2.5, 0.05, 1.4, tarp, { skipBottom: true });
      for (let line = 0; line < 2; line++) {
        const ly = 1.75 - line * 0.5, loff = lat - 0.45 + line * 0.9;
        g.box(P(0, loff, ly), ff, rr, 2.2, 0.02, 0.02, '#8a8a8a', { skipBottom: true });
        for (let j = 0; j < 4; j++) {
          const gx = -0.85 + j * 0.55;
          const col = hexToLinear(GARMENTS[(hashString(`clothw:${k}:${line}:${j}`) >>> 0) % GARMENTS.length]);
          g.quad(P(gx - 0.17, loff, ly - 0.06), P(gx + 0.17, loff, ly - 0.06),
            P(gx + 0.20, loff, ly - 0.62), P(gx - 0.20, loff, ly - 0.62),
            col, { hint: [0, 1, 0.2], double: true });
        }
      }
    }
  }

  // wall displays: garments hanging flush on building fronts above head height
  for (let k = Math.floor(s0 / 11); k * 11 < s1; k++) {
    const s = k * 11 + (hashString(`wdsp:${k}`) / 4294967296) * 6;
    if (s < s0 || s >= s1) continue;
    const dr = route.segmentAt(s).dressing || {};
    if (hashString(`wdspc:${k}`) / 4294967296 > (dr.cloth ?? 0.3) * 0.4) continue;
    const b = route.buildings.find((bb) => Math.abs(bb.sMid - s) < bb.w / 2);
    if (!b || route.landmarks.some((lm) => clearsBuildings(lm, b.side, b.sMid))) continue;
    route.space.sample(s, f);
    const prof = route.profileAt(s);
    const front = b.side < 0 ? prof.frontageL : prof.frontageR;
    const P = (ls, lt, y) => [f.x + f.fx * ls + f.rx * lt, y, f.z + f.fz * ls + f.rz * lt];
    const latW = front - b.side * 0.05;
    const n = 3 + (hashString(`wdspn:${k}`) % 3);
    for (let j = 0; j < n; j++) {
      const col = hexToLinear(GARMENTS[(hashString(`wdspg:${k}:${j}`) >>> 0) % GARMENTS.length]);
      const gy = 2.9 - j * 0.62;
      g.quad(P(-0.22, latW, gy - 0.58), P(0.22, latW, gy - 0.58), P(0.22, latW, gy), P(-0.22, latW, gy),
        col, { hint: [-b.side * f.rx, 0, -b.side * f.rz], double: true });
      g.box(P(0, latW, gy + 0.02), [f.fx, f.fz], [f.rx, f.rz], 0.4, 0.03, 0.03, '#3a3a3a', { skipBottom: true });
    }
  }
}

// ---- Street life: plastic chairs + tables, food carts, fruit baskets --------------------------------
function streetLife(g, route, s0, s1) {
  const f = {};
  for (let k = Math.floor(s0 / 13); k * 13 < s1; k++) {
    const s = k * 13 + (hashString(`life:${k}`) / 4294967296) * 7;
    if (s < s0 || s >= s1) continue;
    route.space.sample(s, f);
    const fp = route.profileAt(s).elements.filter((e) => e.kind === 'footpath');
    const right = fp[fp.length - 1];
    if (!right) continue;
    const lat = right.x1 - 1.2 - (hashString(`lifel:${k}`) / 4294967296) * 1.2;
    const P = (ls, lt, y) => [f.x + f.fx * ls + f.rx * lt, y, f.z + f.fz * ls + f.rz * lt];
    const ff = [f.fx, f.fz], rr = [f.rx, f.rz];
    const kind = hashString(`lifek:${k}`) / 4294967296;
    const plastic = hexToLinear(PLASTIC[((k % 4) + 4) % 4]);
    if (kind < 0.4) {
      // tea-stall seating: 2 plastic chairs + a small table
      for (const cx of [-0.7, 0.7]) {
        g.box(P(cx, lat, 0.40), ff, rr, 0.45, 0.05, 0.45, plastic, { skipBottom: true });
        g.box(P(cx, lat - 0.20, 0.68), ff, rr, 0.45, 0.30, 0.05, plastic, { skipBottom: true });
        g.box(P(cx, lat, 0.02), ff, rr, 0.40, 0.36, 0.40, shade(plastic, 0.7), { skipBottom: true });
      }
      g.box(P(0, lat + 0.75, 0.36), ff, rr, 0.55, 0.04, 0.55, shade(plastic, 0.85), { skipBottom: true });
      g.box(P(0, lat + 0.75, 0.16), ff, rr, 0.08, 0.30, 0.08, '#4a4a4a', { skipBottom: true });
    } else if (kind < 0.7) {
      // food cart: cabinet on wheels with a glass display and a handle
      const cart = hexToLinear(CARTS[((k % 3) + 3) % 3]);
      g.box(P(0, lat, 0.55), ff, rr, 1.25, 0.75, 0.75, cart, { skipBottom: true });
      g.box(P(0, lat + 0.35, 0.95), ff, rr, 1.0, 0.5, 0.06, hexToLinear('#2a3d4d'), { skipBottom: true, top: shade(cart, 1.1) });   // glass back
      g.box(P(0, lat + 0.35, 0.9), ff, rr, 0.9, 0.06, 0.7, hexToLinear('#e8dcc8'), { skipBottom: true });   // counter
      g.box(P(0, lat + 0.62, 1.28), ff, rr, 1.25, 0.05, 0.05, '#8a8a8a', { skipBottom: true });             // handle rail
      wheel2(g, P(-0.5, lat + 0.3, 0.32), ff, rr);
      wheel2(g, P(0.5, lat + 0.3, 0.32), ff, rr);
    } else {
      // fruit / vegetable baskets and crates
      const fruit = [hexToLinear('#e2793a'), hexToLinear('#c93a3a'), hexToLinear('#7db83a'), hexToLinear('#c9a23a')];
      for (let j = 0; j < 4; j++) {
        const bx = (hashString(`lifeb:${k}:${j}`) / 4294967296 - 0.5) * 1.6;
        const bz = (hashString(`lifec:${k}:${j}`) / 4294967296) * 0.7;
        const col = fruit[(hashString(`lifed:${k}:${j}`) >>> 0) % fruit.length];
        const yy = j % 2 ? 0.34 : 0.02;
        g.box(P(bx, lat + bz, yy), ff, rr, 0.5, 0.28, 0.5, shade(col, 0.55), { skipBottom: true, top: col });
      }
    }
  }
}

/** Small cart wheel (two tri-fans), reused by the food cart. */
function wheel2(g, base, ff, rr) {
  const dark = hexToLinear('#1c1e22');
  const c = [base[0], base[1] + 0.16, base[2]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, a2 = ((i + 1) / 6) * Math.PI * 2;
    g.tri([c[0] + rr[0] * 0.02, c[1], c[2] + rr[1] * 0.02],
      [c[0] + Math.sin(a) * ff[0] * 0.16 + rr[0] * 0.02, c[1] + Math.cos(a) * 0.16, c[2] + Math.sin(a) * ff[1] * 0.16 + rr[1] * 0.02],
      [c[0] + Math.sin(a2) * ff[0] * 0.16 + rr[0] * 0.02, c[1] + Math.cos(a2) * 0.16, c[2] + Math.sin(a2) * ff[1] * 0.16 + rr[1] * 0.02],
      dark, [rr[0], 0, rr[1]]);
    g.tri([c[0] - rr[0] * 0.02, c[1], c[2] - rr[1] * 0.02],
      [c[0] + Math.sin(a) * ff[0] * 0.16 - rr[0] * 0.02, c[1] + Math.cos(a) * 0.16, c[2] + Math.sin(a) * ff[1] * 0.16 - rr[1] * 0.02],
      [c[0] + Math.sin(a2) * ff[0] * 0.16 - rr[0] * 0.02, c[1] + Math.cos(a2) * 0.16, c[2] + Math.sin(a2) * ff[1] * 0.16 - rr[1] * 0.02],
      dark, [-rr[0], 0, -rr[1]]);
  }
}

// ---- Zebra crossings + wall-mounted AC units (M3.5 district polish) -----------------------------
// Crossings sit at the footbridge (people funnel to its stairs) and at the fountain plaza,
// taken from the route's own landmark positions, so they stay correct if the route moves.
function crossings(g, route, s0, s1) {
  const f = {};
  const spots = [];
  for (const lm of route.landmarks) {
    if (lm.kind === 'farmgate-footbridge') spots.push(lm.s);
  }
  spots.push(route.length - 12);
  for (const cs of spots) {
    if (cs + 2.4 < s0 || cs - 2.4 >= s1) continue;
    route.space.sample(cs, f);
    const prof = route.profileAt(cs);
    const white = hexToLinear('#d8d5cc');
    for (const el of prof.elements) {
      if (el.kind !== 'road') continue;
      for (let lat = el.x0 + 0.5; lat < el.x1 - 0.3; lat += 0.95) {
        g.quad(W(f, lat, 0.012), W(f, lat + 0.55, 0.012), W(f, lat + 0.55, 0.026), W(f, lat, 0.026), white, { hint: UP });
      }
    }
  }
}

function wallACUnits(g, route, s0, s1) {
  const f = {};
  for (const b of route.buildings) {
    if (b.sMid < s0 || b.sMid >= s1) continue;
    if (route.landmarks.some((lm) => clearsBuildings(lm, b.side, b.sMid))) continue;
    const n = hashString(`ac:${route.id}:${b.sMid.toFixed(1)}:${b.side}`) % 4;   // 0..3 units
    if (!n) continue;
    route.space.sample(b.sMid, f);
    const prof = route.profileAt(b.sMid);
    const front = b.side < 0 ? prof.frontageL : prof.frontageR;
    const latW = front - b.side * 0.18;
    const P = (ls, lt, y) => [f.x + f.fx * ls + f.rx * lt, y, f.z + f.fz * ls + f.rz * lt];
    const ff = [f.fx, f.fz], rr = [f.rx, f.rz];
    const body = hexToLinear('#c9cdc9'), dark = hexToLinear('#3a3f44');
    for (let j = 0; j < n; j++) {
      const ax = (hashString(`acx:${route.id}:${b.sMid.toFixed(1)}:${j}`) / 4294967296 - 0.5) * (b.w - 1.5);
      const ay = 4.6 + (hashString(`acy:${route.id}:${b.sMid.toFixed(1)}:${j}`) / 4294967296) * Math.min(9, b.h - 6);
      if (ay > b.h - 0.6) continue;
      g.box(P(ax, latW, ay), ff, rr, 0.68, 0.5, 0.34, body, { skipBottom: true, top: dark });
      g.box(P(ax, latW - b.side * 0.09, ay + 0.06), ff, rr, 0.56, 0.34, 0.03, dark, { skipBottom: true });
      // drip stain under the unit
      g.quad(P(ax - 0.2, front - b.side * 0.01, 0.5), P(ax + 0.2, front - b.side * 0.01, 0.5),
        P(ax + 0.26, front - b.side * 0.01, ay - 0.25), P(ax - 0.26, front - b.side * 0.01, ay - 0.25),
        shade(hexToLinear('#8a8578'), 0.85), { hint: [-b.side * f.rx, 0, -b.side * f.rz] });
    }
  }
}
