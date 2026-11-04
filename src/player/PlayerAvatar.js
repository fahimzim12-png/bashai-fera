// The protagonist: an ordinary Bangladeshi office-goer walking home through Dhaka.
// Milestone 4 rebuild: rounded sculpted head (painted 256 px face on a sphere - no more box
// head, NO glasses by default), real elbow joints with counter-swinging forearms, hands
// with thumbs, pelvis/shoulder counter-rotation from the shared walk cycle, office shirt
// with collar and placket, trousers with crease tone, shoes with soles, office satchel.
//
// Likeness: the face is built from LIKENESS traits (src/player/likeliness.js), which are
// honest PLACEHOLDERS until the developer's reference photographs arrive (M4.9). No
// resemblance is claimed until a trait sheet measured from the photos is approved.
import * as THREE from 'three';
import { GeometryBuilder } from '../render/GeometryBuilder.js';
import { toBufferGeometry } from '../render/GeometryUtil.js';
import { walkPose, idlePose } from './walkCycle.js';
import { LIKENESS } from './likeliness.js';

const SKIN = LIKENESS.skin, HAIR = LIKENESS.hair;
const SHIRT = LIKENESS.shirt, STRIPE = LIKENESS.shirtStripe;
const TROUSERS = LIKENESS.trousers, SHOE = '#221f1c', BELT = '#33281e', BAG = LIKENESS.bag;

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
  t.anisotropy = 2;
  return t;
}

/**
 * Face painted for a SPHERE UV map: the face fronts +Z which is u = 0.25 on three.js
 * SphereGeometry. Features are placed around u 0.25, v 0.38..0.78. Trait multipliers
 * (eyeSpacing, noseLength, lipFullness) come from the likeness sheet.
 */
function paintFace(ctx, S) {
  const T = LIKENESS;
  const u = (frac) => frac * S;                 // u fraction -> px
  const v = (frac) => frac * S;                 // v fraction (0 = top of head)
  ctx.fillStyle = SKIN; ctx.fillRect(0, 0, S, S);
  // hair zone on the upper region (hair geometry covers most of it; this hides seams)
  ctx.fillStyle = HAIR; ctx.fillRect(0, 0, S, v(0.30));
  // soft side shading
  ctx.fillStyle = 'rgba(90,55,30,0.16)';
  ctx.fillRect(u(0.13), v(0.30), u(0.035), v(0.5));
  ctx.fillRect(u(0.335), v(0.30), u(0.035), v(0.5));
  // brows
  ctx.fillStyle = '#241812';
  const bw = 0.052 * T.faceWidth, bh = 0.012;
  for (const sgn of [-1, 1]) {
    ctx.fillRect(u(0.25 + sgn * 0.052 * T.eyeSpacing - bw / 2), v(0.455), u(bw), v(bh));
  }
  // eyes: white, iris, pupil, catchlight
  for (const sgn of [-1, 1]) {
    const ex = 0.25 + sgn * 0.052 * T.eyeSpacing;
    ctx.fillStyle = '#efe9df';
    ctx.fillRect(u(ex - 0.026), v(0.485), u(0.052), v(0.03));
    ctx.fillStyle = '#3a2415';
    ctx.beginPath(); ctx.arc(u(ex), v(0.5), u(0.014), 0, 7); ctx.fill();
    ctx.fillStyle = '#100a06';
    ctx.beginPath(); ctx.arc(u(ex), v(0.5), u(0.007), 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(u(ex + 0.004), v(0.492), u(0.006), v(0.006));
    // eyelid line
    ctx.strokeStyle = 'rgba(60,38,22,0.5)'; ctx.lineWidth = S * 0.004;
    ctx.beginPath(); ctx.moveTo(u(ex - 0.026), v(0.482)); ctx.lineTo(u(ex + 0.026), v(0.482)); ctx.stroke();
  }
  // nose: shading column + tip (geometry adds the bridge)
  const noseLen = T.noseLength;
  ctx.fillStyle = 'rgba(90,55,30,0.22)';
  ctx.fillRect(u(0.25 - 0.012), v(0.5), u(0.024), v(0.11 * noseLen));
  ctx.fillStyle = '#6b4326';
  ctx.fillRect(u(0.25 - 0.02), v(0.5 + 0.105 * noseLen), u(0.014), v(0.008));
  ctx.fillRect(u(0.25 + 0.006), v(0.5 + 0.105 * noseLen), u(0.014), v(0.008));
  // mouth: quiet neutral-friendly line (no cartoon smile)
  const lip = T.lipFullness;
  ctx.strokeStyle = '#5c3722'; ctx.lineWidth = S * 0.009;
  ctx.beginPath();
  ctx.moveTo(u(0.25 - 0.055), v(0.685));
  ctx.quadraticCurveTo(u(0.25), v(0.685 + 0.028 * lip), u(0.25 + 0.055), v(0.685));
  ctx.stroke();
  ctx.fillStyle = 'rgba(70,40,22,0.3)';
  ctx.fillRect(u(0.25 - 0.04), v(0.685 + 0.03 * lip), u(0.08), v(0.012 * lip));
  // cheek warmth + light stubble hint along the jaw
  ctx.fillStyle = 'rgba(150,80,40,0.10)';
  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.arc(u(0.25 + sgn * 0.085), v(0.62), u(0.045), 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(40,28,18,0.10)';
  ctx.fillRect(u(0.16), v(0.76), u(0.18), v(0.05));
}

/** Office shirt: fine vertical stripes + placket + buttons (reads at 2-5 m). */
function paintShirt(ctx, S) {
  ctx.fillStyle = SHIRT; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = STRIPE;
  for (let x = 2; x < S; x += 8) ctx.fillRect(x, 0, 3, S);
  ctx.fillStyle = STRIPE; ctx.fillRect(S / 2 - 3, 0, 6, S);
  ctx.fillStyle = '#5c82a4';
  for (let y = 8; y < S; y += 14) { ctx.beginPath(); ctx.arc(S / 2, y, 1.6, 0, 7); ctx.fill(); }
}

export class PlayerAvatar {
  constructor(material) {
    // Model space: faces +Z, local +X is the avatar's LEFT. Feet at y=0. Height from traits.
    const skinMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(SKIN) });
    const hairMat = new THREE.MeshLambertMaterial({ color: HAIR });

    // ---- static accessories (collar, belt) ------------------------------------------------
    const acc = new GeometryBuilder();
    acc.box([0, 1.475, 0.03], [0, 1], [-1, 0], 0.14, 0.05, 0.13, STRIPE);    // collar
    acc.box([0, 0.90, 0], [0, 1], [-1, 0], 0.37, 0.05, 0.25, BELT);          // belt
    const accessories = toBufferGeometry(acc.finish());

    // satchel + flap on the left hip
    const bag = new GeometryBuilder();
    bag.box([-0.28, 0.62, -0.05], [0, 1], [-1, 0], 0.24, 0.30, 0.12, BAG);
    bag.box([-0.28, 0.77, -0.05], [0, 1], [-1, 0], 0.24, 0.03, 0.13, '#57381f');
    const bagMesh = new THREE.Mesh(toBufferGeometry(bag.finish()), material);

    // ---- legs: thigh (hip pivot) + knee group (shin + shoe with sole) ---------------------
    const thigh = new GeometryBuilder();
    thigh.box([0, -0.205, 0], [0, 1], [-1, 0], 0.17, 0.43, 0.18, TROUSERS);
    const shin = new GeometryBuilder();
    shin.box([0, -0.19, 0], [0, 1], [-1, 0], 0.145, 0.38, 0.16, TROUSERS);
    shin.box([0, -0.36, 0.04], [0, 1], [-1, 0], 0.20, 0.06, 0.24, SHOE);       // shoe body
    shin.box([0, -0.398, 0.04], [0, 1], [-1, 0], 0.21, 0.025, 0.25, '#3a352f'); // sole

    // ---- arms: real elbows. Shoulder group > upper arm; elbow group > forearm + hand -----
    const upperArm = new GeometryBuilder();
    upperArm.box([0, -0.15, 0], [0, 1], [-1, 0], 0.125, 0.30, 0.135, SHIRT);   // sleeve
    const forearm = new GeometryBuilder();
    forearm.box([0, -0.11, 0], [0, 1], [-1, 0], 0.10, 0.22, 0.105, SKIN);      // forearm
    forearm.box([0, -0.245, 0.01], [0, 1], [-1, 0], 0.085, 0.09, 0.075, SKIN); // hand
    forearm.box([0.045, -0.245, 0.02], [0, 1], [-1, 0], 0.035, 0.05, 0.05, SKIN); // thumb

    // ---- head: rounded skull with painted face, ears, nose; NO glasses --------------------
    const faceTex = canvasTexture(256, paintFace);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12),
      new THREE.MeshLambertMaterial({ map: faceTex }));
    headMesh.scale.set(0.94 * LIKENESS.faceWidth, 1.12, 1.0);
    headMesh.position.y = 0.16;
    // hair: short cap + back mass + tapered sides (shape follows LIKENESS.hairStyle 'short')
    const hairGeo = mergeGeos([
      new THREE.SphereGeometry(0.118, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.SphereGeometry(0.105, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
    ]);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.scale.set(0.98 * LIKENESS.faceWidth, 0.85, 1.0);
    hair.position.set(0, 0.175, -0.012);
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.06), hairMat);
    hairBack.position.set(0, 0.13, -0.095);
    // nose + ears (small geometry so the silhouette stops being an egg)
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.05 * LIKENESS.noseLength, 0.032), skinMat);
    nose.position.set(0, 0.135, 0.108);
    const earGeo = new THREE.BoxGeometry(0.02, 0.045, 0.03);
    const earL = new THREE.Mesh(earGeo, skinMat); earL.position.set(0.108 * LIKENESS.faceWidth, 0.15, 0);
    const earR = new THREE.Mesh(earGeo, skinMat); earR.position.set(-0.108 * LIKENESS.faceWidth, 0.15, 0);

    // ---- assemble the hierarchy ------------------------------------------------------------
    this.root = new THREE.Group();
    this.hips = new THREE.Group();                          // pelvis yaw (weight transfer)
    this.hips.position.y = 0.88;
    this.body = new THREE.Group();                          // everything above the hips

    const torso = new THREE.Group();
    const shirtTex = canvasTexture(64, paintShirt);
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.58, 0.25),
      new THREE.MeshLambertMaterial({ map: shirtTex }));
    torsoMesh.position.y = 0.29;
    torso.add(torsoMesh, new THREE.Mesh(accessories, material), bagMesh);

    this.neck = new THREE.Group(); this.neck.position.y = 0.60;
    this.neck.add(headMesh, hair, hairBack, nose, earL, earR);

    const mkGroup = (px, py) => {
      const grp = new THREE.Group(); grp.position.set(px, py, 0);
      return grp;
    };
    const thighGeo = toBufferGeometry(thigh.finish());
    const shinGeo = toBufferGeometry(shin.finish());
    const upperGeo = toBufferGeometry(upperArm.finish());
    const foreGeo = toBufferGeometry(forearm.finish());
    this.hipL = mkGroup(0.10, 0); this.hipL.add(new THREE.Mesh(thighGeo, material));
    this.hipR = mkGroup(-0.10, 0); this.hipR.add(new THREE.Mesh(thighGeo, material));
    this.kneeL = mkGroup(0, -0.42); this.kneeL.add(new THREE.Mesh(shinGeo, material)); this.hipL.add(this.kneeL);
    this.kneeR = mkGroup(0, -0.42); this.kneeR.add(new THREE.Mesh(shinGeo, material)); this.hipR.add(this.kneeR);
    this.shoulderL = mkGroup(0.245, 0.545); this.shoulderL.add(new THREE.Mesh(upperGeo, material));
    this.shoulderR = mkGroup(-0.245, 0.545); this.shoulderR.add(new THREE.Mesh(upperGeo, material));
    this.elbowL = mkGroup(0, -0.30); this.elbowL.add(new THREE.Mesh(foreGeo, material)); this.shoulderL.add(this.elbowL);
    this.elbowR = mkGroup(0, -0.30); this.elbowR.add(new THREE.Mesh(foreGeo, material)); this.shoulderR.add(this.elbowR);
    this.shoulderL.rotation.z = 0.07; this.shoulderR.rotation.z = -0.07;   // natural A-pose

    this.hips.add(this.body, this.hipL, this.hipR);
    this.body.add(torso, this.neck, this.shoulderL, this.shoulderR);
    this.root.add(this.hips);
    this.root.traverse(o => { o.frustumCulled = false; });

    this._time = 0; this._stride = 0; this._flinch = 0; this._flinchSide = 1;
    this.drawCalls = 12;  // torso, accessories, bag, 2 upper arms, 2 forearms, 2 thighs, 2 shins, head+hair group
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

    this.hips.rotation.y = p.hipYaw;                          // pelvis leads with the swing leg
    this.body.rotation.y = p.shoulderYaw;                     // shoulders counter-rotate
    this.body.position.y = p.bobY + (idle ? idle.bobY : 0);   // hips group already sits at 0.88
    this.body.position.x = p.swayX;
    this.body.rotation.x = p.torsoPitch + (idle ? idle.torsoPitch : 0);
    this.body.rotation.z = -lean * 0.06 + p.torsoRoll + (idle ? idle.torsoRoll : 0);

    this.hipL.rotation.x = p.thighL; this.hipR.rotation.x = p.thighR;
    this.kneeL.rotation.x = p.shinL; this.kneeR.rotation.x = p.shinR;
    this.shoulderL.rotation.x = p.armL + (idle ? idle.armL : 0);
    this.shoulderR.rotation.x = p.armR + (idle ? idle.armR : 0);
    this.elbowL.rotation.x = p.elbowL;                        // real elbow bend from the cycle
    this.elbowR.rotation.x = p.elbowR;

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
