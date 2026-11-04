// Shared body-part catalogue for every background person in the city (the hero has his
// own handcrafted rig). Pure (Three-free): arrays out of GeometryBuilder, converted to
// InstancedMeshes by CrowdRenderer. Part geometry origins sit at the JOINT that moves
// them, limbs hang down -Y, and the model faces +Z, matching the hero's conventions.
//
// The crowd renders in 9 draw calls: head(2 variants), torso, 4 limb pairs and the WRAP
// skirt (lungi / sari / salwar kameez - hidden for trouser wearers). Per-instance colour
// (shirt/trousers/skin/wrap) gives variety for free; hair is baked near-black so skin
// tinting reads as dark hair on every tone.
import { GeometryBuilder } from '../render/GeometryBuilder.js';

export const CROWD_PARTS = ['headA', 'headB', 'torso', 'upperArm', 'lowerArm', 'upperLeg', 'lowerLeg', 'skirt'];

/** Joint positions in person-local space (feet at y=0, facing +Z). */
export const CROWD_JOINTS = {
  neck: [0, 1.44, 0], hip: [0, 0.86, 0],
  shoulderL: [0.22, 1.40, 0], shoulderR: [-0.22, 1.40, 0],
  elbowL: [0.22, 1.10, 0], elbowR: [-0.22, 1.10, 0],
  hipL: [0.09, 0.86, 0], hipR: [-0.09, 0.86, 0],
  kneeL: [0.09, 0.44, 0], kneeR: [-0.09, 0.44, 0],
};

// Everyday Dhaka clothing (no brands): office shirts, panjabis, tees, lungi, sari colours.
// M5 concept regrade: brighter shirts + the lungi check colours (indigo/red/green/purple
// families) and saturated sari/kameez tones seen in the reference frames.
export const CROWD_PALETTES = {
  shirts: ['#e8e4da', '#8fb4d4', '#c9d8b8', '#d4b896', '#7d8a99', '#f2d8b8', '#b85c4a', '#5c7d6b', '#d8d4c8', '#a8b8c4', '#d97e2f', '#7d3ac1', '#c23b5a'],
  pants: ['#39404e', '#4a4238', '#6b6459', '#2c2c30', '#8a8272', '#3a5c8c', '#5c5448'],
  skins: ['#a87550', '#96683f', '#b8845c', '#8a5c38', '#c49a70'],
  sari: ['#c23b5a', '#d4692e', '#3a8c5c', '#7d3ac1', '#c9a23a', '#b03a68', '#2e7dab', '#d43a8c', '#2e9e8c'],
  kameez: ['#d4692e', '#2e9e8c', '#c23b7a', '#e0b23a', '#7d3ac1', '#c9403a', '#3a8c5c'],
  lungi: ['#2c4a7c', '#7c2c3a', '#2e7d4f', '#5c3a8c', '#3a6e6e', '#8c5a2c'],
};

const HAIR = '#1c1510', SHOE = '#26221e';

/** Head with short curly hair (most men). */
function buildHeadA(g) {
  g.box([0, 0.13, 0], [0, 1], [-1, 0], 0.20, 0.25, 0.20, '#f6f6f6');       // head (tinted = skin)
  g.box([0, 0.245, -0.015], [0, 1], [-1, 0], 0.21, 0.09, 0.21, HAIR);      // hair cap
  g.box([0, 0.15, -0.085], [0, 1], [-1, 0], 0.20, 0.16, 0.05, HAIR);       // hair back
}

/** Head with a bun/hair-braid mass (many women). */
function buildHeadB(g) {
  g.box([0, 0.13, 0], [0, 1], [-1, 0], 0.19, 0.25, 0.19, '#f6f6f6');
  g.box([0, 0.245, 0], [0, 1], [-1, 0], 0.21, 0.10, 0.22, HAIR);           // hair cap
  g.box([0, 0.20, -0.11], [0, 1], [-1, 0], 0.16, 0.18, 0.09, HAIR);        // bun
}

/** Torso: shirt (tinted) with a baked darker hem line. */
function buildTorso(g) {
  g.box([0, 0.28, 0], [0, 1], [-1, 0], 0.34, 0.56, 0.21, '#f6f6f6');
  g.box([0, 0.015, 0], [0, 1], [-1, 0], 0.345, 0.04, 0.215, '#3a3a38');    // hem/shadow
}

function buildUpperArm(g) {
  g.box([0, -0.15, 0], [0, 1], [-1, 0], 0.105, 0.30, 0.11, '#f6f6f6');     // sleeve (tinted)
}

function buildLowerArm(g) {
  g.box([0, -0.14, 0], [0, 1], [-1, 0], 0.088, 0.28, 0.092, '#f6f6f6');    // skin (tinted)
  g.box([0, -0.30, 0.005], [0, 1], [-1, 0], 0.085, 0.075, 0.09, '#e8e2da');// hand
}

function buildUpperLeg(g) {
  g.box([0, -0.21, 0], [0, 1], [-1, 0], 0.145, 0.42, 0.15, '#f6f6f6');     // trousers (tinted)
}

function buildLowerLeg(g) {
  g.box([0, -0.185, 0], [0, 1], [-1, 0], 0.125, 0.37, 0.13, '#f6f6f6');    // trousers (tinted)
  g.box([0, -0.395, 0.035], [0, 1], [-1, 0], 0.19, 0.075, 0.26, SHOE);     // shoe
}

/** Wrap skirt (lungi / sari / salwar-kameez skirt), hung from the hip joint.
 *  Baked as 4 stacked flare bands alternating bright/dark - the instance tint then
 *  produces the classic lungi two-tone stripe (and plain saris just tint brighter).
 *  Per-outfit length/flare comes from the instance matrix scale (CrowdRenderer). */
function buildSkirt(g) {
  const BANDS = 4, TOP = 0.17, HEM = 0.26, LEN = 0.78;
  for (let b = 0; b < BANDS; b++) {
    const y0 = -0.02 - (b / BANDS) * LEN, y1 = -0.02 - ((b + 1) / BANDS) * LEN;
    const w0 = TOP + (HEM - TOP) * (b / BANDS), w1 = TOP + (HEM - TOP) * ((b + 1) / BANDS);
    const col = b % 2 ? '#7a7a7a' : '#f6f6f6';
    // frustum ring: four slightly sloped quads
    g.quad([-w0, y0, -w0], [w0, y0, -w0], [w1, y1, -w1], [-w1, y1, -w1], col, { hint: [0, 0, -1] });
    g.quad([w0, y0, w0], [-w0, y0, w0], [-w1, y1, w1], [w1, y1, w1], col, { hint: [0, 0, 1] });
    g.quad([-w0, y0, w0], [-w0, y0, -w0], [-w1, y1, -w1], [-w1, y1, w1], col, { hint: [-1, 0, 0] });
    g.quad([w0, y0, -w0], [w0, y0, w0], [w1, y1, w1], [w1, y1, -w1], col, { hint: [1, 0, 0] });
  }
}

/** Build all crowd part geometries once. Returns { part: geometryData }. */
export function buildCrowdGeometries() {
  const builders = { headA: buildHeadA, headB: buildHeadB, torso: buildTorso,
    upperArm: buildUpperArm, lowerArm: buildLowerArm, upperLeg: buildUpperLeg, lowerLeg: buildLowerLeg,
    skirt: buildSkirt };
  const out = {};
  for (const part of CROWD_PARTS) {
    const g = new GeometryBuilder();
    builders[part](g);
    out[part] = g.finish();
  }
  return out;
}
