// The protagonist: an ordinary Bangladeshi office-goer walking home through Dhaka.
// Built from procedural low-poly geometry with a canvas-painted face; the likeness
// follows the developer's reference photos (warm brown skin, short curly black hair,
// rectangular black glasses, friendly face) in a stylised way - this game's art style
// is low-poly, not photoreal. Articulated joints: hips, knees, shoulders, neck.
// The setPose() interface is unchanged from the placeholder, so gameplay never notices.
import * as THREE from 'three';
import { GeometryBuilder } from '../render/GeometryBuilder.js';
import { toBufferGeometry } from '../render/GeometryUtil.js';
import { walkPose, idlePose } from './walkCycle.js';

// Reference-photo palette.
const SKIN = '#a87550', HAIR = '#17110c', SHIRT = '#7fa7c9', STRIPE = '#e9eef3';
const TROUSERS = '#3a4150', SHOE = '#221f1c', BELT = '#33281e', BAG = '#6b4a32', DARK = '#141414';

/** Merge a few small geometries into one (all become non-indexed; keeps one draw call). */
function mergeGeos(geos) {
  const pos = [], nor = [];
  for (const g of geos) {
    const n = g.index ? g.toNonIndexed() : g;
    pos.push(...n.attributes.position.array);
    nor.push(...n.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

function canvasTexture(size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 1;
  return t;
}

/** The face: friendly, mid-40s office father with rectangular glasses (photo reference). */
function paintFace(ctx, S) {
  const k = S / 128;                                  // authored on a 128 grid
  ctx.fillStyle = SKIN; ctx.fillRect(0, 0, S, S);
  // gentle shading: jaw + sides
  ctx.fillStyle = 'rgba(90,55,30,0.18)'; ctx.fillRect(0, 104 * k, S, 24 * k);
  ctx.fillRect(0, 0, 7 * k, S); ctx.fillRect(S - 7 * k, 0, 7 * k, S);
  // brows (thick, dark)
  ctx.fillStyle = '#241812';
  ctx.fillRect(30 * k, 40 * k, 24 * k, 5 * k);
  ctx.fillRect(74 * k, 40 * k, 24 * k, 5 * k);
  // eyes behind the glasses
  for (const ex of [42, 86]) {
    ctx.fillStyle = '#efe9df'; ctx.fillRect((ex - 9) * k, 48 * k, 18 * k, 9 * k);
    ctx.fillStyle = '#3a2415'; ctx.beginPath();
    ctx.arc(ex * k, 52.5 * k, 4.4 * k, 0, 7); ctx.fill();
    ctx.fillStyle = '#100a06'; ctx.beginPath();
    ctx.arc(ex * k, 52.5 * k, 2 * k, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect((ex + 1) * k, 50 * k, 2 * k, 2 * k);
  }
  // glasses: rims, bridge, temples
  ctx.strokeStyle = DARK; ctx.lineWidth = 3.2 * k;
  ctx.strokeRect(28 * k, 43 * k, 28 * k, 19 * k);
  ctx.strokeRect(72 * k, 43 * k, 28 * k, 19 * k);
  ctx.beginPath(); ctx.moveTo(56 * k, 51 * k); ctx.lineTo(72 * k, 51 * k); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28 * k, 51 * k); ctx.lineTo(2 * k, 49 * k); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(100 * k, 51 * k); ctx.lineTo(126 * k, 49 * k); ctx.stroke();
  // nose + nostrils
  ctx.fillStyle = 'rgba(90,55,30,0.25)'; ctx.fillRect(61 * k, 56 * k, 6 * k, 26 * k);
  ctx.fillStyle = '#6b4326';
  ctx.fillRect(57 * k, 82 * k, 4 * k, 3 * k); ctx.fillRect(67 * k, 82 * k, 4 * k, 3 * k);
  // warm smile (the photos: always smiling)
  ctx.strokeStyle = '#5c3722'; ctx.lineWidth = 3.4 * k; ctx.beginPath();
  ctx.moveTo(46 * k, 99 * k); ctx.quadraticCurveTo(64 * k, 110 * k, 82 * k, 99 * k); ctx.stroke();
  ctx.fillStyle = 'rgba(70,40,22,0.35)'; ctx.fillRect(52 * k, 107 * k, 24 * k, 3 * k);
  // cheek warmth
  ctx.fillStyle = 'rgba(150,80,40,0.12)';
  ctx.beginPath(); ctx.arc(34 * k, 82 * k, 9 * k, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(94 * k, 82 * k, 9 * k, 0, 7); ctx.fill();
}

/** Office shirt: fine vertical stripes + placket + buttons (reads at 2-5 m). */
function paintShirt(ctx, S) {
  ctx.fillStyle = SHIRT; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = STRIPE;
  for (let x = 2; x < S; x += 8) ctx.fillRect(x, 0, 3, S);
  // placket + buttons down the middle (front and back faces both show it; acceptable)
  ctx.fillStyle = STRIPE; ctx.fillRect(S / 2 - 3, 0, 6, S);
  ctx.fillStyle = '#5c82a4';
  for (let y = 8; y < S; y += 14) { ctx.beginPath(); ctx.arc(S / 2, y, 1.6, 0, 7); ctx.fill(); }
}

export class PlayerAvatar {
  constructor(material) {
    // Model space: faces +Z, local +X is the avatar's LEFT. Feet at y=0. Height ~1.73 m.
    const skinLin = SKIN, hairMat = new THREE.MeshLambertMaterial({ color: HAIR });

    const body = new GeometryBuilder();                    // static parts in body space
    body.box([0, 1.465, 0.02], [0, 1], [-1, 0], 0.13, 0.05, 0.14, STRIPE);   // collar
    body.box([0, 0.90, 0], [0, 1], [-1, 0], 0.37, 0.05, 0.25, BELT);         // belt
    const accessories = toBufferGeometry(body.finish());

    // Satchel + strap (single merged mesh, photo shows he carries one to the office).
    const bag = new GeometryBuilder();
    bag.box([-0.28, 0.62, -0.05], [0, 1], [-1, 0], 0.24, 0.30, 0.12, BAG);
    bag.box([-0.28, 0.77, -0.05], [0, 1], [-1, 0], 0.24, 0.03, 0.13, '#57381f');
    const bagMesh = new THREE.Mesh(toBufferGeometry(bag.finish()), material);

    // Leg: thigh (hip-pivot) + knee group (shin + shoe). One geometry each, used twice.
    const thigh = new GeometryBuilder();
    thigh.box([0, -0.205, 0], [0, 1], [-1, 0], 0.17, 0.43, 0.18, TROUSERS);
    const shin = new GeometryBuilder();
    shin.box([0, -0.19, 0], [0, 1], [-1, 0], 0.145, 0.38, 0.16, TROUSERS);
    shin.box([0, -0.385, 0.045], [0, 1], [-1, 0], 0.24, 0.09, 0.17, SHOE);

    // Arm: one piece (sleeve + forearm + hand), elbow bend is subtle enough to bake.
    const arm = new GeometryBuilder();
    arm.box([0, -0.16, 0], [0, 1], [-1, 0], 0.13, 0.32, 0.14, SHIRT);        // sleeve
    arm.box([0, -0.45, 0], [0, 1], [-1, 0], 0.105, 0.26, 0.11, skinLin);     // forearm
    arm.box([0, -0.62, 0.01], [0, 1], [-1, 0], 0.10, 0.10, 0.09, skinLin);   // hand

    // Head group (neck pivot): textured face box + curly hair + glasses.
    const faceTex = canvasTexture(128, paintFace);
    const skinMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(SKIN) });
    const faceMat = new THREE.MeshLambertMaterial({ map: faceTex });
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.27, 0.24),
      [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat]);
    headMesh.position.y = 0.135;
    const hairGeo = mergeGeos([
      new THREE.SphereGeometry(0.145, 8, 6), new THREE.SphereGeometry(0.10, 7, 5),
      new THREE.SphereGeometry(0.085, 7, 5), new THREE.SphereGeometry(0.075, 7, 5),
    ]);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.scale.set(1.0, 0.72, 0.95); hair.position.set(0, 0.225, -0.015);
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.10), hairMat);
    hairBack.position.set(0, 0.15, -0.09);
    const g = new GeometryBuilder();                       // glasses in head space (neck origin)
    g.box([-0.062, 0.155, 0.121], [0, 1], [-1, 0], 0.078, 0.052, 0.012, DARK);
    g.box([0.062, 0.155, 0.121], [0, 1], [-1, 0], 0.078, 0.052, 0.012, DARK);
    g.box([0, 0.16, 0.121], [0, 1], [-1, 0], 0.05, 0.012, 0.012, DARK);
    g.box([-0.115, 0.155, 0.06], [0, 1], [-1, 0], 0.015, 0.012, 0.13, DARK);
    g.box([0.115, 0.155, 0.06], [0, 1], [-1, 0], 0.015, 0.012, 0.13, DARK);
    const glasses = new THREE.Mesh(toBufferGeometry(g.finish()), hairMat);

    // ---- assemble the hierarchy ----
    this.root = new THREE.Group();
    this.body = new THREE.Group();                          // everything above the hips
    this.body.position.y = 0.88;

    const torso = new THREE.Group();
    const shirtTex = canvasTexture(64, paintShirt);
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.58, 0.25),
      new THREE.MeshLambertMaterial({ map: shirtTex }));
    torsoMesh.position.y = 0.29;
    torso.add(torsoMesh, new THREE.Mesh(accessories, material), bagMesh);

    this.neck = new THREE.Group(); this.neck.position.y = 0.58;
    this.neck.add(headMesh, hair, hairBack, glasses);

    const mkLimb = (geo, mat, px, py) => {
      const grp = new THREE.Group(); grp.position.set(px, py, 0);
      grp.add(new THREE.Mesh(geo, mat));
      return grp;
    };
    const thighGeo = toBufferGeometry(thigh.finish());
    const shinGeo = toBufferGeometry(shin.finish());
    const armGeo = toBufferGeometry(arm.finish());
    this.hipL = mkLimb(thighGeo, material, 0.10, 0);
    this.hipR = mkLimb(thighGeo, material, -0.10, 0);
    this.kneeL = mkLimb(shinGeo, material, 0, -0.42); this.hipL.add(this.kneeL);
    this.kneeR = mkLimb(shinGeo, material, 0, -0.42); this.hipR.add(this.kneeR);
    this.shoulderL = mkLimb(armGeo, material, 0.245, 0.545);
    this.shoulderR = mkLimb(armGeo, material, -0.245, 0.545);
    this.shoulderL.rotation.z = 0.07; this.shoulderR.rotation.z = -0.07;   // natural A-pose

    this.body.add(torso, this.neck, this.shoulderL, this.shoulderR);
    this.root.add(this.body, this.hipL, this.hipR);
    this.root.traverse(o => { o.frustumCulled = false; });

    this._time = 0; this._stride = 0; this._flinch = 0; this._flinchSide = 1;
    this.drawCalls = 9;  // torso, accessories, bag, 2 arms, 2 thighs, 2 shins, head(2 mats), hair, hairBack, glasses
  }

  /** A vehicle passed too close: small startle reaction, decays in setPose. */
  nudge(strength, side = 1) {
    this._flinch = Math.min(1, this._flinch + strength);
    this._flinchSide = side >= 0 ? 1 : -1;
  }

  /**
   * x,z world position; yaw radians; phase = walk cycles; lean -1..1 (sideways steering).
   * opts: { dt (seconds, for idle/sway animation), stride 0..1 (0 = stand still),
   *         now (unused, kept for future) }.
   */
  setPose(x, z, yaw, phase, lean, opts = {}) {
    const dt = opts.dt || 0;
    this._time += dt;
    this._stride = opts.stride !== undefined ? opts.stride : 1;
    const p = walkPose(phase, this._stride);
    const idle = this._stride < 0.05 ? idlePose(this._time, 0.25) : null;

    this.root.position.set(x, 0, z);
    this.root.rotation.y = yaw - lean * 0.45;                 // turn a little into the steer

    this.body.position.y = 0.88 + p.bobY + (idle ? idle.bobY : 0);
    this.body.position.x = p.swayX;
    this.body.rotation.x = p.torsoPitch + (idle ? idle.torsoPitch : 0);
    this.body.rotation.z = -lean * 0.06 + p.torsoRoll + (idle ? idle.torsoRoll : 0);

    this.hipL.rotation.x = p.thighL; this.hipR.rotation.x = p.thighR;
    this.kneeL.rotation.x = p.shinL; this.kneeR.rotation.x = p.shinR;
    this.shoulderL.rotation.x = p.armL + (idle ? idle.armL : 0);
    this.shoulderR.rotation.x = p.armR + (idle ? idle.armR : 0);

    const headGroup = this.neck;
    let hy = p.headYaw + (idle ? idle.headYaw : 0);
    let hx = p.headPitch + (idle ? idle.headPitch : 0);
    if (this._flinch > 0.002) {                               // startled glance at the traffic
      this._flinch *= Math.exp(-dt * 3.5);
      hy += this._flinchSide * this._flinch * 0.55;
      this.body.rotation.x -= this._flinch * 0.04;
    }
    headGroup.rotation.y = hy; headGroup.rotation.x = hx;
  }
}
