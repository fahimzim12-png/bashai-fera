import test from 'node:test';
import assert from 'node:assert/strict';
import { detectProfile, chooseTier, maxTierFor, TIERS } from '../src/render/tiers.js';
import { AdaptiveQuality, MIN_SCALE } from '../src/render/AdaptiveQuality.js';
import { computeVerticalFov } from '../src/camera/fov.js';

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0) Chrome/120';

test('M5 policy: legacy mobile GPU (Mali-G52 / Adreno 5xx / PowerVR) falls back to LOW', () => {
  const p = detectProfile({ userAgent: ANDROID_UA, maxTouchPoints: 5, gpu: 'ANGLE (ARM, Mali-G52 MC2, OpenGL ES 3.2)', deviceMemory: 4, hardwareConcurrency: 8, dpr: 2.75, screenW: 393, screenH: 851 });
  assert.ok(p.isMobile); assert.ok(p.isLegacyGpu);
  assert.equal(chooseTier(p), 'low');
});
test('M5 policy: tiny memory phones (<=3GB) stay on LOW even with a modern GPU', () => {
  const p = detectProfile({ userAgent: ANDROID_UA, maxTouchPoints: 5, gpu: 'ANGLE (Qualcomm, Adreno (TM) 730)', deviceMemory: 3, hardwareConcurrency: 8, dpr: 2, screenW: 384, screenH: 824 });
  assert.ok(p.isMobile); assert.equal(chooseTier(p), 'low');
});
test('M5 policy: a modern mid-range phone starts on MEDIUM with shadows and AA (no Redmi-9 ceiling)', () => {
  const p = detectProfile({ userAgent: ANDROID_UA, maxTouchPoints: 5, gpu: 'ANGLE (Qualcomm, Adreno (TM) 710)', deviceMemory: 6, hardwareConcurrency: 8, dpr: 2.6, screenW: 396, screenH: 872 });
  assert.equal(chooseTier(p), 'medium');
  assert.ok(TIERS.medium.antialias && TIERS.medium.shadows, 'medium carries the richer profile');
});
test('M5 policy: every device (phones included) may climb to HIGH through adaptive promotion', () => {
  const m = detectProfile({ userAgent: ANDROID_UA, maxTouchPoints: 5, gpu: 'ANGLE (Qualcomm, Adreno (TM) 740)', deviceMemory: 8, dpr: 2.6 });
  assert.equal(chooseTier(m), 'medium'); assert.equal(maxTierFor(m), 'high');
});
test('M5 policy: even a phone with a hidden GPU string gets the modern profile, not the old ceiling', () => {
  const p = detectProfile({ userAgent: ANDROID_UA, maxTouchPoints: 5, gpu: '', deviceMemory: 8, screenW: 393, screenH: 851 });
  assert.equal(chooseTier(p), 'medium'); assert.equal(maxTierFor(p), 'high');
});
test('desktop: discrete -> high, integrated -> medium, software -> low; override wins', () => {
  const d = (gpu) => detectProfile({ userAgent: DESKTOP_UA, maxTouchPoints: 0, gpu, screenW: 1920, screenH: 1080 });
  assert.equal(chooseTier(d('NVIDIA GeForce RTX 3060')), 'high');
  assert.equal(chooseTier(d('Intel(R) UHD Graphics 620')), 'medium');
  assert.equal(chooseTier(d('Google SwiftShader')), 'low');
  assert.equal(chooseTier(d('NVIDIA'), 'low'), 'low');
  assert.equal(maxTierFor(d('NVIDIA')), 'high');
});
test('tier table sanity: the flagship experience is rich, the fallback is cheap', () => {
  assert.ok(TIERS.high.traffic > TIERS.medium.traffic && TIERS.medium.traffic > TIERS.low.traffic);
  assert.ok(TIERS.high.crowd >= 60, `high crowd ${TIERS.high.crowd}`);
  assert.ok(TIERS.high.shadowSize >= TIERS.medium.shadowSize);
  assert.ok(TIERS.high.maxPixelRatio <= 2.0);
  assert.equal(TIERS.low.targetFps, 30, 'fallback stays capped at 30 fps');
  assert.ok(!TIERS.low.shadows && !TIERS.low.antialias);
});

const feed = (aq, ms, seconds, t0 = 0, fps) => {
  let t = t0, last = null;
  const iv = ms; const out = [];
  while (t < t0 + seconds * 1000) { t += iv; const r = aq.sample(iv, t); if (r) out.push({ ...r, at: t }); }
  return out;
};

test('adaptive: struggling lowers resolution first, then tier, never below floor', () => {
  const aq = new AdaptiveQuality({ tier: 'high', maxTier: 'high' });
  const ev = feed(aq, 40, 60);               // 25 fps on an uncapped (60 fps budget) tier
  assert.equal(ev[0].kind, 'scale'); assert.ok(ev[0].scale < 1);
  assert.ok(ev.some((e) => e.kind === 'tier'));
  assert.ok(aq.scale >= MIN_SCALE - 1e-9);
  assert.equal(aq.tier, 'low');
});
test('adaptive: a healthy 30 fps cap on LOW stays put (no pointless changes)', () => {
  const aq = new AdaptiveQuality({ tier: 'low', maxTier: 'low' });
  assert.deepEqual(feed(aq, 33.3, 30), []);
});
test('adaptive: healthy device on LOW (cap medium) is promoted once headroom is proven', () => {
  const aq = new AdaptiveQuality({ tier: 'low', maxTier: 'medium' });
  const ev = feed(aq, 33.3, 20);
  assert.ok(ev.some((e) => e.tier === 'medium'), 'promoted to medium');
});
test('adaptive: failed promotion is reverted and never retried (no flip-flop)', () => {
  const aq = new AdaptiveQuality({ tier: 'low', maxTier: 'medium' });
  let t = 0; const ev = [];
  const step = (ms) => { t += ms; const r = aq.sample(ms, t); if (r) ev.push(r); };
  while (aq.tier === 'low' && t < 30000) step(33.3);       // healthy 30 fps on low...
  assert.equal(aq.tier, 'medium', 'promoted once headroom was proven');
  for (let i = 0; i < 400 && aq.tier === 'medium'; i++) step(40);   // ...but medium only manages 25 fps
  assert.equal(aq.tier, 'low'); assert.ok(ev.some((e) => e.kind === 'revert'), 'step up was reverted');
  const before = ev.length;
  for (let i = 0; i < 2500; i++) step(33.3);               // 80+ s of healthy low
  assert.equal(aq.tier, 'low'); assert.equal(ev.length, before, 'medium is blocked for good');
});
test('adaptive: hitches (tab switches) are ignored', () => {
  const aq = new AdaptiveQuality({ tier: 'high' });
  for (let i = 0; i < 20; i++) assert.equal(aq.sample(2000, i * 2000), null);
});
test('adaptive: disabled controller never changes anything', () => {
  const aq = new AdaptiveQuality({ tier: 'high', enabled: false });
  assert.deepEqual(feed(aq, 80, 30), []);
});

test('FOV: wide phone landscape, 16:9 desktop, portrait phone all stay in sane ranges', () => {
  const hfov = (v, a) => (2 * Math.atan(Math.tan((v * Math.PI) / 360) * a) * 180) / Math.PI;
  for (const a of [2.17, 16 / 9, 4 / 3, 0.46]) {
    const v = computeVerticalFov(a);
    assert.ok(v >= 30 && v <= 86, `vfov ${v} @${a}`);
    const h = hfov(v, a);
    assert.ok(h <= 101, `hfov too wide ${h} @${a}`);
    if (a > 1) assert.ok(h >= 62, `hfov ${h} @${a}`);
  }
  assert.ok(computeVerticalFov(0.46) > computeVerticalFov(1.78), 'portrait widens vertical FOV');
});
