// Chooses the vertical field of view from the screen shape.
// Goal: on wide phones (Redmi 9 landscape is ~2.17:1) and on tall portrait phones the player
// still sees enough road to navigate, without extreme fish-eye distortion.
import { DEG } from '../core/MathUtil.js';
import { CONFIG } from '../core/Config.js';

export function computeVerticalFov(aspect, cfg = CONFIG.camera) {
  const a = Math.max(0.2, aspect);
  const hFov = (v) => 2 * Math.atan(Math.tan((v * DEG) / 2) * a) / DEG;   // degrees
  const vFromH = (h) => 2 * Math.atan(Math.tan((h * DEG) / 2) / a) / DEG;
  let v = cfg.vFovBase;
  if (hFov(v) > cfg.hFovMax) v = vFromH(cfg.hFovMax);       // too wide: narrow it
  if (hFov(v) < cfg.hFovMin) v = Math.min(cfg.vFovMax, vFromH(cfg.hFovMin));   // too narrow: widen it
  return v;
}
