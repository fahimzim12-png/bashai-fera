// Checks route JSON files and explains problems in plain language.
// Pure function: used by the game at load time AND by the unit tests.

// Landmark kinds with a builder in src/world/landmarks/ (keep in sync with registry.js).
const KNOWN_LANDMARK_KINDS = [
  'saarc-fountain', 'farmgate-footbridge', 'metro-station', 'karwan-market-sheds',
  'elevated-expressway', 'khamarbari', 'karwan-bazar-zone', 'sonargaon-gardens',
];
// Kinds that span a range of the route (s0 < s1) instead of sitting at one s.
const RANGED_KINDS = new Set(['karwan-market-sheds', 'elevated-expressway', 'khamarbari', 'karwan-bazar-zone']);
// Kinds that live beyond the route end (aheadOfEnd).
const AHEAD_KINDS = new Set(['saarc-fountain', 'sonargaon-gardens']);

export function validateRoute(data) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (!data || typeof data !== 'object') return { errors: ['Route data is missing'], warnings };
  if (typeof data.id !== 'string' || !data.id) err('route.id must be a non-empty string');
  if (!data.title || !data.title.bn || !data.title.en) err('route.title needs bn and en');
  if (!Array.isArray(data.centerline) || data.centerline.length < 2) err('route.centerline needs at least 2 [x,z] points');
  else data.centerline.forEach((p, i) => { if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) err(`centerline[${i}] must be [x, z] numbers`); });

  // Milestone 4: geo-referencing block (real-world provenance of the centreline).
  if (data.geo !== undefined) {
    const geo = data.geo;
    if (typeof geo !== 'object' || Array.isArray(geo)) err('route.geo must be an object');
    else {
      if (geo.datum !== undefined && geo.datum !== 'WGS84') err('route.geo.datum must be WGS84');
      if (Array.isArray(geo.waypoints)) {
        geo.waypoints.forEach((w, i) => {
          if (!Number.isFinite(w.lat) || w.lat < -90 || w.lat > 90 || !Number.isFinite(w.lon) || w.lon < -180 || w.lon > 180) {
            err(`geo.waypoints[${i}] needs a plausible lat/lon`);
          }
        });
      }
    }
  }

  const sections = data.sections || {};
  const names = Object.keys(sections);
  if (!names.length) err('route.sections is empty');
  let refCount = null;
  for (const name of names) {
    const sec = sections[name];
    if (!Array.isArray(sec.elements) || !sec.elements.length) { err(`section "${name}" has no elements`); continue; }
    if (refCount === null) refCount = sec.elements;
    else {
      if (sec.elements.length !== refCount.length) err(`section "${name}" must have the same number of elements as the first section (needed for smooth blending)`);
      else sec.elements.forEach((e, i) => { if (e.kind !== refCount[i].kind) err(`section "${name}" element ${i} must be kind "${refCount[i].kind}" (same order in every section)`); });
    }
    sec.elements.forEach((e, i) => {
      if (!Number.isFinite(e.x0) || !Number.isFinite(e.x1) || e.x1 <= e.x0) err(`section "${name}" element ${i}: need x0 < x1`);
      if (typeof e.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(e.color)) err(`section "${name}" element ${i}: color must look like #aabbcc`);
    });
    if (!Array.isArray(sec.walkable) || sec.walkable.length !== 2 || sec.walkable[0] >= sec.walkable[1]) err(`section "${name}": walkable must be [min, max]`);
    if (!sec.frontage || !Number.isFinite(sec.frontage.left) || !Number.isFinite(sec.frontage.right)) err(`section "${name}": frontage needs left and right numbers`);
  }

  if (!Array.isArray(data.segments) || !data.segments.length) err('route.segments is empty');
  else {
    if (data.segments[0].s0 !== 0) err('the first segment must start at s0 = 0');
    data.segments.forEach((seg, i) => {
      if (i > 0 && !(seg.s0 > data.segments[i - 1].s0)) err(`segment "${seg.id}" s0 must be greater than the previous segment's s0`);
      if (!sections[seg.section]) err(`segment "${seg.id}" uses unknown section "${seg.section}"`);
      if (!seg.name || !seg.name.bn || !seg.name.en) err(`segment "${seg.id}" needs name.bn and name.en`);
      const b = seg.buildings;
      if (!b) err(`segment "${seg.id}" needs a buildings block`);
      else {
        if (!(data.palettes && data.palettes[b.palette])) err(`segment "${seg.id}": unknown palette "${b.palette}"`);
        if (!(b.height && b.height[0] <= b.height[1])) err(`segment "${seg.id}": buildings.height must be [min, max]`);
        if (!(b.width && b.width[0] <= b.width[1])) err(`segment "${seg.id}": buildings.width must be [min, max]`);
        // Milestone 4: optional per-segment archetype weights (which building generators run here).
        if (b.archetypes !== undefined) {
          if (typeof b.archetypes !== 'object' || Array.isArray(b.archetypes)) {
            err(`segment "${seg.id}": buildings.archetypes must be an object of weights`);
          } else {
            let sum = 0;
            for (const [k, w] of Object.entries(b.archetypes)) {
              if (!Number.isFinite(w) || w < 0 || w > 1) err(`segment "${seg.id}": archetype weight "${k}" must be a number 0..1`);
              else sum += w;
            }
            if (Object.keys(b.archetypes).length && (sum < 0.5 || sum > 1.5)) {
              err(`segment "${seg.id}": archetype weights should roughly sum to 1 (got ${sum.toFixed(2)})`);
            }
          }
        }
      }
    });
  }

  if (!data.lighting) err('route.lighting is missing');

  // Milestone 4: named junction records (the real corridor's cross roads).
  if (data.junctions !== undefined) {
    if (!Array.isArray(data.junctions)) err('route.junctions must be an array');
    else data.junctions.forEach((j, i) => {
      const at = `junctions[${i}]`;
      if (typeof j.id !== 'string' || !j.id) err(`${at} needs an id`);
      const atS = j.end === true;
      if (!atS && !(Number.isFinite(j.s) && j.s >= 0)) err(`${at} ("${j.id}") needs s >= 0 or end: true`);
      if (!j.name || !j.name.bn || !j.name.en) err(`${at} ("${j.id}") needs name.bn and name.en`);
      if (!Array.isArray(j.arms) || !j.arms.length) err(`${at} ("${j.id}") needs a non-empty arms array`);
      else j.arms.forEach((a) => { if (typeof a !== 'string' || !a) err(`${at} ("${j.id}"): arm names must be strings`); });
      if (j.signal !== undefined && typeof j.signal !== 'boolean') err(`${at} ("${j.id}"): signal must be a boolean`);
      const ids = data.junctions.map((x) => x.id);
      if (ids.filter((x) => x === j.id).length > 1) err(`${at}: duplicate junction id "${j.id}"`);
    });
  }

  // Optional per-district atmosphere (Milestone 2): colours + fog density per segment id.
  if (data.moods !== undefined) {
    if (typeof data.moods !== 'object' || Array.isArray(data.moods)) err('route.moods must be an object keyed by segment id');
    else {
      for (const [id, m] of Object.entries(data.moods)) {
        if (id === 'note') continue;
        if (m.fog !== undefined && (typeof m.fog !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(m.fog))) err(`moods.${id}.fog must look like #aabbcc`);
        if (m.hemiGround !== undefined && (typeof m.hemiGround !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(m.hemiGround))) err(`moods.${id}.hemiGround must look like #aabbcc`);
        if (m.density !== undefined && !(Number.isFinite(m.density) && m.density >= 0.5 && m.density <= 2)) err(`moods.${id}.density must be a number between 0.5 and 2`);
      }
    }
  }

  // Optional per-segment scenery density knobs (Milestone 2): all plain numbers, 0..2.
  (data.segments || []).forEach((seg) => {
    const d = seg.dressing;
    if (d === undefined) return;
    if (typeof d !== 'object' || Array.isArray(d)) { err(`segment "${seg.id}": dressing must be an object`); return; }
    for (const [k, v] of Object.entries(d)) {
      if (!Number.isFinite(v) || v < 0 || v > 2) err(`segment "${seg.id}": dressing.${k} must be a number between 0 and 2`);
    }
  });

  // Landmarks: each needs a known kind and kind-specific numeric fields.
  if (data.landmarks !== undefined) {
    if (!Array.isArray(data.landmarks)) err('route.landmarks must be an array');
    else data.landmarks.forEach((lm, i) => {
      const at = `landmarks[${i}]`;
      if (typeof lm.id !== 'string' || !lm.id) err(`${at} needs an id`);
      if (!KNOWN_LANDMARK_KINDS.includes(lm.kind)) err(`${at} ("${lm.id}") has unknown kind "${lm.kind}"`);
      if (RANGED_KINDS.has(lm.kind)) {
        if (!(Number.isFinite(lm.s0) && Number.isFinite(lm.s1) && lm.s1 > lm.s0)) err(`${at} ("${lm.id}") needs s0 < s1`);
      } else if (AHEAD_KINDS.has(lm.kind)) {
        if (!(Number.isFinite(lm.aheadOfEnd) && lm.aheadOfEnd >= 0)) err(`${at} ("${lm.id}") needs aheadOfEnd >= 0`);
        if (lm.kind === 'saarc-fountain') {
          if (!(Number.isFinite(lm.radius) && lm.radius > 0)) err(`${at} ("${lm.id}") needs radius > 0`);
          if (!(Number.isFinite(lm.height) && lm.height > 0)) err(`${at} ("${lm.id}") needs height > 0`);
        }
      } else {
        if (!Number.isFinite(lm.s) || lm.s < 0) err(`${at} ("${lm.id}") needs s >= 0`);
      }
      if (lm.clears !== undefined) {
        if (!Array.isArray(lm.clears) || lm.clears.length !== 2 || !(lm.clears[0] < lm.clears[1])) err(`${at} ("${lm.id}"): clears must be [s0, s1] with s0 < s1`);
        if (![0, -1, 1].includes(lm.side)) err(`${at} ("${lm.id}"): side must be -1, 0 or 1`);
      }
      if (lm.cull !== undefined && !(Number.isFinite(lm.cull) && lm.cull >= 60 && lm.cull <= 800)) err(`${at} ("${lm.id}"): cull must be 60..800 (metres)`);
    });
  }

  if (!Array.isArray(data.provenance) || !data.provenance.length) warn('route.provenance is empty: facts should cite sources');
  else data.provenance.forEach((p, i) => { if (!p.claim || !p.source) warn(`provenance[${i}] needs claim and source`); });
  if (data.status === 'schematic') warn('route layout is schematic (not yet verified against real geometry)');
  return { errors, warnings };
}
