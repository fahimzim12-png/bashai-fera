// Draws ONE small window-pattern texture at start-up (no image download needed).
// Milestone 2: 512 px, 8x8 window bays (24 m x 25.6 m of wall) with ten bay archetypes
// (lit, curtained, balcony grille, laundry balcony, AC cluster, shuttered, brick patch...)
// so two buildings of the same wall colour no longer look like twins.
// The texture stays near-white so each building's own wall colour tints it.
import * as THREE from 'three';
import { Rng } from '../core/Rng.js';

export function createFacadeTexture() {
  const size = 512, cell = 64, n = 8;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rng = new Rng('facade-v2');
  const CLOTH = ['#d94f3f', '#3fa0d9', '#e8e3d2', '#4fae6b', '#e2b23f', '#c56da0'];

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // subtle per-floor value band so facades read as floors from afar
  for (let row = 0; row < n; row++) {
    ctx.fillStyle = row % 2 === 0 ? 'rgba(60,50,40,0.05)' : 'rgba(60,50,40,0.02)';
    ctx.fillRect(0, row * cell, size, cell);
  }

  const bay = (x, y) => {
    const roll = rng.next();
    const wx = x + 12, wy = y + 14, ww = 40, wh = 34;

    // 1) window opening (shared by most archetypes)
    const drawWindow = (lit) => {
      const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
      if (lit) { g.addColorStop(0, '#f6cf8b'); g.addColorStop(1, '#e8a95c'); }
      else { g.addColorStop(0, '#2c3b4b'); g.addColorStop(1, '#5d7186'); }
      ctx.fillStyle = g;
      ctx.fillRect(wx, wy, ww, wh);
    };
    const frameSill = () => {
      ctx.strokeStyle = 'rgba(40,36,30,0.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(wx, wy, ww, wh);
      ctx.fillStyle = '#efe9dc'; ctx.fillRect(x + 9, y + 48, 46, 4);
    };
    const grille = () => {
      ctx.strokeStyle = 'rgba(30,30,30,0.7)'; ctx.lineWidth = 2;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + 10 + k * 11, y + 30); ctx.lineTo(x + 10 + k * 11, y + 54); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x + 10, y + 30); ctx.lineTo(x + 54, y + 30); ctx.stroke();
    };

    if (roll < 0.09) {                                   // lit at dusk
      drawWindow(true); frameSill();
    } else if (roll < 0.27) {                            // plain glass
      drawWindow(false); frameSill();
    } else if (roll < 0.36) {                            // curtains
      drawWindow(false);
      ctx.fillStyle = 'rgba(222,205,170,0.85)'; ctx.fillRect(wx, wy, ww, 14);
      frameSill();
    } else if (roll < 0.48) {                            // balcony grille
      drawWindow(false); grille(); frameSill();
    } else if (roll < 0.56) {                            // laundry balcony: grille + hanging cloth
      drawWindow(false); grille();
      const k = 2 + rng.int(0, 1);
      for (let i = 0; i < k; i++) {
        ctx.fillStyle = CLOTH[rng.int(0, CLOTH.length - 1)];
        ctx.fillRect(x + 12 + i * 16 + rng.next() * 4, y + 32, 9, 12 + rng.next() * 6);
      }
    } else if (roll < 0.68) {                            // AC box beside a smaller window
      drawWindow(false);
      ctx.fillStyle = '#d7d7d2'; ctx.fillRect(x + 40, y + 36, 20, 13);
      ctx.fillStyle = '#9a9a96'; ctx.fillRect(x + 43, y + 40, 14, 5);
      ctx.fillStyle = 'rgba(50,45,40,0.10)'; ctx.fillRect(x + 42, y + 49, 16, 10);  // drip stain
      frameSill();
    } else if (roll < 0.76) {                            // shuttered / bricked-up bay
      ctx.fillStyle = 'rgba(120,112,100,0.55)'; ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeStyle = 'rgba(60,55,48,0.5)'; ctx.lineWidth = 1;
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(wx, wy + 4 + k * 6); ctx.lineTo(wx + ww, wy + 4 + k * 6); ctx.stroke(); }
    } else if (roll < 0.84) {                            // small high window, bare wall
      ctx.fillStyle = '#2c3b4b'; ctx.fillRect(x + 24, y + 16, 16, 12);
      ctx.strokeStyle = 'rgba(40,36,30,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 24, y + 16, 16, 12);
    } else if (roll < 0.90) {                            // exposed brick patch (unplastered, very Dhaka)
      ctx.fillStyle = 'rgba(150,82,60,0.5)'; ctx.fillRect(x + 6, y + 8, 52, 48);
      ctx.strokeStyle = 'rgba(90,45,32,0.35)'; ctx.lineWidth = 1;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + 6, y + 14 + k * 9); ctx.lineTo(x + 58, y + 14 + k * 9); ctx.stroke(); }
      ctx.fillStyle = '#2c3b4b'; ctx.fillRect(x + 24, y + 22, 16, 20);
    } else {                                             // bare wall: vent + grime streak
      ctx.fillStyle = 'rgba(70,66,60,0.6)'; ctx.fillRect(x + 26, y + 18, 12, 8);
      ctx.fillStyle = 'rgba(50,45,38,0.08)'; ctx.fillRect(x + 20 + rng.next() * 20, y + 26, 6, 34);
    }

    // floor slab shadow along the bottom edge of every cell
    ctx.fillStyle = 'rgba(60,50,40,0.20)';
    ctx.fillRect(x, y + cell - 5, cell, 5);

    // occasional grime streak running down from the slab
    if (rng.chance(0.12)) {
      ctx.fillStyle = 'rgba(45,40,34,0.10)';
      ctx.fillRect(x + 6 + rng.next() * 44, y + cell - 5, 4, 0);   // (kept inside cell; streaks read at slab joints)
      ctx.fillRect(x + 6 + rng.next() * 44, y + cell - 24, 3, 19);
    }
  };

  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) bay(col * cell, row * cell);

  // 1-2 vertical drainpipes so walls get a full-height line to break the grid
  const pipes = rng.int(1, 2);
  for (let p = 0; p < pipes; p++) {
    const px = 8 + rng.int(0, n - 1) * cell + rng.int(4, 40);
    ctx.fillStyle = 'rgba(55,52,48,0.45)';
    ctx.fillRect(px, 0, 4, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 1;               // keep GPU work low on phones
  return tex;
}
