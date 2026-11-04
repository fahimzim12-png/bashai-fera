# Bashai Fera — architecture (living document)

Project: **বাসায় ফেরা · Bashai Fera — Every Journey Has a Story**
Stack: Three.js (vendored), vanilla JavaScript ES modules, HTML/CSS, static hosting (GitHub Pages). No build step.

## Confirmed design decisions
1. First route: Farmgate → Karwan Bazar → SAARC Fountain, authored (not procedural noise), with variable traffic and hazards.
2. Minimum device: Xiaomi Redmi 9 (Helio G80 / Mali-G52). Stronger devices get scalable quality.
3. Camera: third person, close behind the player, enough road visible to navigate.
4. Movement: **automatic forward walking + player left/right steering.** Keyboard (A/D, arrows) and touch (hold left/right half).
   *No hold-to-wait mechanic* (not agreed). Do not add one without a decision.
5. Visuals: simplified semi-realistic 3D; not cartoonish, not expensively realistic.
6. Backstory: 2D illustrated / motion-comic father-and-daughter story, separate from the 3D game:
   father leaves home → says goodbye to his little daughter ("আম্মু, যাচ্ছি। সন্ধ্যার আগেই ফিরে আসবো।") → goes to work →
   finishes office → leaves for home → illustrated animation transitions into 3D gameplay.
7. Hazards: **unpredictable.** Some have subtle environmental cues, some very little warning, some none.
   There is deliberately NO system that guarantees a warning for every hazard. Traffic should feel naturally chaotic.
8. Damage: context-based stumble, fall/recovery, or game-ending collision. No gore.
   *Open question:* whether injuries persist through a route. Nothing persistent is implemented; discuss before adding.
9. Memorials: only real, verifiable cases, handled respectfully. **Kept completely separate from gameplay scoring:**
   never rewards, achievements, collectibles or statistics.

## Core idea: route space
Every system describes positions as `(s, x)`: `s` = metres along the route's centre-line, `x` = sideways offset
(+ = player's right). `RouteSpace` converts to real 3D only for drawing. Traffic, hazards, audio zones, and landmarks all
become simple questions about `(s, x)`.

## Frame flow
`Input -> PlayerController -> (later: Traffic, Hazards, Collision, Damage) -> CameraRig -> ChunkManager -> Audio -> HUD -> Render`
Rules run at a fixed 60 Hz; drawing is interpolated and (on weak phones) capped to 30 fps.

## Folder map
```
index.html, style.css, js/landing.js   landing page (js/main.js is an unused older copy of landing.js)
game/                  game page (index.html + game.css). NOTE: play/ is a separate earlier prototype that this project does not touch
src/core/              Game (conductor), Loop, StateMachine, EventBus, Config, Rng, ObjectPool, WakeLock, paths
src/input/             keyboard + touch -> one steering number
src/world/             RouteSpace, RouteModel, validateRoute, ChunkBuilder (pure), ChunkManager, Environment, LandmarkManager
src/world/landmarks/   pure-array landmark builders + registry (Farmgate footbridge/station, Karwan Bazar sheds, SAARC fountain)
src/player/            PlayerController (pure sim), PlayerAvatar (placeholder body)
src/camera/            CameraRig, fov
src/render/            renderer factory, quality tiers + adaptive quality, GeometryBuilder, facade texture
src/ui/, src/debug/    HUD, overlays, debug overlay
data/routes/           route JSON (authored content: palettes, moods, dressing, landmarks + sources)
vendor/three/          pinned Three.js
tests/                 unit tests (node tests/run.mjs) + optional browser smoke test + asset licence guard
docs/                  PROJECT_PLAN, ARCHITECTURE, DEVELOPMENT, MILESTONE2_PLAN
```

## Landmarks & district identity (Milestone 2)
* Landmarks are **scenery only**: no collision, no triggers, no animation (decided by Zim).
* Each landmark is built ONCE by a pure-array builder (`src/world/landmarks/`, same discipline as ChunkBuilder),
  merged into one static mesh (1 draw call, shared ground material, `matrixAutoUpdate` off) and distance-culled
  by `LandmarkManager.update(s)` - typically 1-2 landmark draws are alive at a time.
* The route JSON drives everything: `landmarks[]` (kind, s, clears, cull), per-segment `dressing` densities
  (cable tangles, billboards, tea stalls, stains) and `moods` (per-district fog/hemisphere tint, blended across
  segment boundaries by `Environment.updateAt`).
* `clears` lets a landmark own a plot: generated buildings are suppressed there (market sheds, junction plaza).
* Nothing outside `src/world/` reads landmark geometry; gameplay systems stay untouched.

## Performance design (Redmi 9 first)
* One street chunk (60 m) = 2 draw calls (vertex-coloured + textured facades). Landmarks add <= 4 distance-culled
  static draws. Whole scene stays around ~16-22 draw calls; worst chunk ~1.7k triangles, all landmarks ~6.7k together.
* No real-time shadows, 2 lights, no new shaders ("glow" = static emissive-bright vertex colours), fog hides streaming,
  static meshes (matrixAutoUpdate off), pooled chunk meshes.
* Phones start on the LOW tier (render scale <= 1.0, 30 fps cap). `AdaptiveQuality` lowers resolution then tier when frames
  are late, and only raises quality after proving headroom (a failed promotion is reverted and never retried).
* `?debug=1` shows FPS, draw calls, triangles, memory, landmark counts, tier changes.

## Milestones
1. **Foundation** (done): entry point, renderer, quality system, input, route data, first 1.2 km of the route, camera, HUD.
2. **Recognisable Dhaka environment + landmark identity** (done, see `docs/MILESTONE2_PLAN.md`): Farmgate footbridge +
   MRT-6 style station, Karwan Bazar market sheds + clutter, real SAARC fountain silhouette, district palettes/moods,
   signboard bands, facade variety. Scenery only - no collision, no animation.
3. Traffic + collision detection + context damage (stumble / fall / game-ending) + health model.
4. Hazards (unpredictable), crossings, signals.
5. Audio engine + Bangla ambience zones.
6. Consequence flow + memorial cards (separate system) + cinematic transitions.
7. 2D backstory + route select + save/settings.
8. More routes/landmarks, GLB assets, art pass. 9. Polish, accessibility, QA matrix.

## Milestone 3 additions — living streets + cinematic protagonist

**Character system**
- `src/player/walkCycle.js` — pure pose maths (`walkPose(phase, stride)`, `idlePose(time, seed)`),
  shared by the hero and every crowd member; unit-tested for symmetry/continuity/bounds.
- `src/player/PlayerAvatar.js` — articulated hero (hips, knees, shoulders, neck): canvas face
  (photo-based stylised likeness: warm brown skin, curly black hair, rectangular glasses),
  striped office shirt, satchel. Interface unchanged: `setPose(x, z, yaw, phase, lean, {dt, stride})`.
- `src/city/characterKit.js` — crowd body-part geometries (7 parts), joint table, clothing palettes.

**City population (`src/city/`)**
- `CrowdSystem.js` (pure) + `CrowdRenderer.js` (THREE): walkers/standers/talkers/tea-stall
  sitters/vendors/porters on footpaths only; whole crowd = 8 draw calls (InstancedMesh per
  body part, per-instance clothing colours). Counts per tier: 14/24/36.
- `TrafficSystem.js` (pure sim) + `TrafficRenderer.js`: 8 vehicle types, left-hand traffic
  (left carriageway +s, right oncoming), car-following, overtakes, recycle windows;
  every vehicle exposes (s, lat, dir, speed, len, wid) for future collision gameplay.
  Vehicles never leave the road elements. Emits `traffic:nearmiss` (camera shake + avatar
  flinch) and `traffic:horn` (audio). Counts per tier: 12/18/26 (largest-remainder exact).
- `src/world/dressing.js` — `stallSpots()` shared hash formula: CrowdSystem vendors/sitters
  anchor to exactly the stalls ChunkBuilder draws.

**Signage with real text**
- `src/world/signCatalog.js` (pure) — authored fictional Bengali/English shop/building/ad
  texts, deterministic atlas packing (1024², 256×64 cells, span 1 = 2.4 m / span 2 = 4.8 m
  boards at 4:1), `pickDesign(key, kind, span)`.
- `src/render/SignAtlasTexture.js` — paints the atlas at start-up with bundled Hind Siliguri
  (OFL, `assets/fonts/`, subset to Bengali+Latin); browser shapes Bengali conjuncts.
  ChunkBuilder emits sign quads UV-mapped into it; chunks gained a THIRD merged mesh
  (`signs`), so a chunk costs up to 3 draw calls. Texture exception: 1024² + anisotropy 4
  for text legibility (deliberate, one texture only).

**Street commerce & detail (ChunkBuilder)**
- `clothingStalls()` — garment racks with hanging shirts/kameez (right footpath only),
  wall-hung displays flush to building fronts; `streetLife()` — plastic chairs/tables,
  food carts, fruit baskets; `crossings()` — zebra stripes at the footbridge + fountain
  plaza; `wallACUnits()` — AC boxes with drip stains. Dressing schema grew `crowd`, `cloth`
  (validated 0..2 like the rest).

**Cinematic layer**
- `CameraRig`: impulse `addShake()` (deterministic wobble, exponential decay), lateral
  motion-lean in the look target. Near-miss: TrafficSystem → bus → avatar.nudge + camera shake.
- `src/audio/AudioEngine.js` — 100% procedural WebAudio (no audio files): traffic rumble /
  crowd murmur / fountain water beds mixed by location, synthesised horns + rickshaw bells
  on bus events, starts on the start tap, ducks on pause, `?audio=0` disables.

**Budgets (M3)**: draw calls target ≤ 80 on Redmi 9 (smoke asserts < 100 desktop);
crowd 8 + traffic 8 + chunks 3×9 + landmarks 5 + sky 2 + hero ~12 ≈ 70 worst case;
new textures: 1× sign atlas (1024²) + 1× 128 face + 1× 64 shirt; fonts 2 × ~220 KB.

---

## Milestone 4 additions (geo-referenced world, cinematic layer)

- **Route v2** (`data/routes/farmgate-saarc.json`, schema 2): centreline fitted to real
  OpenStreetMap geometry, named `junctions[]`, `geo` provenance block, landmarks placed on the
  measured corridor (market + Khamarbari + expressway on the LEFT/rail side, as in reality).
- **Materials**: `RoadTexture.js` (one 512² surface atlas: asphalt patches/pavers/median) mapped
  by the new per-chunk `pave` mesh; TWO facade atlases (`FacadeTexture('residential'|'commercial')`)
  selected by per-building **archetype** weights in the route JSON.
- **Archetypes** (`RouteModel.buildings` → `ChunkBuilder.buildings`): institutional, midrise,
  commercial, marketBlock, halfbuilt — each with its own silhouette kits (porticos, balcony
  rows, parapets, sign stacks, rebar + bamboo + netting).
- **Landmarks v2** (all in `src/world/landmarks/`): 2023 Farmgate footbridge (L-shape + tensile
  canopy + plaza), parametric MRT-6 stations (readable nameboards via the sign atlas, portal
  pillar at Farmgate), Elevated Expressway + FDC ramp, Khamarbari complex, Kawran Bazar zone
  (DNCC block, fish market, parked buses, rail + level crossing, Mughal mosque, FDC skeleton,
  BDBL/BSEC towers), dry SAARC fountain (tin fence + poster ring), Sonargaon gardens. Builders
  now emit into TWO builders: `(g, sg)` — `sg` quads land in the readable-sign mesh.
- **Lighting**: ACES tone mapping + Dhaka haze palette; blob contact shadows on every tier
  (`BlobShadow.js`), one 1024px directional shadow map on the high tier only.
- **Camera v2** (`CameraRig.js`): critically-damped springs on position + look target,
  handheld sway, steer roll/drift, near-miss FOV punch, landmark reveal dollies, skippable
  opening arc. Control is never modified by camera state.
- **Protagonist**: sculpted sphere head with painted face (traits from `likeliness.js` —
  placeholders until the reference photographs arrive), elbows + hands, pelvis/shoulder
  counter-rotation from the shared walk cycle.
