// The population of Dhaka: walkers, standers, talking groups, tea-stall sitters,
// vendors and market porters. Pure (no Three.js): deterministic spot layout along the
// route + per-frame poses; the GPU side (8 instanced draw calls total) is CrowdRenderer.
//
// People are placed on footpaths only - never the road, never the player's walkable
// strip beyond the footpath itself. Behaviour mix and density come from the same
// deterministic hashing discipline as the rest of the world, so the crowd is identical
// across runs for a given route version.
import { Rng, hashString } from '../core/Rng.js';
import { clamp, damp } from '../core/MathUtil.js';
import { walkPose, idlePose, blendPose } from '../player/walkCycle.js';
import { CROWD_PALETTES } from './characterKit.js';
import { stallSpots, footpathBoundsAt } from '../world/dressing.js';
import { TIERS } from '../render/tiers.js';

const CAPACITY = TIERS.high.crowd;
const STRIDE_RATE = 0.68;          // walk cycles per metre (shorter legs than the hero)
const BLANK = { headRot: 0, headYaw: 0, torsoPitch: 0, thighL: 0, thighR: 0, shinL: 0, shinR: 0, armL: 0, armR: 0, elbowL: -0.25, elbowR: -0.25, rootY: 0 };

// Sitting on a tea-stall bench (seat ~0.45 m) or a plastic stool (~0.35 m).
const SIT_BENCH = { ...BLANK, rootY: -0.40, thighL: -1.42, thighR: -1.38, shinL: 1.30, shinR: 1.34, torsoPitch: 0.10, armL: -0.35, armR: -0.3, elbowL: -0.7, elbowR: -0.6 };
const SIT_STOOL = { ...BLANK, rootY: -0.52, thighL: -1.05, thighR: -1.1, shinL: 0.95, shinR: 1.0, torsoPitch: 0.06, elbowL: -0.5, elbowR: -0.55 };

export class CrowdSystem {
  /** @param {{route:object, bus:object, renderer:object|null}} deps */
  constructor({ route, bus, renderer = null }) {
    this.route = route; this.bus = bus; this.renderer = renderer;
    this.viewDist = TIERS.low.aheadChunks * 60 - 20;
    this.time = 0;
    this._p3 = { x: 0, y: 0, z: 0 };
    this._blank = { ...BLANK };
    this._pose = { ...BLANK };
    this._stalls = stallSpots(route, route.space.minS, route.space.maxS);

    // ---- deterministic population layout ----
    const rng = new Rng(`${route.id}:crowd`);
    this.people = [];
    let id = 0;
    for (let s = route.space.minS + 6; s < route.space.maxS - 6; s += 4 + rng.next() * 3.5) {
      const seg = route.segmentAt(s);
      const dr = seg.dressing || {};
      const density = dr.crowd ?? 0.9;
      if (rng.next() > density * 0.72) continue;            // breathing room between clusters
      const stalls = this._stalls.filter((st) => Math.abs(st.s - s) < 4.5);
      const roll = rng.next();
      const prng = new Rng(`${route.id}:crowd-person-${id}`);
      const female = prng.next() < 0.34;
      const karwan = seg.id === 'karwan-bazar';
      const person = {
        id: id++, s, lat: 0, behavior: 'stand', dir: 1, speed: 0, phase: prng.next(),
        yaw: 0, scale: 1, variant: female ? 'headB' : 'headA', porter: false,
        colours: null, slot: null,
      };
      if (roll < 0.44) {
        // walker: footpaths both sides; porters carry goods on their head in Karwan Bazar
        person.behavior = 'walk';
        person.dir = rng.next() < 0.72 ? 1 : -1;
        person.speed = 0.75 + rng.next() * 0.75;
        person.porter = karwan && !female && rng.next() < 0.3;
        const bounds = footpathBoundsAt(route, s);
        const side = rng.next() < 0.68 ? bounds.left : bounds.right;
        if (!side) continue;
        person.lat = side[0] + rng.next() * (side[1] - side[0]);
        person.scale = rng.next() < 0.1 ? 0.72 + rng.next() * 0.1 : 0.92 + rng.next() * 0.14;   // some kids
      } else if (roll < 0.62) {
        // stander: watching the street, inner edge of a footpath
        person.behavior = 'stand';
        const bounds = footpathBoundsAt(route, s);
        const side = bounds.left || bounds.right;
        if (!side) continue;
        person.lat = side[1] - rng.next() * 0.9;
        person.yaw = Math.PI;                               // facing the road (−lat)
        person.scale = 0.92 + rng.next() * 0.14;
      } else if (roll < 0.78) {
        // talker: placed as a pair facing each other
        person.behavior = 'talk';
        const bounds = footpathBoundsAt(route, s);
        const side = bounds.left || bounds.right;
        if (!side) continue;
        person.lat = side[0] + 0.5 + rng.next() * 0.8;
        person.yaw = (id % 2 ? 1 : -1) * (Math.PI / 2) + (rng.next() - 0.5) * 0.4;
        person.scale = 0.92 + rng.next() * 0.14;
        // twin the pair: second member shares s, offset laterally, mirrored yaw
        const twin = { ...person, id: id++, lat: person.lat + 0.9 + rng.next() * 0.4,
          yaw: person.yaw + Math.PI, phase: rng.next(), colours: null, slot: null,
          variant: rng.next() < 0.5 ? 'headB' : 'headA', scale: 0.92 + rng.next() * 0.14 };
        this._dress(twin, prng);
        this.people.push(twin);
      } else if (roll < 0.9 && stalls.length) {
        // sitter at a tea stall / umbrella cart bench
        const st = stalls[rng.int(0, stalls.length - 1)];
        person.behavior = st.kind === 'tea' ? 'sitBench' : 'sitStool';
        person.s = st.s + (rng.next() - 0.5) * 1.6;
        person.lat = st.lat - 1.35 - rng.next() * 0.5;
        person.yaw = Math.PI + (rng.next() - 0.5) * 0.6;    // facing the stall & road
        person.scale = 0.92 + rng.next() * 0.12;
      } else if (stalls.length) {
        // vendor minding the stall
        const st = stalls[rng.int(0, stalls.length - 1)];
        person.behavior = 'vendor';
        person.s = st.s + (rng.next() - 0.5) * 1.2;
        person.lat = st.lat - 0.95;
        person.yaw = Math.PI + (rng.next() - 0.5) * 0.5;
        person.scale = 0.92 + rng.next() * 0.12;
      } else {
        // nothing to anchor a stall person to: they still watch the street
        person.behavior = 'stand';
        const bounds = footpathBoundsAt(route, s);
        const side = bounds.left || bounds.right;
        if (!side) continue;
        person.lat = side[1] - rng.next() * 0.9;
        person.yaw = Math.PI;
        person.scale = 0.92 + rng.next() * 0.14;
      }
      this._dress(person, prng);
      this.people.push(person);
    }

    // ---- render slots ----
    this.capacity = CAPACITY;
    this.slots = [];
    for (let i = 0; i < CAPACITY; i++) this.slots.push({ i, p: null, pose: { ...BLANK } });
    this.stats = { visible: 0, population: this.people.length };
    if (renderer) this.attach(renderer);
  }

  /** Clothing: office shirts, panjabis, saris - instance colours chosen once per person. */
  _dress(p, prng) {
    const P = CROWD_PALETTES;
    const skin = P.skins[prng.int(0, P.skins.length - 1)];
    if (p.variant === 'headB' && prng.next() < 0.75) {
      const sari = P.sari[prng.int(0, P.sari.length - 1)];
      p.colours = { skin, torso: sari, arm: skin, legs: sari };
    } else {
      p.colours = {
        skin,
        torso: P.shirts[prng.int(0, P.shirts.length - 1)],
        arm: P.shirts[prng.int(0, P.shirts.length - 1)],
        legs: P.pants[prng.int(0, P.pants.length - 1)],
      };
    }
  }

  attach(renderer) { this.renderer = renderer; renderer.build(this); }

  setTier(tier) {
    this.viewDist = tier.aheadChunks * 60 - 20;
    this.capacity = tier.crowd;
    if (this.renderer) this.renderer.setCapacity(tier.crowd);
    for (const slot of this.slots) {
      if (slot.i >= tier.crowd && slot.p) { slot.p.slot = null; slot.p = null; if (this.renderer) this.renderer.hide(slot.i); }
    }
  }

  /** Advance walkers, refresh the slot assignment, write poses. Pure route-space in/out. */
  update(playerS, dt) {
    this.time += dt;
    const winLo = playerS - 70, winHi = playerS + this.viewDist + 25;

    for (const p of this.people) {
      if (p.behavior !== 'walk' || !p.slot) continue;
      p.s += p.dir * p.speed * dt;
      p.phase += p.speed * STRIDE_RATE * dt;
      if (p.s > winHi) p.s = winLo + 4 + (p.id % 7);
      if (p.s < winLo) p.s = winHi - 4 - (p.id % 7);
    }

    // ---- slot assignment: keep the nearest people on screen ----
    const inWin = [];
    for (const p of this.people) if (p.s >= winLo && p.s <= winHi) inWin.push(p);
    inWin.sort((a, b) => Math.abs(a.s - playerS) - Math.abs(b.s - playerS));
    const keep = new Set();
    for (let i = 0; i < inWin.length && keep.size < this.capacity; i++) keep.add(inWin[i].id);
    let free = 0;
    for (const slot of this.slots) {
      if (slot.p && (!keep.has(slot.p.id) || slot.i >= this.capacity)) {
        slot.p.slot = null; slot.p = null;
        if (this.renderer) this.renderer.hide(slot.i);
      }
    }
    for (const p of inWin) {
      if (p.slot || !keep.has(p.id)) continue;
      while (free < this.slots.length && this.slots[free].p) free++;
      if (free >= this.capacity) break;
      const slot = this.slots[free];
      slot.p = p; p.slot = slot;
      if (this.renderer) this.renderer.setColours(slot.i, p);
    }

    // ---- poses ----
    let visible = 0;
    for (const slot of this.slots) {
      if (!slot.p || slot.i >= this.capacity) continue;
      visible++;
      const p = slot.p;
      this.route.space.toWorld(p.s, p.lat, this._p3);
      const heading = this.route.space.heading(p.s);
      const pose = slot.pose;
      let yaw = heading;
      if (p.behavior === 'walk') {
        const w = walkPose(p.phase, 0.85);
        blendPose(pose, this._blank, w, 1);
        pose.bobY = w.bobY;
        pose.elbowL = w.elbowL; pose.elbowR = w.elbowR;
        yaw = heading + (p.dir < 0 ? Math.PI : 0);
        if (p.porter) {                                    // carrying goods on the head
          pose.armL = -2.35 + Math.sin(this.time * 3 + p.id) * 0.06;
          pose.armR = -2.3 - Math.sin(this.time * 3 + p.id) * 0.06;
          pose.elbowL = pose.elbowR = -0.35;
          pose.torsoPitch += 0.04;
        }
      } else if (p.behavior === 'stand' || p.behavior === 'talk' || p.behavior === 'vendor') {
        const idle = idlePose(this.time, (p.id * 0.618) % 1);
        blendPose(pose, this._blank, idle, 1);
        yaw = heading + p.yaw;
        if (p.behavior === 'talk') {                       // gesture while chatting
          const g = Math.sin(this.time * 1.9 + p.id * 1.3);
          if (p.id % 2) { pose.armR = -0.55 + g * 0.18; pose.elbowR = -1.15 + g * 0.2; }
          else { pose.armL = -0.5 - g * 0.18; pose.elbowL = -1.1 - g * 0.2; }
        } else if (p.behavior === 'vendor') {              // arranging wares
          pose.armL = -0.45 + Math.sin(this.time * 2.3 + p.id) * 0.3;
          pose.armR = -0.4 + Math.cos(this.time * 2.1 + p.id) * 0.3;
          pose.elbowL = -0.9; pose.elbowR = -0.85;
        }
      } else {                                             // sitBench / sitStool
        const base = p.behavior === 'sitBench' ? SIT_BENCH : SIT_STOOL;
        blendPose(pose, this._blank, base, 1);
        const idle = idlePose(this.time, (p.id * 0.618) % 1);
        pose.headYaw = idle.headYaw * 0.6;
        pose.torsoPitch += idle.torsoPitch * 0.5;
        yaw = heading + p.yaw;
      }
      pose.rootY = (pose.rootY || 0) + (pose.bobY || 0);
      if (this.renderer) this.renderer.writePerson(slot.i, pose, this._p3.x, this._p3.z, yaw, p.scale, p.variant);
    }
    this.stats.visible = visible;
    if (this.renderer) this.renderer.flush();
  }
}
