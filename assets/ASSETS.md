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

## Textures (files under `assets/textures/`)
| File | Source URL | Author | Licence | Added | Derivation |
|---|---|---|---|---|---|
| (none yet) | | | | | |

## Reference data
| Item | Licence | Notes |
|---|---|---|
| OpenStreetMap | ODbL (attribution required) | NOT used yet. If route geometry is derived from OSM later, credit "© OpenStreetMap contributors" in the game credits. |
| Wikipedia: SAARC Fountain (Nitun Kundu, 1985; ~9.75 m, 32 m pool; coordinates 23.749909, 90.393162) | Facts only, cited in route JSON `provenance` | Used as modelling dimensions for the landmark; no image assets taken from Wikipedia. |
