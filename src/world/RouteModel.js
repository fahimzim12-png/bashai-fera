// RouteModel = the loaded route: curve (RouteSpace) + authored segments + road profile
// at any point + the procedurally laid-out buildings. Pure logic, no Three.js.
import { RouteSpace } from './RouteSpace.js';
import { validateRoute } from './validateRoute.js';
import { lerp, smoothstep, clamp } from '../core/MathUtil.js';
import { Rng } from '../core/Rng.js';

export class RouteModel {
  constructor(data) {
    const v = validateRoute(data);
    if (v.errors.length) throw new Error('Invalid route data:\n - ' + v.errors.join('\n - '));
    this.warnings = v.warnings;
    this.data = data;
    this.id = data.id;
    this.title = data.title;
    this.palettes = data.palettes;
    this.sections = data.sections;
    this.lighting = data.lighting;
    this.landmarks = data.landmarks || [];
    this.space = new RouteSpace(data.centerline, { spacing: 2, padStart: data.padStart ?? 60, padEnd: data.padEnd ?? 150 });
    this.length = this.space.length;
    this.junctions = (data.junctions || []).map((j) => ({
      ...j,
      s: j.end === true ? this.length : j.s,
    }));
    this.startLateral = data.start && Number.isFinite(data.start.lateral) ? data.start.lateral : -14;
    this.segments = data.segments.map((seg, i, arr) => ({
      ...seg, index: i,
      s1: i + 1 < arr.length ? arr[i + 1].s0 : this.length,
    }));
    this.progressMarks = (data.progressMarks || []).map((m) => ({
      label: m.label,
      s: m.segment === 'end' ? this.length : (this.segments.find((x) => x.id === m.segment) || this.segments[0]).s0,
    }));
    this._buildings = null;
  }

  segmentIndexAt(s) {
    for (let i = this.segments.length - 1; i >= 0; i--) if (s >= this.segments[i].s0) return i;
    return 0;
  }
  segmentAt(s) { return this.segments[this.segmentIndexAt(s)]; }

  // Blend weight between the previous segment's road section and this one's.
  _blend(s, i) {
    const seg = this.segments[i];
    if (i === 0) return { a: this.sections[seg.section], b: this.sections[seg.section], t: 1 };
    const prev = this.sections[this.segments[i - 1].section];
    const cur = this.sections[seg.section];
    if (prev === cur) return { a: cur, b: cur, t: 1 };
    const t = smoothstep((s - seg.s0) / (seg.blend ?? 24));
    return { a: prev, b: cur, t };
  }

  /** Road cross-section at s (elements interpolated across segment boundaries). */
  profileAt(s) {
    const i = this.segmentIndexAt(s);
    const { a, b, t } = this._blend(s, i);
    const elements = b.elements.map((eb, k) => {
      const ea = a.elements[k];
      return { ...eb, x0: lerp(ea.x0, eb.x0, t), x1: lerp(ea.x1, eb.x1, t), height: lerp(ea.height, eb.height, t), color: t < 0.5 ? ea.color : eb.color };
    });
    return {
      elements,
      frontageL: lerp(a.frontage.left, b.frontage.left, t),
      frontageR: lerp(a.frontage.right, b.frontage.right, t),
      walkMin: lerp(a.walkable[0], b.walkable[0], t),
      walkMax: lerp(a.walkable[1], b.walkable[1], t),
    };
  }

  /** Cheap (no allocation beyond `out`): where may the player stand sideways at s? */
  walkableAt(s, out = {}) {
    const i = this.segmentIndexAt(clamp(s, 0, this.length));
    const { a, b, t } = this._blend(s, i);
    out.min = lerp(a.walkable[0], b.walkable[0], t);
    out.max = lerp(a.walkable[1], b.walkable[1], t);
    return out;
  }

  /** Buildings along both sides, generated once, deterministically (seeded by route id).
   * Milestone 4: each building also gets an ART-DIRECTED ARCHETYPE from the segment's
   * weight table (institutional / midrise / commercial / marketBlock / halfbuilt), which
   * ChunkBuilder uses for silhouette + facade-atlas decisions. */
  get buildings() {
    if (this._buildings) return this._buildings;
    const out = [];
    for (const side of [-1, 1]) {
      const rng = new Rng(`${this.id}:buildings:${side}`);
      let s = this.space.minS + rng.range(0, 4);
      while (s < this.space.maxS) {
        const seg = this.segmentAt(clamp(s, 0, this.length));
        const b = seg.buildings;
        if (rng.chance(b.gapChance ?? 0.08)) { s += rng.range(3, 9); continue; }   // alley / empty plot
        const w = rng.range(b.width[0], b.width[1]);
        const floors = Math.max(2, Math.round(rng.range(b.height[0], b.height[1]) / 3.2));
        const pal = this.palettes[b.palette];
        out.push({
          side,
          sMid: s + w / 2,
          w,
          depth: rng.range(b.depth[0], b.depth[1]),
          h: 0.4 + floors * 3.2,           // 0.4 base + whole floors (matches the facade texture rhythm)
          floors,
          wall: rng.pick(pal.walls),
          roof: rng.pick(pal.roofs),
          palette: b.palette,
          archetype: pickArchetype(b.archetypes, rng),
          seed: rng.int(1, 2147483646),
        });
        s += w + rng.range(0, 0.6);
      }
    }
    out.sort((p, q) => p.sMid - q.sMid);
    this._buildings = out;
    return out;
  }
}

/** Weighted deterministic archetype pick; falls back to 'midrise' when the segment has no table. */
function pickArchetype(weights, rng) {
  if (!weights) return 'midrise';
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  if (!entries.length) return 'midrise';
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let t = rng.next() * total;
  for (const [name, w] of entries) {
    t -= w;
    if (t <= 0) return name;
  }
  return entries[entries.length - 1][0];
}
