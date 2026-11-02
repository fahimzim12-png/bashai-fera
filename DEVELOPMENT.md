# Developing Bashai Fera

## Run it on your computer
The game uses ES modules, so `index.html` will NOT work by double-clicking. Start a tiny local server in the project folder:

    python3 -m http.server 8000        (or: python -m http.server 8000 on Windows)

Then open  http://localhost:8000/  (landing page)  or  http://localhost:8000/game/  (game).
(VS Code users can use the "Live Server" extension instead.)

## URL options for the game page
| Option | Meaning |
|---|---|
| `?debug=1` | developer overlay: FPS, draw calls, triangles, memory, quality changes (press ` to toggle) |
| `?quality=low\|medium\|high` | force a quality tier (switches automatic adjustment off) |
| `?adapt=0` | keep the starting tier |
| `?speed=3` | walk 3x faster (quick testing) |
| `?at=620` | start 620 m along the route, e.g. straight at Karwan Bazar |

## Tests
    node tests/run.mjs        # 40 unit tests (route maths, input, player, quality logic, geometry). Needs Node 18+.
Optional real-browser smoke test (headless Chromium + software WebGL; checks logic/layout, not GPU speed):

    npm i playwright-core && CHROME=/path/to/chrome node tests/smoke.mjs http://localhost:8000

## Rules of the repo
* Use relative paths only (GitHub Pages serves the site under /bashai-fera/). File names are case-sensitive.
* Every external asset is logged in `assets/ASSETS.md` with its licence.
* Route facts must cite a source in `provenance` inside the route JSON. Schematic parts are marked as such.
* After deploying, hard-refresh (Ctrl+Shift+R) so the browser doesn't use cached files.

## About `play/`
`play/index.html` is an earlier single-file prototype ("The First Walk Home", Three.js from a CDN). It is separate from this
project and is not modified by it. The real game lives in `game/` + `src/`. Decide later whether to archive or delete `play/`.
