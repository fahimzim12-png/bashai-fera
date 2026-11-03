// Paints the signboard atlas (see ../world/signCatalog.js) onto one canvas at start-up,
// using the bundled Hind Siliguri font (OFL, files in assets/fonts/). Bengali conjuncts
// and matras are shaped by the browser's own text engine at draw time. If the font fails
// to load the atlas still paints with the system sans-serif and `fontsLoaded` is false
// (the game never blocks on this - signs just lose their exact lettering).
import * as THREE from 'three';
import { assetUrl } from '../core/paths.js';
import { DESIGNS, LAYOUT, ATLAS_SIZE, CELL_W, CELL_H } from '../world/signCatalog.js';

async function loadFont(weight) {
  const file = weight === 700 ? 'HindSiliguri-Bold.ttf' : 'HindSiliguri-Regular.ttf';
  try {
    const face = new FontFace('Hind Siliguri', `url(${assetUrl(`assets/fonts/${file}`)})`, { weight: String(weight) });
    await face.load();
    document.fonts.add(face);
    return true;
  } catch (_) {
    return false;                                    // offline/dev: graceful fallback
  }
}

/** Paint one design cell: coloured board, accent band, Bengali headline + Latin subtext. */
function paintDesign(ctx, design, px, py) {
  const w = CELL_W * design.span, h = CELL_H;
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = design.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = design.band;                       // accent bands top + bottom
  ctx.fillRect(0, 0, w, 5);
  ctx.fillRect(0, h - 5, w, 5);

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const hasEn = design.en && design.en.length > 0;
  // main Bengali line: shrink-to-fit
  let size = hasEn ? 30 : 38;
  const name = '"Hind Siliguri", sans-serif';
  ctx.font = `700 ${size}px ${name}`;
  const maxW = w - 22;
  while (ctx.measureText(design.bn).width > maxW && size > 16) {
    size -= 2;
    ctx.font = `700 ${size}px ${name}`;
  }
  ctx.fillStyle = design.fg;
  ctx.fillText(design.bn, w / 2, hasEn ? 36 : 44);
  if (hasEn) {
    let es = 16;
    ctx.font = `400 ${es}px ${name}`;
    while (ctx.measureText(design.en).width > maxW && es > 9) {
      es -= 1;
      ctx.font = `400 ${es}px ${name}`;
    }
    ctx.fillStyle = design.band;
    ctx.fillText(design.en, w / 2, 57);
  }
  // subtle top-light so boards read as physical boxes
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255,255,255,0.14)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * @returns {Promise<{texture: THREE.CanvasTexture, fontsLoaded: boolean}>}
 */
export async function createSignAtlas() {
  const fontsLoaded = (await loadFont(400)) && (await loadFont(700));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#20242a';                         // unused cells: neutral dark
  ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  for (let i = 0; i < DESIGNS.length; i++) {
    const c = LAYOUT[i];
    paintDesign(ctx, DESIGNS[i], c.col * CELL_W, c.row * CELL_H);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;                            // text needs a little more than facades
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return { texture, fontsLoaded };
}
