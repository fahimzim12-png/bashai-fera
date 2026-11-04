// Draws facade window-pattern textures at start-up (no image download needed).
// M5 PHOTO REGRADE: the reference board (docs/route-research/photo-analysis) showed that
// Dhaka facades read through CONTRAST — deep dark openings punched in bright painted
// plaster, hard slab shadow lines every floor, grime streaked under every window — and
// through COLOR accents (mint/pink/blue repaint panels, red brick, laundry) rather than
// uniform beige. This atlas is painted at 1024px (8x8 bays, 128px cells) with:
//   - floor slab shadow + sill highlight on every cell (reads as real floors from afar)
//   - darker, glassier windows with a sky-reflection gradient
//   - balcony slabs with railing shadows, AC boxes, grilles, laundry
//   - heavier monsoon weathering: seepage fans, mould blooms, repaint patches, poster ghosts
// The texture stays bright so each building's own wall colour (saturated pastels from the
// photo palettes) tints it.
import * as THREE from 'three';
import { Rng } from '../core/Rng.js';

export function createFacadeTexture(variant = 'residential') {
  const size = 1024, cell = 128, n = 8;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const comm = variant === 'commercial';
  const rng = new Rng(comm ? 'facade-m5-commercial' : 'facade-m5-residential');
  const CLOTH = ['#d94f3f', '#3fa0d9', '#e8e3d2', '#4fae6b', '#e2b23f', '#c56da0'];

  // bright plaster base (vertex colour does the tinting)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // subtle per-floor value band so facades read as floors from afar
  for (let row = 0; row < n; row++) {
    ctx.fillStyle = row % 2 === 0 ? 'rgba(60,50,40,0.05)' : 'rgba(60,50,40,0.02)';
    ctx.fillRect(0, row * cell, size, cell);
  }

  const bay = (x, y) => {
    const roll = rng.next();
    const wx = x + 26, wy = y + 28, ww = 76, wh = 66;   // window inside the 128px cell

    const drawWindow = (lit) => {
      // glass: deep opening with a sky-reflection sheen at the top
      const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
      if (lit) { g.addColorStop(0, '#ffe9b0'); g.addColorStop(1, '#e8a95c'); }
      else { g.addColorStop(0, '#5d7c94'); g.addColorStop(0.35, '#22323f'); g.addColorStop(1, '#132029'); }
      ctx.fillStyle = g;
      ctx.fillRect(wx, wy, ww, wh);
      // reflection slash
      ctx.fillStyle = 'rgba(210,230,240,0.20)';
      ctx.beginPath();
      ctx.moveTo(wx + 6, wy + wh); ctx.lineTo(wx + 26, wy); ctx.lineTo(wx + 40, wy); ctx.lineTo(wx + 20, wy + wh);
      ctx.closePath(); ctx.fill();
    };
    const frameSill = () => {
      ctx.strokeStyle = 'rgba(40,36,30,0.65)'; ctx.lineWidth = 3;
      ctx.strokeRect(wx, wy, ww, wh);
      // projecting concrete sill with a shadow under it
      ctx.fillStyle = 'rgba(255,255,250,0.85)'; ctx.fillRect(x + 16, y + 94, 96, 7);
      ctx.fillStyle = 'rgba(40,34,28,0.30)'; ctx.fillRect(x + 16, y + 101, 96, 5);
    };
    const grille = () => {
      ctx.strokeStyle = 'rgba(30,30,30,0.75)'; ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x + 24 + k * 14, y + 40); ctx.lineTo(x + 24 + k * 14, y + 94); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x + 22, y + 42); ctx.lineTo(x + 106, y + 42); ctx.stroke();
    };
    const acBox = (ax, ay) => {
      ctx.fillStyle = '#d9d9d2'; ctx.fillRect(ax, ay, 34, 22);
      ctx.fillStyle = '#97978f'; ctx.fillRect(ax + 4, ay + 6, 26, 8);
      ctx.fillStyle = 'rgba(50,45,40,0.14)'; ctx.fillRect(ax + 3, ay + 30, 28, 16);   // drip stain
    };

    if (comm) {
      // commercial: glass curtain cells, mirror bands, AC clusters, shutters, tin + rust
      if (roll < 0.30) {                                   // glass curtain wall: mullions + sky
        const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
        g.addColorStop(0, '#7fa3ba'); g.addColorStop(0.5, '#2c3f50'); g.addColorStop(1, '#5d7688');
        ctx.fillStyle = g; ctx.fillRect(x + 6, y + 20, cell - 12, wh + 22);
        ctx.strokeStyle = 'rgba(230,238,244,0.5)'; ctx.lineWidth = 2;
        for (let k = 0; k <= 4; k++) { const mx = x + 6 + (k / 4) * (cell - 12); ctx.beginPath(); ctx.moveTo(mx, y + 20); ctx.lineTo(mx, y + 20 + wh + 22); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x + 6, y + 22 + wh / 2); ctx.lineTo(x + cell - 6, y + 22 + wh / 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 10, y + 24, cell - 40, 8);
      } else if (roll < 0.48) {                            // mirror glass band
        const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
        g.addColorStop(0, '#6d8ba0'); g.addColorStop(0.5, '#243542'); g.addColorStop(1, '#7a92a2');
        ctx.fillStyle = g; ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(wx, wy, ww - 24, 9);
        frameSill();
      } else if (roll < 0.62) {                            // AC cluster + small windows
        ctx.fillStyle = '#22323f'; ctx.fillRect(wx, wy + 4, 30, 22); ctx.fillRect(wx, wy + 34, 30, 20);
        acBox(wx + 38, wy + 8);
        frameSill();
      } else if (roll < 0.72) {                            // roller shutter
        ctx.fillStyle = 'rgba(126,116,104,0.65)'; ctx.fillRect(wx - 6, wy - 8, ww + 12, wh + 16);
        ctx.strokeStyle = 'rgba(60,55,48,0.55)'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.moveTo(wx - 6, wy - 2 + k * 9); ctx.lineTo(wx + ww + 6, wy - 2 + k * 9); ctx.stroke(); }
      } else if (roll < 0.82) {                            // rust-streaked tin patch
        ctx.fillStyle = 'rgba(158,150,138,0.55)'; ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
        ctx.strokeStyle = 'rgba(126,90,60,0.45)'; ctx.lineWidth = 2.5;
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(wx + 12 + k * 18, wy - 4); ctx.lineTo(wx + 6 + k * 20, wy + wh + 4); ctx.stroke(); }
        ctx.fillStyle = 'rgba(140,84,48,0.35)'; ctx.fillRect(wx + 38, wy + 10, 10, wh - 14);
      } else if (roll < 0.90) {                            // big painted sign-band shadow + vent
        ctx.fillStyle = 'rgba(40,40,44,0.4)'; ctx.fillRect(wx - 6, wy - 8, ww + 12, 18);
        ctx.fillStyle = 'rgba(70,66,60,0.6)'; ctx.fillRect(wx + 30, wy + 30, 18, 14);
      } else {                                             // lit office at dusk
        drawWindow(true); frameSill();
      }
    } else if (roll < 0.08) {                              // lit at dusk
      drawWindow(true); frameSill();
    } else if (roll < 0.26) {                              // plain glass
      drawWindow(false); frameSill();
    } else if (roll < 0.35) {                              // curtains
      drawWindow(false);
      ctx.fillStyle = 'rgba(232,214,180,0.9)'; ctx.fillRect(wx + 2, wy + 2, ww - 4, 18);
      frameSill();
    } else if (roll < 0.47) {                              // balcony grille
      drawWindow(false); grille(); frameSill();
    } else if (roll < 0.56) {                              // laundry balcony
      drawWindow(false); grille();
      const k = 2 + rng.int(0, 2);
      for (let i = 0; i < k; i++) {
        ctx.fillStyle = CLOTH[rng.int(0, CLOTH.length - 1)];
        ctx.fillRect(x + 18 + i * 17 + rng.next() * 5, y + 46, 11, 16 + rng.next() * 8);
      }
    } else if (roll < 0.66) {                              // AC box beside window
      drawWindow(false);
      acBox(x + 80, y + 52);
      frameSill();
    } else if (roll < 0.74) {                              // shuttered bay
      ctx.fillStyle = 'rgba(126,118,106,0.6)'; ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
      ctx.strokeStyle = 'rgba(60,55,48,0.55)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(wx - 4, wy + 2 + k * 8.4); ctx.lineTo(wx + ww + 4, wy + 2 + k * 8.4); ctx.stroke(); }
    } else if (roll < 0.82) {                              // small high window, bare wall
      ctx.fillStyle = '#22323f'; ctx.fillRect(x + 44, y + 22, 30, 22);
      ctx.strokeStyle = 'rgba(40,36,30,0.55)'; ctx.lineWidth = 2.5; ctx.strokeRect(x + 44, y + 22, 30, 22);
    } else if (roll < 0.89) {                              // exposed brick patch
      ctx.fillStyle = 'rgba(168,98,74,0.62)'; ctx.fillRect(x + 10, y + 12, cell - 20, cell - 34);
      ctx.strokeStyle = 'rgba(110,58,42,0.4)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(x + 10, y + 20 + k * 12); ctx.lineTo(x + cell - 10, y + 20 + k * 12); ctx.stroke(); }
      ctx.fillStyle = '#22323f'; ctx.fillRect(x + 44, y + 32, 28, 30);
    } else {                                               // bare wall: vent + grime
      ctx.fillStyle = 'rgba(70,66,60,0.62)'; ctx.fillRect(x + 50, y + 26, 20, 12);
      ctx.fillStyle = 'rgba(50,45,38,0.09)'; ctx.fillRect(x + 30 + rng.next() * 40, y + 42, 9, 66);
    }

    // ---- weathering pass (M5 regrade: heavier, photo-sourced) ----
    const weather = rng.next();
    if (weather < 0.34) {
      // rain seepage fan under the opening: widens as it runs down
      const sx = wx + 4 + rng.next() * (ww - 16);
      ctx.fillStyle = 'rgba(52,48,42,0.11)';
      ctx.beginPath();
      ctx.moveTo(sx, y + 100); ctx.lineTo(sx + 14, y + 100);
      ctx.lineTo(sx + 30, y + 126); ctx.lineTo(sx - 12, y + 126);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(52,48,42,0.17)';
      ctx.fillRect(sx, y + 108, 7, 18);
    } else if (weather < 0.47) {
      // mould bloom hugging a corner (green-grey, translucent)
      ctx.fillStyle = 'rgba(98,110,86,0.16)';
      const mx = rng.next() < 0.5 ? x + 4 : x + cell - 30;
      ctx.beginPath();
      ctx.ellipse(mx + 12, y + 14 + rng.next() * 88, 12 + rng.next() * 12, 9 + rng.next() * 9, rng.next() * 3, 0, 7);
      ctx.fill();
    } else if (weather < 0.60) {
      // repaint patch: brighter sharp rectangle (the pastel repaint culture)
      ctx.fillStyle = 'rgba(255,255,250,0.30)';
      ctx.fillRect(x + 6 + rng.next() * 26, y + 4 + rng.next() * 16, 30 + rng.next() * 30, 22 + rng.next() * 24);
      ctx.fillStyle = 'rgba(90,80,70,0.08)';
      ctx.fillRect(x + 6 + rng.next() * 26, y + 4 + rng.next() * 16, 20 + rng.next() * 20, 16 + rng.next() * 18);
    } else if (weather < 0.68) {
      // poster glue ghost with torn edges
      ctx.fillStyle = 'rgba(236,230,214,0.42)';
      const gx = x + 14 + rng.next() * 52, gy = y + 10 + rng.next() * 20;
      ctx.fillRect(gx, gy, 24 + rng.next() * 16, 28 + rng.next() * 16);
      ctx.fillStyle = 'rgba(180,170,150,0.35)';
      ctx.fillRect(gx + rng.next() * 10, gy + 34, 9, 6);
    }

    // floor slab: light top edge + hard shadow along the bottom of every cell
    ctx.fillStyle = 'rgba(255,255,250,0.5)';
    ctx.fillRect(x, y + cell - 9, cell, 4);
    ctx.fillStyle = 'rgba(45,38,32,0.28)';
    ctx.fillRect(x, y + cell - 5, cell, 5);

    // grime streaks running down from the slab
    if (rng.chance(0.3)) {
      ctx.fillStyle = 'rgba(45,40,34,0.11)';
      ctx.fillRect(x + 8 + rng.next() * 96, y + cell - 40, 4, 35);
    }
    if (rng.chance(0.16)) {
      ctx.fillStyle = 'rgba(122,74,42,0.16)';               // rust wash from a railing
      ctx.fillRect(x + 20 + rng.next() * 70, y + cell - 30, 3, 25);
    }
  };

  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) bay(col * cell, row * cell);

  // 1-2 vertical drainpipes so walls get a full-height line to break the grid
  const pipes = rng.int(1, 2);
  for (let p = 0; p < pipes; p++) {
    const px = 14 + rng.int(0, n - 1) * cell + rng.int(6, 90);
    ctx.fillStyle = 'rgba(55,52,48,0.5)';
    ctx.fillRect(px, 0, 7, size);
    ctx.fillStyle = 'rgba(255,255,250,0.18)';
    ctx.fillRect(px, 0, 2, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 2;               // oblique walls stay crisp on modern GPUs
  return tex;
}
