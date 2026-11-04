# Asset & licence log

Every third-party file used by the game must be listed here (source, author, licence).
Rule: nothing goes into the repository without a clear licence that allows free use in a public game.
No Google Maps imagery. Anything "non-commercial", "no derivatives" or of unclear origin is rejected.
`tests/assets.test.mjs` enforces this: every file under `assets/` (except this log) must have a row below.

## Code / libraries
| Item | Version | Licence | Where |
|---|---|---|---|
| Three.js | 0.187.0 (r187), minified with esbuild, licence headers kept | MIT | `vendor/three/` (licence text in `vendor/three/LICENSE`) |

## Fonts
| Item | Licence | Where |
|---|---|---|
| Hind Siliguri (subset to Bengali block + Latin, used for signboard textures) | SIL Open Font License 1.1 (`assets/fonts/OFL.txt`) | `assets/fonts/HindSiliguri-Regular.ttf`, `assets/fonts/HindSiliguri-Bold.ttf` |
| Bricolage Grotesque (UI, loaded from Google Fonts at runtime) | SIL Open Font License 1.1 | runtime |

## 3D models, textures, audio, illustrations
All world geometry is original parametric geometry generated in code. Signboards are painted at
start-up onto a canvas atlas with the bundled Hind Siliguri font — the sign **texts** are original
fictional shop names written for this game (no real brands), so no third-party rights apply.
Procedural audio (M3) is synthesized at runtime with WebAudio — no recordings, no licences needed.
Milestone 4 adds two start-up-painted texture atlases (road surfaces, dual facade variants) —
still 100% original canvas-generated art, no third-party textures.

## Textures (files under `assets/textures/`)
| File | Source URL | Author | Licence | Added | Derivation |
|---|---|---|---|---|---|
| (none yet) | | | | | |

## Reference data
| Item | Licence | Notes |
|---|---|---|
| OpenStreetMap | ODbL (attribution required) | **Milestone 4: USED.** The route centreline, junction list and landmark positions in `data/routes/farmgate-saarc.json` are fitted to real OSM geometry (extract 2026-11-04, kept for audit in `docs/route-research/`). Game credits must carry "Route geometry based on data © OpenStreetMap contributors (ODbL)". |
| Wikipedia: SAARC Fountain (Nitun Kundu steel sculpture, ~9.75 m, 32 m pool; coordinates 23.74987, 90.39323; typically dry in recent years) | Facts only, cited in route JSON `provenance` | Used as modelling dimensions + condition reference for the landmark; no image assets taken from Wikipedia. |
| Press reporting (The Daily Star, Prothom Alo, bdnews24): Farmgate footbridge 2023 rebuild, MRT-6 stations/details, Elevated Expressway ramps, Kawran Bazar market anatomy | Facts only, cited in route JSON `provenance` | No text or imagery reproduced; facts used as modelling ground truth. |
