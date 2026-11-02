// Quality tiers and device detection (pure logic, unit-tested).
// Philosophy: every phone starts at LOW (the Xiaomi Redmi 9 is the minimum target) and may be
// promoted only if it proves it can keep up. Desktops start high and are demoted if they struggle.

export const TIER_ORDER = ['low', 'medium', 'high'];

export const TIERS = {
  low:    { name: 'low',    maxPixelRatio: 1.0,  targetFps: 30, aheadChunks: 4, antialias: false },
  medium: { name: 'medium', maxPixelRatio: 1.25, targetFps: 0,  aheadChunks: 6, antialias: false },
  high:   { name: 'high',   maxPixelRatio: 2.0,  targetFps: 0,  aheadChunks: 8, antialias: true  },
};

export function detectProfile(env) {
  const ua = env.userAgent || '';
  const small = Math.min(env.screenW || 9999, env.screenH || 9999) <= 820;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || ((env.maxTouchPoints || 0) > 1 && small);
  const gpu = env.gpu || '';
  return {
    isMobile,
    gpu,
    isSoftware: /SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(gpu),
    isIntegrated: /Intel|UHD|Iris/i.test(gpu),
    isMaliOrOldAdreno: /Mali|PowerVR|Adreno \(TM\) [2-5]\d\d\b/i.test(gpu),
    memoryGB: env.deviceMemory || 0,
    cores: env.hardwareConcurrency || 0,
    dpr: env.dpr || 1,
  };
}

export function chooseTier(profile, override) {
  if (override && TIERS[override]) return override;
  if (profile.isMobile || profile.isMaliOrOldAdreno) return 'low';
  if (profile.isSoftware) return 'low';
  if (profile.isIntegrated) return 'medium';
  return 'high';
}

export function maxTierFor(profile, override) {
  if (override && TIERS[override]) return override;     // a forced tier is also the ceiling
  return profile.isMobile ? 'medium' : 'high';          // phones are capped to protect battery/heat
}
