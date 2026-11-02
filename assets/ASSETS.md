# Asset & licence log

Every third-party file used by the game must be listed here (source, author, licence).
Rule: nothing goes into the repository without a clear licence that allows free use in a public game.
No Google Maps imagery. Anything "non-commercial", "no derivatives" or of unclear origin is rejected.

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
None yet. Milestone 1 geometry is 100% procedural (generated in code) and the window texture is
drawn at start-up on a canvas. The placeholder father character and SAARC Fountain are original,
generic geometry (see `data/routes/farmgate-saarc.json` landmark notes).

## Reference data
| Item | Licence | Notes |
|---|---|---|
| OpenStreetMap | ODbL (attribution required) | NOT used yet. If route geometry is derived from OSM later, credit "© OpenStreetMap contributors" in the game credits. |
