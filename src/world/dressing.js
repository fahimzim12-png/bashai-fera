// Street-commerce spot extraction, shared by ChunkBuilder (which draws the stalls) and
// CrowdSystem (which populates them with vendors and sitters). Same hash keys as
// ChunkBuilder.clutter, so a "tea" spot here is exactly the tea stall on screen.
// Pure: no Three.js.
import { hashString } from '../core/Rng.js';

/**
 * Deterministic roadside stall spots in route space.
 * @returns {{s:number, lat:number, kind:'tea'|'umbrella'|'crates', k:number}[]}
 */
export function stallSpots(route, s0, s1) {
  const out = [];
  const f = {};
  for (let k = Math.floor(s0 / 9); k * 9 < s1; k++) {
    const s = k * 9 + (hashString(`clut:${k}`) / 4294967296) * 6;
    if (s < s0 || s >= s1) continue;
    const dr = route.segmentAt(s).dressing || {};
    if (hashString(`clutc:${k}`) / 4294967296 > (dr.stalls ?? 0.2) * 0.6) continue;
    const fp = route.profileAt(s).elements.filter((e) => e.kind === 'footpath');
    const right = fp[fp.length - 1];
    if (!right) continue;
    const kind = hashString(`clutk:${k}`) / 4294967296;
    out.push({
      s, lat: right.x1 - 0.8, k,
      kind: kind < 0.45 ? 'tea' : kind < 0.7 ? 'umbrella' : 'crates',
    });
  }
  return out;
}

/** Footpath lateral bounds (inner edge..outer edge, with margin) at a route position. */
export function footpathBoundsAt(route, s) {
  const fp = route.profileAt(s).elements.filter((e) => e.kind === 'footpath');
  const left = fp.find((e) => e.x1 < 0), right = fp.find((e) => e.x0 > 0);
  return {
    left: left ? [left.x0 + 0.5, left.x1 - 0.5] : null,
    right: right ? [right.x0 + 0.5, right.x1 - 0.5] : null,
  };
}
