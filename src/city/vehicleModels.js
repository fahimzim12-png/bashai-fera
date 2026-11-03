// Pure (Three-free) low-poly geometry for every Dhaka vehicle type, built with the same
// GeometryBuilder used for chunks. Each type becomes ONE merged part set so the whole
// traffic system costs one draw call per type via InstancedMesh.
//
// Local model space: origin on the ground under the vehicle centre, forward = +Z
// (direction of travel), driver's right = -X (Bangladesh: left-hand traffic, drivers
// sit on the right). Large paint areas use near-white vertex colours so instanceColor
// (per-vehicle tint) shows through; glass/wheels/lights are baked dark/bright.
import { GeometryBuilder, hexToLinear } from '../render/GeometryBuilder.js';

const PAINT = '#f2f2f0', GLASS = '#1c222b', TYRE = '#141519', TRIM = '#c9ccce';
const LIGHT_F = '#fff0c2', LIGHT_R = '#d63a2f';

/** 8-sided wheel (octagon prism), axle along X, centred at (cx, r, cz). */
function wheel(g, cx, cz, r, halfW, colour = TYRE) {
  const SEG = 8;
  const ring = (x) => {
    const pts = [];
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      pts.push([cx + (i % 2 ? 1 : 0.82) * x, r + Math.sin(a) * r, cz + Math.cos(a) * r]);
    }
    return pts;
  };
  const L = ring(-halfW), R = ring(halfW);
  for (let i = 0; i < SEG; i++) {
    const j = (i + 1) % SEG;
    g.quad(L[i], L[j], R[j], R[i], colour, { hint: [1, 0, 0] });
    g.tri([-1e-4 + cx, r, cz], R[i], R[j], colour, { hint: [1, 0, 0] });   // hub caps
    g.tri([1e-4 + cx, r, cz], L[i], L[j], colour, { hint: [-1, 0, 0] });
  }
}

function box(g, x, y0, z, sx, sy, sz, colour, opts = {}) {
  g.box([x, y0, z], [0, 1], [-1, 0], sz, sy, sx, colour, opts);
}

/** Hatchback / sedan. */
function buildCar(g) {
  box(g, 0, 0.28, 0, 1.68, 0.62, 4.25, PAINT);                    // lower body
  box(g, 0, 0.9, -0.15, 1.55, 0.55, 2.5, PAINT);                  // cabin
  box(g, 0, 1.06, -0.15, 1.5, 0.34, 2.2, GLASS);                  // glass band
  box(g, 0, 0.9, -1.4, 1.45, 0.06, 0.02, GLASS);                  // windscreen
  box(g, 0, 0.26, 2.14, 1.6, 0.14, 0.06, TRIM); box(g, 0, 0.26, -2.14, 1.6, 0.14, 0.06, TRIM);
  box(g, -0.55, 0.52, 2.12, 0.36, 0.12, 0.04, LIGHT_F); box(g, 0.55, 0.52, 2.12, 0.36, 0.12, 0.04, LIGHT_F);
  box(g, -0.55, 0.52, -2.12, 0.36, 0.12, 0.04, LIGHT_R); box(g, 0.55, 0.52, -2.12, 0.36, 0.12, 0.04, LIGHT_R);
  for (const x of [-0.82, 0.82]) for (const z of [-1.35, 1.35]) wheel(g, x, z, 0.31, 0.09);
}

/** Local bus - tall body, big window band, roof rack hint. */
function buildBus(g) {
  box(g, 0, 0.55, 0, 2.45, 2.0, 10.4, PAINT);
  box(g, 0, 1.5, 0.1, 2.48, 0.85, 9.6, GLASS);                    // window band
  box(g, 0, 2.55, 0, 2.3, 0.12, 10.0, TRIM);                      // roof
  box(g, 0, 2.67, -1.2, 2.0, 0.16, 6.5, TRIM);                    // roof rack
  box(g, 0, 1.9, 5.18, 2.3, 0.5, 0.06, GLASS);                    // windscreen
  box(g, -0.9, 0.8, 5.2, 0.4, 0.16, 0.05, LIGHT_F); box(g, 0.9, 0.8, 5.2, 0.4, 0.16, 0.05, LIGHT_F);
  box(g, -0.9, 0.8, -5.2, 0.4, 0.16, 0.05, LIGHT_R); box(g, 0.9, 0.8, -5.2, 0.4, 0.16, 0.05, LIGHT_R);
  for (const x of [-1.15, 1.15]) for (const z of [-3.6, -1.2, 3.4]) wheel(g, x, z, 0.46, 0.12);
}

/** Microbus. */
function buildMicrobus(g) {
  box(g, 0, 0.34, 0, 1.88, 1.3, 5.2, PAINT);
  box(g, 0, 1.28, -0.3, 1.9, 0.62, 4.6, GLASS);
  box(g, 0, 1.62, 0, 1.86, 0.1, 5.0, TRIM);
  box(g, 0, 1.0, 2.58, 1.8, 0.5, 0.05, GLASS);
  box(g, -0.7, 0.55, 2.6, 0.34, 0.13, 0.04, LIGHT_F); box(g, 0.7, 0.55, 2.6, 0.34, 0.13, 0.04, LIGHT_F);
  box(g, -0.7, 0.55, -2.6, 0.34, 0.13, 0.04, LIGHT_R); box(g, 0.7, 0.55, -2.6, 0.34, 0.13, 0.04, LIGHT_R);
  for (const x of [-0.92, 0.92]) for (const z of [-1.7, 1.7]) wheel(g, x, z, 0.34, 0.1);
}

/** CNG auto-rickshaw: green body, yellow roof, open sides - the icon of Dhaka. */
function buildCng(g) {
  const BODY = '#f6f6f2', ROOF = '#f2d43a';
  box(g, 0, 0.3, -0.1, 1.34, 0.85, 2.7, BODY);                    // body tub
  box(g, 0, 1.15, -0.25, 1.3, 0.6, 2.1, GLASS);                   // cabin glass
  box(g, 0, 1.5, -0.1, 1.36, 0.14, 2.4, ROOF);                    // yellow roof
  box(g, 0, 1.15, 1.0, 1.2, 0.62, 0.05, GLASS);                   // windscreen
  box(g, -0.68, 1.2, -0.4, 0.06, 0.55, 1.6, TYRE);                // side frames
  box(g, 0.68, 1.2, -0.4, 0.06, 0.55, 1.6, TYRE);
  box(g, -0.5, 0.55, 1.32, 0.3, 0.14, 0.05, LIGHT_F);             // single headlamp area
  box(g, -0.28, 0.45, -1.38, 0.2, 0.1, 0.04, LIGHT_R);
  for (const x of [-0.62, 0.62]) wheel(g, x, -0.85, 0.3, 0.09);   // rear pair
  wheel(g, 0, 1.18, 0.28, 0.08);                                  // front single
}

/** Cycle rickshaw with folded-hood canopy + baked puller. */
function buildRickshaw(g) {
  box(g, 0, 0.62, -0.75, 0.9, 0.06, 1.5, PAINT);                  // chassis
  box(g, 0, 0.68, -1.05, 0.82, 0.5, 0.5, PAINT, { top: '#c9b8a0' });  // seat
  // arched hood (folded look) over the seat
  const HOOD = '#f6f6f2';
  for (let i = 0; i < 4; i++) {
    const z = -1.32 + i * 0.22, h = 1.86 - Math.abs(i - 1.2) * 0.13;
    box(g, 0, h, z, 0.92, 0.05, 0.24, HOOD);
    box(g, -0.45, 0.68, z, 0.04, h - 0.68, 0.2, PAINT);           // hood posts
    box(g, 0.45, 0.68, z, 0.04, h - 0.68, 0.2, PAINT);
  }
  box(g, -0.5, 0.62, 0.55, 0.05, 0.75, 1.3, PAINT);               // puller frame rails
  box(g, 0.5, 0.62, 0.55, 0.05, 0.75, 1.3, PAINT);
  box(g, 0, 0.9, 1.15, 0.5, 0.06, 0.06, TRIM);                    // handlebar
  // puller (tint darkens him slightly - acceptable shading)
  box(g, -0.32, 0.95, 0.82, 0.34, 0.42, 0.22, '#3d4c63');         // torso leaning forward
  box(g, -0.32, 1.4, 0.9, 0.17, 0.17, 0.16, '#a87550');           // head
  box(g, -0.32, 1.55, 0.88, 0.16, 0.05, 0.14, '#17110c');         // hair
  box(g, -0.24, 1.06, 1.12, 0.09, 0.34, 0.09, '#a87550');         // arms to handlebar
  box(g, -0.4, 1.06, 1.12, 0.09, 0.34, 0.09, '#a87550');
  box(g, -0.32, 0.55, 1.05, 0.13, 0.4, 0.13, '#2c3340');          // legs
  wheel(g, 0, -1.15, 0.34, 0.05);                                 // front wheel under puller
  for (const x of [-0.48, 0.48]) wheel(g, x, -0.2, 0.34, 0.05);   // rear wheels
}

/** Motorcycle with baked helmeted rider. */
function buildMotorcycle(g) {
  box(g, 0, 0.5, 0, 0.24, 0.3, 1.7, PAINT);                       // frame + tank
  box(g, 0, 0.82, -0.25, 0.3, 0.12, 0.55, TYRE);                  // seat
  box(g, 0, 0.95, 0.62, 0.5, 0.06, 0.05, TRIM);                   // handlebar
  box(g, 0, 0.62, 0.95, 0.14, 0.16, 0.06, LIGHT_F);
  // rider
  box(g, 0, 0.9, -0.15, 0.34, 0.44, 0.2, '#31435c');              // torso
  box(g, 0, 1.42, -0.1, 0.2, 0.2, 0.2, '#c9302f');                // helmet
  box(g, 0, 1.0, 0.42, 0.09, 0.36, 0.09, '#31435c');              // arms
  box(g, -0.14, 0.62, -0.32, 0.12, 0.34, 0.12, '#22262e');        // legs
  box(g, 0.14, 0.62, -0.32, 0.12, 0.34, 0.12, '#22262e');
  wheel(g, 0, 0.95, 0.3, 0.06); wheel(g, 0, -0.85, 0.3, 0.06);
}

/** Delivery van. */
function buildVan(g) {
  box(g, 0, 0.4, -0.6, 1.9, 1.5, 3.4, PAINT);                     // cargo box
  box(g, 0, 0.34, 1.55, 1.85, 1.1, 1.6, PAINT);                   // cab
  box(g, 0, 1.0, 2.28, 1.7, 0.45, 0.06, GLASS);
  box(g, 0, 1.95, -0.6, 1.85, 0.08, 3.3, TRIM);
  box(g, -0.65, 0.5, 2.34, 0.3, 0.14, 0.04, LIGHT_F); box(g, 0.65, 0.5, 2.34, 0.3, 0.14, 0.04, LIGHT_F);
  for (const x of [-0.9, 0.9]) for (const z of [-1.5, 1.6]) wheel(g, x, z, 0.36, 0.1);
}

/** Goods truck with canvas-covered cargo (Karwan Bazar supplier). */
function buildTruck(g) {
  box(g, 0, 0.55, 2.6, 2.3, 1.3, 2.2, PAINT);                     // cab
  box(g, 0, 1.15, 3.15, 2.2, 0.6, 0.08, GLASS);
  box(g, 0, 0.6, -0.9, 2.34, 2.1, 5.6, '#c9b892');                // canvas cargo
  box(g, 0, 1.7, -0.9, 2.4, 0.12, 5.7, '#8c7c5c');                // canvas ribs
  box(g, 0, 0.3, -0.9, 2.3, 0.5, 5.7, PAINT);                     // chassis
  box(g, -0.85, 0.75, 3.68, 0.35, 0.16, 0.05, LIGHT_F); box(g, 0.85, 0.75, 3.68, 0.35, 0.16, 0.05, LIGHT_F);
  for (const x of [-1.1, 1.1]) for (const z of [2.6, -0.4, -2.4]) wheel(g, x, z, 0.48, 0.13);
}

export const VEHICLE_TYPES = ['bus', 'truck', 'microbus', 'van', 'car', 'cng', 'rickshaw', 'motorcycle'];

/** Physical + traffic-sim properties per type (metres, m/s). */
export const VEHICLE_SPECS = {
  bus:        { build: buildBus,        len: 10.8, wid: 2.5,  speed: [3.5, 6.5],  weight: 0.10,
               colours: ['#c9403a', '#2e7d4f', '#3a6ea8', '#c9a23a', '#b03a68'] },
  truck:      { build: buildTruck,      len: 7.8,  wid: 2.4,  speed: [3.0, 5.5],  weight: 0.07,
               colours: ['#3a5c8c', '#8c3a3a', '#3a7a4a', '#8c7434'] },
  microbus:   { build: buildMicrobus,   len: 5.4,  wid: 1.95, speed: [4.5, 8.0],  weight: 0.10,
               colours: ['#d8d8d4', '#8c9298', '#3a4a5c', '#5c6e58'] },
  van:        { build: buildVan,        len: 5.1,  wid: 1.95, speed: [4.0, 7.5],  weight: 0.07,
               colours: ['#d0cdc2', '#7c8894', '#c9a23a'] },
  car:        { build: buildCar,        len: 4.4,  wid: 1.75, speed: [5.0, 9.5],  weight: 0.24,
               colours: ['#cfd3d6', '#8c9298', '#23262b', '#7c1f22', '#2c4a7c', '#e8e4da'] },
  cng:        { build: buildCng,        len: 3.2,  wid: 1.45, speed: [4.5, 8.5],  weight: 0.18,
               colours: ['#2e7d4f', '#2a7347', '#33865a'] },
  rickshaw:   { build: buildRickshaw,   len: 2.8,  wid: 1.05, speed: [1.8, 3.6],  weight: 0.16,
               colours: ['#2166b0', '#c23b2e', '#2e8b57', '#c9a23a', '#7d3ac1'] },
  motorcycle: { build: buildMotorcycle, len: 2.1,  wid: 0.8,  speed: [6.0, 11.0], weight: 0.08,
               colours: ['#8c1f1f', '#1f3a8c', '#23262b', '#c9c9c4'] },
};

/** Build all vehicle geometries once. Returns { type: geometryData }. */
export function buildVehicleGeometries() {
  const out = {};
  for (const type of VEHICLE_TYPES) {
    const g = new GeometryBuilder();
    VEHICLE_SPECS[type].build(g);
    out[type] = g.finish();
  }
  return out;
}
