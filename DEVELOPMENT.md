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
    node tests/run.mjs        # 81 unit tests (route maths, input, player, walk cycle, quality logic, geometry, landmarks, traffic, crowd, sign catalogue, audio state, licence ledger). Needs Node 18+.
Optional real-browser smoke test (headless Chromium + software WebGL; checks logic/layout, not GPU speed):

    npm i playwright-core && CHROME=/path/to/chrome node tests/smoke.mjs http://localhost:8000

## Rules of the repo
* Use relative paths only (GitHub Pages serves the site under /bashai-fera/). File names are case-sensitive.
* Every external asset is logged in `assets/ASSETS.md` with its licence — and `tests/assets.test.mjs` fails the suite if a file in `assets/` has no ledger row.
* Route facts must cite a source in `provenance` inside the route JSON. Schematic parts are marked as such.
* Landmarks (Milestone 2) are scenery only: no collision, no interaction, no animation. Each kind lives in `src/world/landmarks/` and must be deterministic (a test builds each twice and compares the arrays).
* After deploying, hard-refresh (Ctrl+Shift+R) so the browser doesn't use cached files.

## About `play/`
`play/index.html` is an earlier single-file prototype ("The First Walk Home", Three.js from a CDN). It is separate from this
project and is not modified by it. The real game lives in `game/` + `src/`. Decide later whether to archive or delete `play/`.
