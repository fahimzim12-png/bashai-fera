
---

## Milestone 4 notes

- Tests: `node --test tests/*.test.mjs` — 100 tests green at the M4 baseline. New suites:
  `route-geo` (real-corridor pinning), `camera` (spring/sway/reveal/intro/portrait),
  `likeliness` (trait schema), `integration` (whole-corridor walk with traffic + crowd +
  camera together). `camera.test.mjs` imports the vendored Three.js by relative path so the
  rig is Node-testable without any install.
- Smoke test (optional, needs Chromium): expectations updated for 10 landmarks (budget 22k),
  market screenshots at s>900, portrait jump `?at=950`.
- Licence: route geometry derives from OpenStreetMap (ODbL) — keep the
  "© OpenStreetMap contributors" credit line in any public credits screen.
- The protagonist's face uses placeholder traits (`src/player/likeliness.js`); the facial
  likeness stage (M4.9) activates only when the developer's reference photographs are provided,
  and ships only after a 3-view approval sheet.

## Milestone 5 notes

- Tests: `node --test tests/*.test.mjs` — 114 green at the M5 baseline. New suite:
  `m5-city` (parked-fleet placement, kerb-lane handover, bus dwell, zebra crossers,
  bus queues, trees/shelters reacting to dressing fields, tower skyline). Tier-policy
  tests rewritten for the raised hardware target; camera tests are config-driven.
- Visual QA: `scripts/` screenshot pass drives headless Chromium (SwiftShader) at the five
  verdict points (`?debug=1&quality=high&adapt=0&at=…`), asserting zero console errors.
  Baseline: ~70-90k triangles, ~90-125 draw calls, full crowd/traffic/parked budgets.
- URL params unchanged: `debug`, `quality`, `adapt`, `speed`, `at`.
- Known limitations: painted sky is one time-of-day (lighting JSON already parametrises
  others); parked fleet covers only `kerbParking` districts; crowd has no per-person
  collision with the player (by design — the player steers).
