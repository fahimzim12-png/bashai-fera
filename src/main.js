// Game entry point (loaded by game/index.html).
//
// URL options (handy for testing):
//   ?debug=1            show the developer overlay (FPS, draw calls, memory...). Press ` to toggle.
//   ?quality=low|medium|high   force a quality tier (turns adaptive quality off)
//   ?adapt=0            keep the starting tier, no automatic adjustment
//   ?speed=3            walk 3x faster (quick route testing)
//   ?at=620             start 620 m along the route (e.g. jump straight to Karwan Bazar)
import { Game } from './core/Game.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => { const v = parseFloat(q.get(k)); return Number.isFinite(v) ? v : d; };
const params = {
  debug: q.has('debug') && q.get('debug') !== '0',
  quality: q.get('quality'),
  adapt: q.get('adapt'),
  speed: num('speed', 1),
  at: num('at', 0),
};

const game = new Game(params);
window.__bashai = game;            // handy in the browser console while developing

game.init().catch((err) => {
  console.error(err);
  if (window.__bfFatal) window.__bfFatal(err && err.code === 'WEBGL' ? 'webgl' : 'error', err);
});
