// Landmark registry: maps route JSON landmark "kind" to its pure-array builder.
// Builders live in this folder, take (g, sg, route, lm) and emit world-space geometry
// deterministically: `g` = plain vertex-colour geometry, `sg` = UV geometry that lands in
// the shared sign atlas (readable Bengali/English text). Zero Three.js here - meshes are
// assembled in LandmarkManager.
import { buildFountain } from './SaarcFountain.js';
import { buildFootbridge } from './FarmgateFootbridge.js';
import { buildStation } from './FarmgateStation.js';
import { buildMarket } from './KarwanMarket.js';
import { buildExpressway } from './ElevatedExpressway.js';
import { buildKhamarbari } from './Khamarbari.js';
import { buildKarwanZone } from './KarwanBazarZone.js';
import { buildGardens } from './SonargaonGardens.js';

const BUILDERS = {
  'saarc-fountain': buildFountain,
  'farmgate-footbridge': buildFootbridge,
  'metro-station': buildStation,
  'karwan-market-sheds': buildMarket,
  'elevated-expressway': buildExpressway,
  'khamarbari': buildKhamarbari,
  'karwan-bazar-zone': buildKarwanZone,
  'sonargaon-gardens': buildGardens,
};

export const KNOWN_LANDMARK_KINDS = Object.keys(BUILDERS);

export function buildLandmark(g, sg, route, lm) {
  const fn = BUILDERS[lm.kind];
  if (!fn) throw new Error(`Unknown landmark kind "${lm.kind}"`);
  fn(g, sg, route, lm);
}

/** Route-s of a landmark (fountain + gardens live ahead of the route end, at/beyond the mor). */
export function landmarkS(lm, route) {
  return lm.aheadOfEnd !== undefined ? route.length + lm.aheadOfEnd : (lm.s ?? (lm.s0 + lm.s1) / 2);
}

/** Does this landmark clear generated buildings at (side, sMid)? side 0 = both sides. */
export function clearsBuildings(lm, side, sMid) {
  if (!lm.clears) return false;
  if (lm.side !== 0 && lm.side !== side) return false;
  return sMid >= lm.clears[0] && sMid <= lm.clears[1];
}
