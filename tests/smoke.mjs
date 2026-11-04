// OPTIONAL developer smoke test (not needed to play). Drives the real game in headless Chromium
// with software WebGL, so it checks LOGIC and LAYOUT, not real GPU speed.
// Needs:  npm i playwright-core   and a Chromium binary (set CHROME=/path/to/chrome).
// Usage:  node tests/smoke.mjs http://localhost:8123 [outputDir]
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://localhost:8123';
const out = process.argv[3] || '/tmp/shots';
const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };

async function session(name, ctxOpts, query, fn) {
  const browser = await chromium.launch({ executablePath: exe, args });
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(m.text())) return;   // Google Fonts when offline: harmless
    errors.push('console: ' + m.text());
  });
  page.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errors.push('requestfailed: ' + r.url()); });
  console.log(`\n=== ${name} ===`);
  await page.goto(`${base}/game/${query}`, { waitUntil: 'load' });
  try { await fn(page, ctx); } catch (e) { check(false, `${name}: exception ${e.message}`); }
  check(errors.length === 0, `${name}: no console/page errors ${errors.length ? JSON.stringify(errors.slice(0, 5)) : ''}`);
  await browser.close();
}

const G = (page, fn) => page.evaluate(fn);
const state = (page) => G(page, () => {
  const g = window.__bashai;
  return {
    state: g?.sm?.name, s: g?.player?.s, x: g?.player?.x, tier: g?.quality?.tier?.name, scale: g?.quality?.scale,
    chunks: g?.chunks?.loadedCount, calls: g?.renderer?.info?.render?.calls, tris: g?.renderer?.info?.render?.triangles,
    landmarks: g?.landmarks?.entries?.length, landmarkVis: g?.landmarks?.visibleCount, landmarkTris: g?.landmarks?.stats?.triangles,
    crowdVis: g?.crowd?.stats?.visible, crowdPop: g?.crowd?.people?.length,
    traffic: g?.traffic?.vehicles?.filter?.(v => v._active)?.length,
    audioOn: !!g?.audio?.ctx,
    gpu: g?.profile?.gpu, w: g?.renderer?.domElement?.width, h: g?.renderer?.domElement?.height, ema: g?.frameEma,
  };
});
const waitReady = (page) => page.waitForFunction(() => window.__bashai?.sm?.name === 'ready', null, { timeout: 90000 });
const waitFor = (page, fn, arg, timeout = 30000) => page.waitForFunction(fn, arg, { timeout, polling: 100 });
// where is the avatar on screen? (-1..1 = inside the view)
const onScreen = (page) => G(page, () => {
  const g = window.__bashai, v = g.avatar.root.position.clone(); v.y = 1.0; v.project(g.cameraRig.camera);
  return { x: v.x, y: v.y, z: v.z };
});
const inView = (p) => Math.abs(p.x) < 0.95 && p.y > -0.95 && p.y < 0.95 && p.z < 1;

async function steerExtremes(page, name, press, release) {
  await press('left');
  await waitFor(page, () => window.__bashai.player.x < -15.4);
  await release('left');
  await page.waitForTimeout(1500);
  let p = await onScreen(page);
  check(inView(p), `${name}: avatar stays on screen at the LEFT limit (ndc ${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
  await press('right');
  await waitFor(page, () => window.__bashai.player.x > -4.0, null, 40000);
  await release('right');
  await page.waitForTimeout(1500);
  p = await onScreen(page);
  check(inView(p), `${name}: avatar stays on screen at the RIGHT limit (ndc ${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
}

// ---- 1. Desktop ------------------------------------------------------------------------------------------
await session('desktop', { viewport: { width: 800, height: 450 } }, '?debug=1&adapt=0', async (page) => {
  await waitReady(page);
  await page.screenshot({ path: `${out}/d1-ready.png` });
  let st = await state(page);
  check(st.state === 'ready' && st.chunks >= 4, `desktop: reaches ready with chunks loaded (${st.chunks})`);
  check(st.landmarks >= 8 && st.landmarkTris > 3000 && st.landmarkTris < 22000,
    `desktop: ${st.landmarks} landmark meshes built, ${st.landmarkTris} tris total (budget < 22k)`);
  console.log('      gpu:', st.gpu, '| tier:', st.tier, '| canvas:', st.w + 'x' + st.h);
  await page.click('[data-action="start"]');
  await waitFor(page, () => window.__bashai.player.s > 3);
  st = await state(page);
  check(st.state === 'playing', `desktop: automatic forward walking begins (s=${st.s.toFixed(1)}, nobody pressed anything)`);
  await page.screenshot({ path: `${out}/d2-walking.png` });
  st = await state(page);
  check(st.crowdVis > 0 && st.crowdVis <= 36, `desktop: crowd visible ${st.crowdVis}/${st.crowdPop} population`);
  check(st.traffic > 0 && st.traffic <= 26, `desktop: traffic active ${st.traffic} vehicles`);
  check(st.audioOn, 'desktop: procedural ambience engine started after the start tap');

  const x0 = st.x;
  await page.keyboard.down('d'); await waitFor(page, (x) => window.__bashai.player.x > x + 0.8, x0); await page.keyboard.up('d');
  check(true, `desktop: D steers right (x ${x0.toFixed(2)} -> ${(await state(page)).x.toFixed(2)})`);
  const x1 = (await state(page)).x;
  await page.keyboard.down('ArrowLeft'); await waitFor(page, (x) => window.__bashai.player.x < x - 0.8, x1); await page.keyboard.up('ArrowLeft');
  check(true, `desktop: ArrowLeft steers left (x ${x1.toFixed(2)} -> ${(await state(page)).x.toFixed(2)})`);

  await steerExtremes(page, 'desktop', (d) => page.keyboard.down(d === 'left' ? 'a' : 'd'), (d) => page.keyboard.up(d === 'left' ? 'a' : 'd'));
  await page.screenshot({ path: `${out}/d3-steered.png` });

  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  st = await state(page); check(st.state === 'paused', 'desktop: Esc pauses');
  const sPaused = st.s; await page.waitForTimeout(800);
  st = await state(page); check(Math.abs(st.s - sPaused) < 1e-6, 'desktop: world frozen while paused');
  await page.screenshot({ path: `${out}/d4-paused.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  check((await state(page)).state === 'playing', 'desktop: Esc again resumes');
  await page.evaluate(() => window.__bashai.bus.emit('ui:restart')); await page.waitForTimeout(300);
  st = await state(page); check(st.state === 'playing' && st.s < 3, 'desktop: restart returns to the start');
  check(st.calls > 0 && st.calls < 100, `desktop: draw calls stay low (${st.calls}), triangles ${st.tris}`);
});

// ---- 2. Walk the whole route: chunk streaming + end screen --------------------------------------------------
await session('full-route', { viewport: { width: 480, height: 270 } }, '?debug=1&speed=40&adapt=0', async (page) => {
  await waitReady(page);
  await page.click('[data-action="start"]');
  let maxChunks = 0, maxBuild = 0, shot = false, shotFarmgate = false, shotFountain = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 170000) {
    await page.waitForTimeout(300);
    const st = await state(page);
    maxChunks = Math.max(maxChunks, st.chunks || 0);
    if (!shotFarmgate && st.s > 40) {                                   // under the footbridge arches
      await page.screenshot({ path: `${out}/f1-farmgate.png` }); shotFarmgate = true;
      check(st.landmarkVis >= 1, `full-route: footbridge in view at s=${st.s?.toFixed(0)} (${st.landmarkVis} landmarks visible)`);
    }
    if (!shot && st.s > 900) { await page.screenshot({ path: `${out}/r1-karwan.png` }); shot = true; }
    if (!shotFountain && st.s > 1150) {                                 // fountain terminus down the avenue
      await page.screenshot({ path: `${out}/f2-fountain.png` }); shotFountain = true;
      check(st.landmarkVis >= 1, `full-route: fountain visible ahead at s=${st.s?.toFixed(0)}`);
    }
    if (st.state === 'ended') break;
  }
  maxBuild = await G(page, () => window.__bashai.chunks.stats.maxBuildMs);
  const st = await state(page);
  check(st.state === 'ended', `full-route: reaches the SAARC end screen (s=${st.s?.toFixed(0)})`);
  check(maxChunks <= 8, `full-route: streaming keeps memory flat (max ${maxChunks} chunks loaded at once)`);
  console.log(`      slowest chunk build: ${maxBuild.toFixed(1)} ms (software-rendered sandbox CPU)`);
  await page.screenshot({ path: `${out}/r2-end.png` });
  const mem = await G(page, () => ({ g: window.__bashai.renderer.info.memory.geometries, t: window.__bashai.renderer.info.memory.textures }));
  check(mem.g < 40, `full-route: no geometry leak after streaming the whole route (${mem.g} geometries alive)`);
});

// ---- 3. Redmi 9-like phone: landscape, touch, high DPR, mobile UA ---------------------------------------------------
const redmi = {
  viewport: { width: 851, height: 393 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
};
await session('redmi9-like', redmi, '?debug=1&adapt=0', async (page) => {
  await waitReady(page);
  let st = await state(page);
  check(st.tier === 'low', `redmi9-like: starts on LOW tier (${st.tier})`);
  check(st.w <= 852 && st.h <= 394, `redmi9-like: render resolution capped (${st.w}x${st.h} instead of ${(851 * 2.75) | 0}x${(393 * 2.75) | 0})`);
  await page.screenshot({ path: `${out}/m1-ready.png` });
  await page.tap('[data-action="start"]');
  await waitFor(page, () => window.__bashai.sm.name === 'playing');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/m2-touch-hint.png` });
  const cdp = await page.context().newCDPSession(page);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const x0 = (await state(page)).x;
  await tp('touchStart', 700, 200); await waitFor(page, (x) => window.__bashai.player.x > x + 0.8, x0); await tp('touchEnd');
  check(true, `redmi9-like: holding the RIGHT half steers right (x ${x0.toFixed(2)} -> ${(await state(page)).x.toFixed(2)})`);
  const x1 = (await state(page)).x;
  await tp('touchStart', 120, 200); await waitFor(page, (x) => window.__bashai.player.x < x - 0.8, x1); await tp('touchEnd');
  check(true, `redmi9-like: holding the LEFT half steers left (x ${x1.toFixed(2)} -> ${(await state(page)).x.toFixed(2)})`);
  // both halves at once cancel out (first wait until the previous sideways motion has fully stopped)
  await waitFor(page, () => Math.abs(window.__bashai.player.vx) < 1e-6);
  const x2 = (await state(page)).x;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 200, id: 1 }, { x: 750, y: 200, id: 2 }] });
  await page.waitForTimeout(700); const x3 = (await state(page)).x;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check(Math.abs(x3 - x2) < 0.25, `redmi9-like: two fingers (left+right) cancel out (dx ${(x3 - x2).toFixed(2)})`);
  await steerExtremes(page, 'redmi9-like',
    (d) => tp('touchStart', d === 'left' ? 120 : 700, 200), () => tp('touchEnd'));
  await page.screenshot({ path: `${out}/m3-steered.png` });
});

// ---- 4. Portrait phone + a jump straight to Karwan Bazar ---------------------------------------------------------------
await session('portrait', { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, '?at=950&adapt=0', async (page) => {
  await waitReady(page);
  await page.screenshot({ path: `${out}/p0-ready.png` });
  await page.tap('[data-action="start"]');
  await waitFor(page, () => window.__bashai.sm.name === 'playing');
  await page.waitForTimeout(1200);
  const st = await state(page);
  check(st.s > 950, `portrait: starts at Karwan Bazar via ?at= (s=${st.s?.toFixed(0)})`);
  const cdp = await page.context().newCDPSession(page);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await steerExtremes(page, 'portrait', (d) => tp('touchStart', d === 'left' ? 60 : 330, 500), () => tp('touchEnd'));
  await page.screenshot({ path: `${out}/p1-portrait.png` });
});

// ---- 5. No WebGL -> friendly message, not a blank screen --------------------------------------------------------------------
{
  const browser = await chromium.launch({ executablePath: exe, args: ['--disable-gpu', '--disable-3d-apis', '--disable-webgl'] });
  const page = await (await browser.newContext({ viewport: { width: 800, height: 500 } })).newPage();
  await page.goto(`${base}/game/`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  console.log('\n=== no-webgl ===');
  check(await page.evaluate(() => !document.getElementById('fatal').hidden), 'no-webgl: friendly fatal-error screen is shown');
  await page.screenshot({ path: `${out}/e1-nowebgl.png` });
  await browser.close();
}

console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nALL SMOKE CHECKS PASSED');
process.exit(failures ? 1 : 0);
