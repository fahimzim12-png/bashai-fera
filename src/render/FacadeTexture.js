// Draws ONE small window-pattern texture at start-up (no image download needed).
// It covers 4 window bays x 4 floors (12 m x 12.8 m of wall) and repeats across every building.
// The texture is near-white so each building's own wall colour tints it.
import * as THREE from 'three';
import { Rng } from '../core/Rng.js';

export function createFacadeTexture() {
  const size = 256, cell = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rng = new Rng('facade-v1');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * cell, y = row * cell;
      // floor slab (bottom edge of each cell = a floor boundary in the 3D wall)
      ctx.fillStyle = 'rgba(60,50,40,0.20)';
      ctx.fillRect(x, y + cell - 5, cell, 5);
      // window glass
      const g = ctx.createLinearGradient(0, y + 14, 0, y + 48);
      const lit = rng.chance(0.12);
      if (lit) { g.addColorStop(0, '#f6cf8b'); g.addColorStop(1, '#e8a95c'); }
      else { g.addColorStop(0, '#2c3b4b'); g.addColorStop(1, '#5d7186'); }
      ctx.fillStyle = g;
      ctx.fillRect(x + 12, y + 14, 40, 34);
      // curtains / shutters / grille variety
      const v = rng.next();
      if (v < 0.18) { ctx.fillStyle = 'rgba(222,205,170,0.85)'; ctx.fillRect(x + 12, y + 14, 40, 14); }
      else if (v < 0.30) { ctx.fillStyle = '#6f7d62'; ctx.fillRect(x + 12, y + 14, 18, 34); ctx.fillRect(x + 34, y + 14, 18, 34); }
      else if (v < 0.55) {                                       // balcony grille
        ctx.strokeStyle = 'rgba(30,30,30,0.7)'; ctx.lineWidth = 2;
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + 10 + k * 11, y + 30); ctx.lineTo(x + 10 + k * 11, y + 54); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x + 10, y + 30); ctx.lineTo(x + 54, y + 30); ctx.stroke();
      }
      // frame + sill
      ctx.strokeStyle = 'rgba(40,36,30,0.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(x + 12, y + 14, 40, 34);
      ctx.fillStyle = '#efe9dc'; ctx.fillRect(x + 9, y + 48, 46, 4);
      // air-conditioner box (very common sight)
      if (rng.chance(0.16)) { ctx.fillStyle = '#d7d7d2'; ctx.fillRect(x + 40, y + 36, 20, 13); ctx.fillStyle = '#9a9a96'; ctx.fillRect(x + 43, y + 40, 14, 5); }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 1;               // keep GPU work low on phones
  return tex;
}
