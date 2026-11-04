// Protagonist likeness traits (Milestone 4 / M4.9 plumbing).
//
// HONEST STATUS: the developer's reference photographs have never been accessible in the
// working environment, so every value below is a NEUTRAL PLACEHOLDER, not a likeness claim.
// When photographs arrive, this file becomes the single data drop: measured proportions,
// sampled skin/hair hex values, hairstyle and glasses flags go here and PlayerAvatar builds
// the head from them - no code changes needed. The likeness only ships after a 3-view
// render sheet is approved by the developer.
export const LIKENESS = {
  placeholder: true,              // stays true until real measured traits replace these
  skin: '#a87550',                // warm brown (placeholder)
  hair: '#17110c',                // short black hair (placeholder)
  hairStyle: 'short',             // 'short' | 'curly' | 'buzz' | 'sidePart'
  glasses: false,                 // no glasses unless the photos show them
  faceWidth: 1.0,                 // multipliers applied to the base head build (1 = neutral)
  jawWidth: 1.0,
  eyeSpacing: 1.0,
  noseLength: 1.0,
  lipFullness: 1.0,
  height: 1.73,                   // metres
  shirt: '#7fa7c9',
  shirtStripe: '#e9eef3',
  trousers: '#3a4150',
  bag: '#6b4a32',
};

/** Validate a trait-sheet object (used by tests and by the future M4.9 data drop). */
export function validateTraits(t) {
  const errors = [];
  if (!t || typeof t !== 'object') return ['traits must be an object'];
  for (const key of ['skin', 'hair']) {
    if (typeof t[key] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(t[key])) errors.push(`traits.${key} must look like #aabbcc`);
  }
  for (const key of ['faceWidth', 'jawWidth', 'eyeSpacing', 'noseLength', 'lipFullness']) {
    if (!(Number.isFinite(t[key]) && t[key] >= 0.6 && t[key] <= 1.6)) errors.push(`traits.${key} must be 0.6..1.6`);
  }
  if (typeof t.glasses !== 'boolean') errors.push('traits.glasses must be a boolean');
  if (!(Number.isFinite(t.height) && t.height > 1.4 && t.height < 2.1)) errors.push('traits.height must be 1.4..2.1 m');
  return errors;
}
