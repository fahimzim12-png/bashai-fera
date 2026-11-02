// Checks route JSON files and explains problems in plain language.
// Pure function: used by the game at load time AND by the unit tests.
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
      }
    });
  }

  if (!data.lighting) err('route.lighting is missing');
  if (!Array.isArray(data.provenance) || !data.provenance.length) warn('route.provenance is empty: facts should cite sources');
  else data.provenance.forEach((p, i) => { if (!p.claim || !p.source) warn(`provenance[${i}] needs claim and source`); });
  if (data.status === 'schematic') warn('route layout is schematic (not yet verified against real geometry)');
  return { errors, warnings };
}
