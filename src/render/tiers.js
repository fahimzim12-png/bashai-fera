// Quality tiers and device detection (pure logic, unit-tested).
//
// Milestone 5 policy — the Xiaomi Redmi 9 is NO LONGER the design ceiling. The primary
// targets are modern mid-range Android phones and desktop/laptop browsers:
//   - 'medium' is the DEFAULT for any capable phone (AA, real shadows, 34 vehicles,
//     48 background people, 1.5x pixel ratio).
//   - 'high' is the desktop/laptop experience and what adaptive promotion climbs to.
//   - 'low' survives only as a cheap fallback for genuinely weak hardware (old GPUs,
//     small memory, software renderers) — it must never dictate the main experience.

export const TIER_ORDER = ['low', 'medium', 'high'];

export const TIERS = {
  low:    { name: 'low',    maxPixelRatio: 1.0,  targetFps: 30, aheadChunks: 5, antialias: false, traffic: 16, crowd: 24, shadows: false, shadowSize: 1024 },
  medium: { name: 'medium', maxPixelRatio: 1.5,  targetFps: 0,  aheadChunks: 7, antialias: true,  traffic: 34, crowd: 48, shadows: true,  shadowSize: 1024 },
  high:   { name: 'high',   maxPixelRatio: 2.0,  targetFps: 0,  aheadChunks: 9, antialias: true,  traffic: 46, crowd: 64, shadows: true,  shadowSize: 2048 },
};

export function detectProfile(env) {
  const ua = env.userAgent || '';
  const small = Math.min(env.screenW || 9999, env.screenH || 9999) <= 820;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || ((env.maxTouchPoints || 0) > 1 && small);
  const gpu = env.gpu || '';
  return {
    isMobile,
    gpu,
    isSoftware: /SwiftShader|llvmpipe|Software|Microsoft Basic|angle \(google/i.test(gpu),
    isIntegrated: /Intel|UHD|Iris|Radeon\(TM\) (Vega|\d{1,2} )?Graphics/i.test(gpu) && !/Radeon RX|RX \d/i.test(gpu),
    // Pre-2019 class mobile GPUs (Mali G5x and older, Adreno 6xx and older, PowerVR)
    isLegacyGpu: /Mali-G(1|2|3|5)\d|Adreno \(TM\) [2-6]\d\d\b|PowerVR|Videocore|Mali-\d{3}/i.test(gpu),
    memoryGB: env.deviceMemory || 0,
    cores: env.hardwareConcurrency || 0,
    dpr: env.dpr || 1,
  };
}

export function chooseTier(profile, override) {
  if (override && TIERS[override]) return override;
  if (profile.isSoftware) return 'low';
  if (profile.isMobile) {
    if (profile.isLegacyGpu) return 'low';                       // pre-2019 class GPU
    if (profile.memoryGB && profile.memoryGB < 4) return 'low';  // too little RAM for the full city
    return 'medium';                                             // modern phone: the real experience
  }
  if (profile.isIntegrated) return 'medium';
  return 'high';
}

export function maxTierFor(profile, override) {
  if (override && TIERS[override]) return override;     // a forced tier is also the ceiling
  return 'high';                                        // every device may climb; adaptive quality guards heat/battery
}
