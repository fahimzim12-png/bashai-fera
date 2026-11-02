// Resolves paths from the PROJECT ROOT, no matter which page loads the game.
// Why: GitHub Pages serves this project under /bashai-fera/, so a path that
// starts with "/" would break. import.meta.url is the address of THIS file,
// so we can always find the project root relative to it.
const ROOT = new URL('../../', import.meta.url);

export function assetUrl(relPath) {
  return new URL(relPath, ROOT).href;
}
