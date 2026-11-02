import test from 'node:test';
import assert from 'node:assert/strict';
import { detectProfile, chooseTier, maxTierFor, TIERS } from '../src/render/tiers.js';
import { AdaptiveQuality, MIN_SCALE } from '../src/render/AdaptiveQuality.js';
import { computeVerticalFov } from '../src/camera/fov.js';

const REDMI9_UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';

test('Redmi 9 style device (Android Chrome, Mali GPU) starts on LOW and is capped at medium', () => {
  const p = detectProfile({ userAgent: REDMI9_UA, maxTouchPoints: 5, gpu: 'ANGLE (ARM, Mali-G52 MC2, OpenGL ES 3.2)', deviceMemory: 4, hardwareConcurrency: 8, dpr: 2.75, screenW: 393, screenH: 851 });
  assert.ok(p.isMobile); assert.equal(chooseTier(p), 'low'); assert.equal(maxTierFor(p), 'medium');
});
test('even with a hidden GPU string, any Android phone starts LOW', () => {
  const p = detectProfile({ userAgent: REDMI9_UA, maxTouchPoints: 5, gpu: '', screenW: 393, screenH: 851 });
  assert.equal(chooseTier(p), 'low');
});
test('desktop: discrete -> high, integrated -> medium, software -> low; override wins', () => {
  const d = (gpu) => detectProfile({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', maxTouchPoints: 0, gpu, screenW: 1920, screenH: 1080 });
  assert.equal(chooseTier(d('NVIDIA GeForce RTX 3060')), 'high');
  assert.equal(chooseTier(d('Intel(R) UHD Graphics 620')), 'medium');
  assert.equal(chooseTier(d('Google SwiftShader')), 'low');
  assert.equal(chooseTier(d('NVIDIA'), 'low'), 'low');
  assert.equal(maxTierFor(d('NVIDIA')), 'high');
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
