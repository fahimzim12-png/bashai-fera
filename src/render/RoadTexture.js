// Road/ground surface atlas (Milestone 4): ONE 512x512 canvas carrying the art-directed
// Dhaka street detail that vertex colours alone could not give: patchwork asphalt with tar
// seams, oil lanes and wheel polish; concrete paver footpaths with stains; concrete median.
// Layout (x columns, full height, v tiles along the road via RepeatWrapping):
//   [0..320)  road       (u 0.000..0.625)   9.6-10.5 m across, 10 m per v repeat
//   [320..416) footpath  (u 0.625..0.8125)  ~3.5 m across, 4.8 m per v repeat
//   [416..512) median    (u 0.8125..1.0)    6-8 m across, 8 m per v repeat
// Texture values are painted at FINAL tone; chunk surfaces tint with near-white vertex
// colours (Lambert map x vertexColor x light), so district fog does the rest.
import * as THREE from 'three';
import { Rng } from '../core/Rng.js';
import { ROAD_U, PATH_U, MEDIAN_U, ROAD_V_METRES, PATH_V_METRES, MEDIAN_V_METRES } from './RoadAtlasUV.js';

export { ROAD_U, PATH_U, MEDIAN_U, ROAD_V_METRES, PATH_V_METRES, MEDIAN_V_METRES };

export function createRoadTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rng = new Rng('roads-v1');

  // ---- road region [0..320) -------------------------------------------------
  // M5: base lifted from #3b3e42 — in linear light under hemi-only (viaduct shadow) the
  // old value read near-black; this still reads as weathered asphalt but keeps detail.
  ctx.fillStyle = '#50545a';
  ctx.fillRect(0, 0, 320, size);
  // wheel-polish bands at lane centres (3 lanes across 9.6 m -> u 1/6, 3/6, 5/6 of 320 px)
  for (const cx of [320 / 6, 320 / 2, (320 * 5) / 6]) {
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(cx - 9, 0, 18, size);
    // oil drip streak at the centre of the band
    ctx.fillStyle = 'rgba(10,10,12,0.16)';
    const oy = rng.next() * size;
    ctx.fillRect(cx - 3, oy, 6, 30 + rng.next() * 50);
  }
  // patchwork: asphalt patches of slightly different age
  const patches = rng.int(5, 7);
  for (let p = 0; p < patches; p++) {
    const px = rng.next() * 280, py = rng.next() * size;
    const pw = 24 + rng.next() * 60, ph = 18 + rng.next() * 60;
    ctx.fillStyle = rng.chance(0.5) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.09)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pw, ph);
  }
  // tar seams running along the road (v direction)
  for (let k = 0; k < 3; k++) {
    const sx = 12 + rng.next() * 290;
    ctx.strokeStyle = 'rgba(16,16,18,0.5)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(sx, 0);
    for (let y = 0; y <= size; y += 64) ctx.lineTo(sx + (rng.next() - 0.5) * 8, y);
    ctx.stroke();
  }
  // silt tide-line near the kerb (monsoon trace)
  ctx.fillStyle = 'rgba(120,110,90,0.10)';
  ctx.fillRect(0, 0, 10, size); ctx.fillRect(310, 0, 10, size);
  // very subtle aggregate speckle (no heavy noise)
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = rng.chance(0.5) ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(rng.next() * 320, rng.next() * size, 1.4, 1.4);
  }

  // ---- footpath region [320..416) -------------------------------------------
  ctx.fillStyle = '#b3ac9e';
  ctx.fillRect(320, 0, 96, size);
  // paver joints: across every 24 px, along every 64 px (0.45 m pavers)
  ctx.strokeStyle = 'rgba(60,54,44,0.30)'; ctx.lineWidth = 1.5;
  for (let x = 320; x <= 416; x += 24) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, size); ctx.stroke(); }
  for (let y = 0; y <= size; y += 64) { ctx.beginPath(); ctx.moveTo(320, y + 0.5); ctx.lineTo(416, y + 0.5); ctx.stroke(); }
  // stains and dark patches
  for (let k = 0; k < 5; k++) {
    ctx.fillStyle = rng.chance(0.5) ? 'rgba(50,45,38,0.14)' : 'rgba(255,255,255,0.07)';
    const bx = 322 + rng.next() * 80, by = rng.next() * size;
    ctx.fillRect(bx, by, 8 + rng.next() * 22, 10 + rng.next() * 30);
  }
  // worn edge next to the road (footpath inner edge = right side of the region)
  ctx.fillStyle = 'rgba(40,36,30,0.16)';
  ctx.fillRect(404, 0, 12, size);

  // ---- median region [416..512) ----------------------------------------------
  ctx.fillStyle = '#a9a49a';
  ctx.fillRect(416, 0, 96, size);
  ctx.strokeStyle = 'rgba(70,66,58,0.32)'; ctx.lineWidth = 2;
  for (let y = 0; y <= size; y += 128) { ctx.beginPath(); ctx.moveTo(416, y + 0.5); ctx.lineTo(512, y + 0.5); ctx.stroke(); }
  for (let k = 0; k < 4; k++) {                          // grime streaks
    ctx.fillStyle = 'rgba(50,46,40,0.12)';
    ctx.fillRect(418 + rng.next() * 80, rng.next() * size, 5, 20 + rng.next() * 40);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 1;              // phone budget: same as the facade atlas
  return tex;
}
