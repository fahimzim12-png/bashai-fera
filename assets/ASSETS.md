# Asset & licence log

Every third-party file used by the game must be listed here (source, author, licence).
Rule: nothing goes into the repository without a clear licence that allows free use in a public game.
No Google Maps imagery. Anything "non-commercial", "no derivatives" or of unclear origin is rejected.
`tests/assets.test.mjs` enforces this: every file under `assets/` (except this log) must have a row below.

## Code / libraries
| Item | Version | Licence | Where |
|---|---|---|---|
| Three.js | 0.187.0 (r187), minified with esbuild, licence headers kept | MIT | `vendor/three/` (licence text in `vendor/three/LICENSE`) |

## Fonts (loaded from Google Fonts at runtime)
| Item | Licence |
|---|---|
| Hind Siliguri | SIL Open Font License 1.1 |
| Bricolage Grotesque | SIL Open Font License 1.1 |

## 3D models, textures, audio, illustrations
None yet — the game is still 100% procedural.

Milestone 2 kept this state on purpose: all landmark geometry (Farmgate footbridge, MRT-6 style station,
Karwan Bazar market sheds, SAARC fountain) is original parametric geometry generated in code from the
sourced facts in `data/routes/farmgate-saarc.json` (`provenance` + landmark notes). Facade/window patterns
are drawn at start-up on a canvas. Signboards use abstract shapes only — never real words, shop names or brands.

If photographic textures are added later (planned candidates: corrugated tin, grimy plaster, plaza paving),
source them CC0-first (ambientCG / Poly Haven) or CC BY with attribution; CC BY-SA needs an explicit sign-off.
Each processed file gets a row in the table below and the licence guard test keeps the ledger honest.

## Textures (files under `assets/textures/`)
| File | Source URL | Author | Licence | Added | Derivation |
|---|---|---|---|---|---|
| (none yet) | | | | | |

## Reference data
| Item | Licence | Notes |
|---|---|---|
| OpenStreetMap | ODbL (attribution required) | NOT used yet. If route geometry is derived from OSM later, credit "© OpenStreetMap contributors" in the game credits. |
| Wikipedia: SAARC Fountain (Nitun Kundu, 1985; ~9.75 m, 32 m pool; coordinates 23.749909, 90.393162) | Facts only, cited in route JSON `provenance` | Used as modelling dimensions for the landmark; no image assets taken from Wikipedia. |
