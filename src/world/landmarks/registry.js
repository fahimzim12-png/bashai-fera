// Landmark registry: maps route JSON landmark "kind" to its pure-array builder.
// Builders live in this folder, take (GeometryBuilder, route, lm) and emit world-space
// geometry deterministically. Zero Three.js here - meshes are assembled in LandmarkManager.
import { buildFountain } from './SaarcFountain.js';
import { buildFootbridge } from './FarmgateFootbridge.js';
import { buildStation } from './FarmgateStation.js';
import { buildMarket } from './KarwanMarket.js';

const BUILDERS = {
  'saarc-fountain': buildFountain,
  'farmgate-footbridge': buildFootbridge,
  'farmgate-station': buildStation,
  'karwan-market-sheds': buildMarket,
};

export const KNOWN_LANDMARK_KINDS = Object.keys(BUILDERS);

export function buildLandmark(g, route, lm) {
  const fn = BUILDERS[lm.kind];
  if (!fn) throw new Error(`Unknown landmark kind "${lm.kind}"`);
  fn(g, route, lm);
}

/** Route-s of a landmark (the fountain lives ahead of the route end, at the junction). */
export function landmarkS(lm, route) {
  return lm.kind === 'saarc-fountain' ? route.length + lm.aheadOfEnd : (lm.s ?? (lm.s0 + lm.s1) / 2);
}

/** Does this landmark clear generated buildings at (side, sMid)? side 0 = both sides. */
export function clearsBuildings(lm, side, sMid) {
  if (!lm.clears) return false;
  if (lm.side !== 0 && lm.side !== side) return false;
  return sMid >= lm.clears[0] && sMid <= lm.clears[1];
}
