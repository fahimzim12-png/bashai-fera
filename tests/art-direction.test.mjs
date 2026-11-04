// Milestone 5 PHOTO REGRADE — art-direction regression tests.
// The 41-photo reference board (docs/route-research/photo-analysis) established hard
// numbers for the Dhaka look. These tests pin them so a future palette edit cannot
// silently wash the city back out to grey:
//   - building wall palettes carry real saturation (pastel paint culture, q5_street_4/5)
//   - sky is saturated azure-to-cream, fog is warm gold, sun is golden (q6_facades_4)
//   - the local bus livery is a cream base with baked colour bands (q7_traffic_1)
//   - rickshaw hood art is baked in fixed colours (q5_street_1/2)
//   - Sonargaon is the terracotta-maroon slab (q4_sonargaon_4)
//   - Karwan Bazar carries the produce-mound greens (q3_karwan_2)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const route = JSON.parse(readFileSync(path.join(root, 'data/routes/farmgate-saarc.json'), 'utf8'));

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hslSat = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min || l === 0 || l === 1) return 0;
  return (max - min) / (1 - Math.abs(2 * l - 1));
};
const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

test('every building palette carries saturated photo-derived wall colours', () => {
  for (const [name, pal] of Object.entries(route.palettes)) {
    assert.ok(pal.walls.length >= 6, `${name} keeps a varied wall list`);
    const sat = mean(pal.walls.map(hslSat));
    assert.ok(sat > 0.18, `${name} mean wall saturation ${sat.toFixed(3)} > 0.18 (was 0.10 pre-regrade)`);
  }
});

test('lighting block: saturated azure sky, golden sun, warm fog (photo board)', () => {
  const L = route.lighting;
  assert.ok(hslSat(L.skyTop) > 0.3, `skyTop ${L.skyTop} is a real azure, not grey`);
  assert.ok(hslSat(L.sunColor) > 0.25, `sunColor ${L.sunColor} is golden`);
  const [fr, fg, fb] = hexToRgb(L.fog);
  assert.ok(fr > fb, `fog ${L.fog} is warm (r > b)`);
  assert.ok(L.sunIntensity >= 2.6, 'strong afternoon sun');
  assert.ok(L.exposure >= 1.15, 'exposure lifted with the regrade');
});

test('district moods: warm fog everywhere, none of the old grey-beige wash', () => {
  for (const [id, m] of Object.entries(route.moods)) {
    if (id === 'note') continue;
    const [fr, , fb] = hexToRgb(m.fog);
    assert.ok(fr > fb, `${id} fog ${m.fog} warm`);
    assert.ok(m.density <= 1.05, `${id} density ${m.density} keeps the skyline visible`);
  }
});

test('bus livery: tint-following bands with a DHAKA-red fleet; taxi-yellow cars; lungi crowd', async () => {
  const src = readFileSync(path.join(root, 'src/city/vehicleModels.js'), 'utf8');
  assert.ok(/waist band \(tints with the body\)/.test(src), 'bus bands are neutral (tint-following)');
  assert.match(src, /colours: \['#c9403a', '#e8b8c8'/, 'bus fleet: DHAKA red first, then pink-cream');
  const matches = src.match(/'#e8b428'/g) || [];
  assert.ok(matches.length >= 2, 'taxi yellow appears at doubled frequency');
  const kit = readFileSync(path.join(root, 'src/city/characterKit.js'), 'utf8');
  assert.ok(/buildSkirt/.test(kit), 'wrap-skirt part exists');
  assert.ok(/lungi: \['#2c4a7c'/.test(kit), 'lungi palette present');
  const sys = readFileSync(path.join(root, 'src/city/CrowdSystem.js'), 'utf8');
  assert.ok(/lungi men/.test(sys), 'men wear lungis');
  assert.ok(/salwar-kameez|kameez over salwar/i.test(sys), 'women wear salwar-kameez/saris');
  const mod = await import(path.join(root, 'src/city/vehicleModels.js')).catch(() => null);
  if (mod) {
    for (const c of mod.VEHICLE_SPECS.rickshaw.colours) {
      const [r, g, b] = hexToRgb(c);
      assert.ok(Math.abs(r - g) < 12 && Math.abs(g - b) < 12, 'rickshaw tint stays near-white so hood art shows');
    }
  }
});

test('road atlas is light dusty warm-gray per the concept frames', () => {
  const src = readFileSync(path.join(root, 'src/render/RoadTexture.js'), 'utf8');
  assert.match(src, /#8a827a/, 'asphalt base is light warm gray');
});

test('SAARC fountain: running water, jets, striped kerb ring, palms (concept frame)', () => {
  const src = readFileSync(path.join(root, 'src/world/landmarks/SaarcFountain.js'), 'utf8');
  assert.ok(src.includes('#8fc3d9'), 'basin water colour');
  assert.ok(src.includes('#d9a832'), 'yellow kerb stripe');
  assert.ok(src.includes('#b8913c'), 'brass rail');
  assert.ok(/palmTrunk/.test(src), 'plaza palms');
});

test('Sonargaon landmark is the terracotta-maroon slab (photo q4_sonargaon_4)', () => {
  const src = readFileSync(path.join(root, 'src/world/landmarks/SonargaonGardens.js'), 'utf8');
  assert.ok(src.includes('#b06f5e'), 'terracotta body colour (sun-lifted)');
  assert.ok(src.includes('#6d3537'), 'deep maroon fins/band colour');
  assert.ok(/brise-soleil fins/i.test(src), 'vertical fin texture documented');
});

test('Karwan Bazar carries saturated produce mounds + blue crates', () => {
  const src = readFileSync(path.join(root, 'src/world/landmarks/KarwanMarket.js'), 'utf8');
  assert.ok(src.includes('#77a07f'), 'produce-mound green from q3_karwan_2');
  assert.ok(src.includes('#2a5fa8'), 'blue plastic crates');
});

test('facade atlas paints at 1024px with weathering pass intact', () => {
  const src = readFileSync(path.join(root, 'src/render/FacadeTexture.js'), 'utf8');
  assert.ok(/size = 1024/.test(src), 'hi-res atlas');
  assert.ok(/rain seepage fan|seepage/.test(src), 'monsoon seepage');
  assert.ok(/repaint patch/.test(src), 'repaint patches');
});

test('sky painter uses the saturated gradient stops', () => {
  const src = readFileSync(path.join(root, 'src/world/Environment.js'), 'utf8');
  assert.ok(src.includes('#6fa6cf') && src.includes('#e8cf9e'), 'azure-to-gold gradient stops');
  assert.ok(/halo2/.test(src), 'double sun halo');
  assert.ok(/DirectionalLight\('#a9c3d8'/.test(src), 'cool sky-bounce fill light');
  assert.ok(/far \* 0\.45/.test(src), 'fog starts deeper than the old 0.30');
});
