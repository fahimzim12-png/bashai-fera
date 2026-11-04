// Dhaka traffic: instanced low-poly vehicles with a light 1-D lane simulation in route
// space (s = metres along the route, lat = lateral offset). Bangladesh drives on the
// LEFT, and the player walks the left footpath, so:
//   - the LEFT carriageway (negative lat) carries traffic in the SAME direction as +s;
//   - the RIGHT carriageway (positive lat) carries ONCOMING traffic.
// The simulation is deliberately simple and data-driven: every vehicle exposes
// (s, lat, dir, speed, len, wid) so collision/damage gameplay can later hook in without
// rebuilding it. No vehicle ever leaves the road elements - footpaths stay clear.
// This file is pure (no Three.js): the GPU side lives in TrafficRenderer.js, so the
// whole simulation is unit-testable headless.
import { VEHICLE_SPECS, VEHICLE_TYPES } from './vehicleModels.js';
import { Rng } from '../core/Rng.js';
import { clamp, damp } from '../core/MathUtil.js';
import { TIERS } from '../render/tiers.js';

const MAX_VEHICLES = TIERS.high.traffic;

/**
 * Split a total budget across keyed weights with integers that sum EXACTLY to total,
 * every key getting at least 1 (largest-remainder method). Keeps the tier budgets
 * honest: 'low' really means 12 vehicles, not 12-ish.
 */
export function distributeCounts(weights, total) {
  const keys = Object.keys(weights);
  const out = {};
  let sum = 0;
  const frac = [];
  for (const k of keys) {
    const raw = Math.max(1, Math.floor(weights[k] * total));
    out[k] = raw; sum += raw;
    frac.push([k, weights[k] * total - Math.floor(weights[k] * total)]);
  }
  frac.sort((a, b) => b[1] - a[1]);
  let i = 0;
  while (sum < total) { out[frac[i % frac.length][0]]++; sum++; i++; }
  i = 0;
  while (sum > total) {                                 // over-subscribed: trim smallest fracs
    const k = frac[frac.length - 1 - (i % frac.length)][0];
    if (out[k] > 1) { out[k]--; sum--; }
    i++;
  }
  return out;
}

export class TrafficSystem {
  /**
   * @param {{route:object, bus:object, renderer:object|null}} deps
   *   renderer (optional, browser only) = TrafficRenderer instance, attached via attach().
   */
  constructor({ route, bus, renderer = null }) {
    this.route = route; this.bus = bus; this.renderer = renderer;
    this.viewDist = TIERS.low.aheadChunks * 60 - 20;
    this._spawnRngSeed = `${route.id}:traffic`;

    // ---- lane table: per segment, lane-centre laterals per carriageway ----
    this.laneSets = route.segments.map(seg => {
      const els = route.data.sections[seg.section].elements;
      const L = [], R = [];
      for (const el of els) {
        if (el.kind !== 'road') continue;
        const n = Math.max(1, Math.round(el.lanes ?? 1));
        const w = (el.x1 - el.x0) / n;
        const dst = (el.x0 + el.x1) / 2 < 0 ? L : R;
        for (let i = 0; i < n; i++) dst.push(el.x0 + (i + 0.5) * w);
      }
      return { L, R };
    });

    // Milestone 5: kerb-parking districts hand their OUTER (kerb-side) lane to parked
    // vehicles — moving traffic keeps the inner lanes, exactly like the real corridor
    // where staff buses and market vans line the carriageway.
    this.busStops = [];
    route.segments.forEach((seg, i) => {
      const dr = seg.dressing || {};
      for (const s of dr.busStops || []) if (Number.isFinite(s)) this.busStops.push({ s, seg: i });
      if (dr.kerbParking) {
        if (this.laneSets[i].L.length > 1) this.laneSets[i].L.shift();
        if (this.laneSets[i].R.length > 1) this.laneSets[i].R.pop();
      }
    });

    // ---- fleet plan: per-type instance counts (one draw call per type) ----
    const weights = {};
    for (const t of VEHICLE_TYPES) weights[t] = VEHICLE_SPECS[t].weight;
    this.counts = distributeCounts(weights, MAX_VEHICLES);
    const rng = new Rng(`${route.id}:traffic-mix`);
    const typeBag = [];
    for (const t of VEHICLE_TYPES) for (let i = 0; i < this.counts[t]; i++) typeBag.push(t);
    for (let i = typeBag.length - 1; i > 0; i--) {
      const j = rng.int(0, i); const tmp = typeBag[i]; typeBag[i] = typeBag[j]; typeBag[j] = tmp;
    }
    this.vehicles = typeBag.map((type, i) => {
      const spec = VEHICLE_SPECS[type];
      const carr = i % 2 === 0 ? -1 : 1;                 // alternate carriageways
      const laneIdx = Math.floor(i / 2) % 3;
      // Milestone 5: lane personality — kerb lanes crawl (pick-ups, drops), median lanes flow
      const laneFactor = laneIdx === 0 ? 0.9 : laneIdx === 2 ? 1.08 : 1.0;
      return {
        type, instIdx: i, colourIdx: rng.int(0, 15), carr, laneIdx,
        s: 0, lat: 0, speed: 0,
        desired: rng.range(spec.speed[0], spec.speed[1]) * laneFactor,
        len: spec.len, wid: spec.wid,
        hornT: rng.range(2, 20), nearMissT: 0, dwellT: 0, lastStop: -1, _active: false,
      };
    });
    this.byType = {};
    for (const t of VEHICLE_TYPES) this.byType[t] = this.vehicles.filter(v => v.type === t);
    // keep instIdx contiguous per type so the renderer can use mesh.count directly
    for (const t of VEHICLE_TYPES) this.byType[t].forEach((v, i) => { v.instIdx = i; });

    this._nearMissCooldown = 0;
    this._p3 = { x: 0, y: 0, z: 0 };
    this.stats = { active: 0, horns: 0, nearMisses: 0 };
    if (renderer) this.attach(renderer);
  }

  /** Attach the GPU side (browser only). The renderer reads counts/colours from us. */
  attach(renderer) {
    this.renderer = renderer;
    renderer.build(this);
  }

  /** Reseed placements around a player position (init and restart). */
  reset(playerS = 0) {
    const rng = new Rng(this._spawnRngSeed);
    const minS = this.route.space.minS + 15, maxS = this.route.space.maxS - 15;
    const lanes = [];
    for (const v of this.vehicles) {
      lanes.push({ v, carr: v.carr, laneIdx: v.laneIdx, s: minS + rng.next() * (maxS - minS) });
    }
    lanes.sort((a, b) => (a.carr - b.carr) || (a.laneIdx - b.laneIdx) || (a.s - b.s));
    // de-overlap within each (carriageway, lane) chain
    for (let i = 1; i < lanes.length; i++) {
      const a = lanes[i - 1], b = lanes[i];
      if (a.carr === b.carr && a.laneIdx === b.laneIdx) {
        const need = (a.v.len + b.v.len) / 2 + 2.5;
        if (b.s - a.s < need) b.s = a.s + need;
      }
    }
    for (const l of lanes) {
      l.v.s = Math.min(l.s, maxS);
      l.v.lat = this._laneLat(l.v, l.v.s);
      l.v.speed = l.v.desired * 0.7;
      l.v.lastStop = -1; l.v.dwellT = 0;
    }
  }

  _laneLat(v, s) {
    const seg = this.route.segmentIndexAt(s);
    const lanes = v.carr < 0 ? this.laneSets[seg].L : this.laneSets[seg].R;
    const idx = Math.min(v.laneIdx, lanes.length - 1);
    return lanes[Math.max(0, idx)];
  }

  setTier(tier) {
    this.viewDist = tier.aheadChunks * 60 - 20;
    const quotas = {};
    for (const t of VEHICLE_TYPES) quotas[t] = this.counts[t] / TIERS.high.traffic;  // fractions
    const active = distributeCounts(quotas, tier.traffic);
    for (const t of VEHICLE_TYPES) {
      const n = active[t];
      const list = this.byType[t];
      for (let i = 0; i < list.length; i++) list[i]._active = i < n;
      if (this.renderer) this.renderer.setActive(t, n);
    }
    this.stats.active = tier.traffic;
    this.reset(this.route.length / 2);
  }

  /**
   * Advance the sim and write instance matrices. playerS/playerLat in route space.
   * Returns nothing; emits 'traffic:horn' and 'traffic:nearmiss' on the bus.
   */
  update(playerS, playerLat, dt) {
    const vs = this.vehicles, route = this.route;
    this._nearMissCooldown = Math.max(0, this._nearMissCooldown - dt);
    const winLo = playerS - 110, winHi = playerS + this.viewDist + 40;

    for (let i = 0; i < vs.length; i++) {
      const v = vs[i];
      if (!v._active) continue;
      const dir = v.carr < 0 ? 1 : -1;

      // ---- car following within the same carriageway+lane ----
      let gap = Infinity, leaderSpeed = Infinity;
      for (let j = 0; j < vs.length; j++) {
        const o = vs[j];
        if (o === v || !o._active || o.carr !== v.carr || o.laneIdx !== v.laneIdx) continue;
        const d = (o.s - v.s) * dir;                        // >0 = o is ahead of v
        if (d > 0 && d < gap) { gap = d; leaderSpeed = o.speed; }
      }
      const minGap = (v.len + 4.5);
      let target = v.desired;
      if (gap < minGap + 14) target = Math.min(target, leaderSpeed * clamp((gap - minGap * 0.6) / 8, 0.15, 1));
      if (gap < minGap * 0.55) target = 0.4;               // crawl, Dhaka style, never reverse

      // ---- Milestone 5: buses actually stop at the bus shelters --------------------------
      if (v.type === 'bus' && v.carr < 0 && v.laneIdx === 0) {
        for (const st of this.busStops) {
          if (v.lastStop === st.s) continue;
          if (v.s >= st.s - 2.6 && v.s <= st.s + 0.8) { v.lastStop = st.s; v.dwellT = 3.0 + (v.instIdx % 3) * 0.8; }
        }
        if (v.dwellT > 0) { v.dwellT -= dt; target = 0; }   // boarding: full stop, then pull away
      }

      // ---- the walking player is an obstacle too (no collision yet: slow + honk) ----
      if (v.carr < 0 && Math.abs(v.lat - playerLat) < 1.6 && dir * (playerS - v.s) > 0
        && dir * (playerS - v.s) < 14) {
        target = Math.min(target, 0.6);
        v.hornT -= dt * 4;                                  // impatient
      }

      // ---- occasional lane change to overtake ----
      const seg = route.segmentIndexAt(v.s);
      const lanes = v.carr < 0 ? this.laneSets[seg].L : this.laneSets[seg].R;
      if (target < v.desired * 0.55 && lanes.length > 1 && v.hornT < 0
        && gap < minGap * 0.8) {
        const alt = (v.laneIdx + 1) % lanes.length;
        let free = true;
        for (let j = 0; j < vs.length; j++) {
          const o = vs[j];
          if (!o._active || o === v || o.carr !== v.carr || o.laneIdx !== alt) continue;
          if (Math.abs(o.s - v.s) < (o.len + v.len) / 2 + 4) { free = false; break; }
        }
        if (free) { v.laneIdx = alt; target = v.desired; v.hornT = 4; }
      }

      v.speed = damp(v.speed, target, 2.0, dt);
      v.s += dir * v.speed * dt;
      v.lat = damp(v.lat, this._laneLat(v, v.s), 2.5, dt);

      // ---- recycle outside the window (with a same-lane clearance scan) ----
      if (v.s > winHi || v.s < winLo) {
        const atHi = v.s < winLo;                 // exited behind -> re-enter ahead
        const edge = atHi ? winHi : winLo;
        let placed = false;
        for (let attempt = 0; attempt < 7 && !placed; attempt++) {
          const cand = clamp(edge + (atHi ? 1 : -1) * (6 + attempt * 14),
            route.space.minS + 8, route.space.maxS - 8);
          let free = true;
          for (let j = 0; j < vs.length; j++) {
            const o = vs[j];
            if (!o._active || o === v || o.carr !== v.carr || o.laneIdx !== v.laneIdx) continue;
            if (Math.abs(o.s - cand) < (o.len + v.len) / 2 + 3) { free = false; break; }
          }
          if (free) { v.s = cand; placed = true; }
        }
        if (!placed) v.s = clamp(atHi ? winHi + 70 : winLo - 70,
          route.space.minS + 8, route.space.maxS - 8);
        v.speed = v.desired * 0.6;
        v.lastStop = -1;                                    // recycled: may stop at shelters again
      }

      // ---- near-miss detection (vehicles passing the walker) ----
      v.nearMissT = Math.max(0, v.nearMissT - dt);
      if (v.nearMissT === 0 && Math.abs(v.s - playerS) < 5.5 && v.speed > 0.8) {
        const dLat = Math.abs(v.lat - playerLat);
        if (dLat < 1.9) {
          v.nearMissT = 2.5;
          if (this._nearMissCooldown === 0) {
            this._nearMissCooldown = 1.4;
            this.stats.nearMisses++;
            this.bus.emit('traffic:nearmiss', {
              strength: clamp(1.5 - dLat, 0.15, 1), side: Math.sign(v.lat - playerLat) || 1,
              type: v.type,
            });
          }
        }
      }

      // ---- horn hooks for the audio engine ----
      v.hornT -= dt;
      if (v.hornT <= 0) {
        v.hornT = 4 + (v.instIdx * 7919 % 60) / 6;          // spread re-honks
        const blocked = target < v.desired * 0.5;
        if (blocked || v.type === 'bus' || v.type === 'cng') {
          this.stats.horns++;
          this.bus.emit('traffic:horn', { type: v.type, blocked, s: v.s, side: Math.sign(v.lat - playerLat) || 0 });
        }
      }

      // ---- write the instance matrix ----
      if (this.renderer) {
        route.space.toWorld(v.s, v.lat, this._p3);
        this.renderer.writeVehicle(v.type, v.instIdx, this._p3.x, this._p3.z,
          route.space.heading(v.s) + (dir < 0 ? Math.PI : 0));
      }
    }

    if (this.renderer) this.renderer.flush();
  }
}
