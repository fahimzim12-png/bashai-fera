# Milestone 3 — Bring Dhaka to Life & Cinematic Protagonist

Status: approved direction (user brief). Work happens on `main` after the M2 web-upload
sync (`origin/main` = `6872eea`, tree identical to tested M2 `b5f919e`).

## 1. Goal

Transform the current "empty 3D road" into a believable, populated, recognisable Dhaka
street, and upgrade the protagonist into a cinematic character resembling the developer
(reference photos supplied). Everything must stay playable on Xiaomi Redmi 9 (30 FPS).

## 2. Why it feels empty (diagnosis)

- Zero human presence: no pedestrians, no traffic, no vendors.
- Commerce is abstract: "script-suggestion" signboards (by design in M2), no garments,
  no readable text, few street objects.
- Buildings share one 512px facade texture and simple box massing; district moods differ
  only by fog colour/density.
- Character is a blocky placeholder; camera is functional but not directed.

## 3. Systems to build (all extend the existing architecture)

### 3.1 Character kit (`src/city/characterKit.js`, `src/player/walkCycle.js`)
- Pure (Three-free) part-geometry specs + pose math shared by the hero and the crowd.
- Procedural walk cycle: phase-locked thigh/shin/arm swings, torso bob/pitch, head yaw;
  stride length tied to speed so feet stop sliding. Pure function → unit-tested
  (symmetry, bounds, continuity at phase wrap).
- Hero rebuild in `PlayerAvatar.js` (same `setPose(x, z, yaw, phase, lean)` interface):
  realistic proportions, canvas face texture (brows/eyes/glasses hint), rectangular
  black glasses geometry, short curly black hair, striped office shirt, trousers, shoes,
  brown office satchel. Likeness from photos: warm brown skin, black rectangular
  glasses, curly dark hair, medium build. Honest limit: stylised low-poly likeness
  (identity cues: glasses + hair + skin tone + build), not photoreal.

### 3.2 Crowd system (`src/city/CrowdSystem.js`)
- InstancedMesh per body part (head+hair, torso, upper-arms, lower-arms, upper-legs,
  lower-legs) → **whole crowd ≈ 6 draw calls** regardless of count. Per-instance colour
  (shirts, panjabi, trousers, skin tones), per-instance phase/height variations.
- Behaviours: walkers (forward along footpath or crossing at junctions), standers,
  talking pairs/groups (gesture blend), sitters (tea stalls, benches), vendors at stalls,
  waiting pedestrians near the junction. All poses from the shared walk cycle.
- Counts per tier (low/medium/high) in `TIERS`; recycle around the player window.
- Deterministic spawn layout (seeded per route) for tests; per-frame dt only animates.

### 3.3 Traffic system (`src/city/TrafficSystem.js`, `src/city/vehicleModels.js`)
- 8 vehicle types: local bus, microbus, private car, CNG auto-rickshaw, cycle rickshaw,
  motorcycle, delivery truck/van, small commercial. Each = low-poly instanced parts
  (body + wheels/glass merged per type) → ~2 draw calls per type, ~12-16 total.
- Left-hand traffic with the median: near carriageway same direction as the player,
  far carriageway oncoming (approaching vehicles visible head-on).
- 1-D lane simulation in route space `(s, lateral)`: per-lane car following (gap keep),
  speed variance, slow-downs, overtakes into a free adjacent lane, type-dependent
  speeds (bus slow, motorcycle fast). Density per district from route data.
- Positions converted with `route.space.toWorld` + `heading(s)` each frame.
- Collision-ready data model: every vehicle exposes `(s, lat, dir, speed, halfW, halfL)`;
  no collision gameplay in this milestone (player path stays unobstructed by design:
  vehicles never enter footpaths; near-miss events only).

### 3.4 Signboards with real text + commerce kit (ChunkBuilder + atlas)
- `src/world/signCatalog.js` (pure): ~30 authored sign designs with **real Bengali +
  English text** (fictional but plausible: shops, tailors, tea stalls, pharmacies,
  building names, floor labels, sale banners). Deterministic design assignment by hash.
- `src/render/SignAtlasTexture.js`: one 1024×1024 canvas atlas painted at startup using
  **bundled Hind Siliguri** (OFL, subset to Bengali+Latin, Regular+Bold in
  `assets/fonts/`), loaded via FontFace; graceful fallback if unavailable.
- ChunkBuilder: replace abstract script-suggestion bands with atlas sign quads
  (4:1 aspect, span 1/2/4 cells); rooftop billboards become atlas ads where
  `dressing.billboards` is high. One extra mesh per chunk (only where signs exist).
- Commerce kit into the merged ground/facade builders (no new draw calls):
  clothing stalls with **hanging garments** (shirts/kameez/panjabi silhouettes, varied
  colours on hanger bars), garment racks, folded-clothes stacks, mannequin-free stalls,
  tea stalls with benches + kettles + glasses, food carts, fruit baskets/crates,
  plastic chairs/tables, partially open shutters with goods spill.
- Facade identity upgrade: AC units, balcony grills and hanging cables already partly in
  the texture — add geometry-level AC boxes, water tanks (already), rooftop stairheads,
  drainpipes, weathering variants via extra facade texture archetypes.
- `dressing` schema extended (e.g. `stalls` splits into `cloth`, `food`, `tea`…);
  `validateRoute.js` kept in sync.

### 3.5 District identity + road detail + atmosphere
- Farmgate: junction crowd density, waiting groups, crossing pedestrians, bus stop cluster.
- Karwan Bazar: market sheds gain produce crates/baskets, porters carrying goods
  (walker variant with head-load), dense stalls, trucks/delivery vehicles.
- SAARC Fountain: open plaza, fountain-side railing crowd, cleaner footpaths, lighter traffic.
- Road surface: lane markings on both carriageways, zebra crossings at the junction,
  manhole patches, kerb paint; footpath cracks/stains variation.
- Sky/lighting: warmer haze gradient, optional distant dust sprites (high tier only),
  sun disc already exists; per-district `moods` tuned (fix duplicated `moods` key in JSON).

### 3.6 Cinematic camera + reactions + audio
- CameraRig stays (route-space follow); layered polish: smoothed look-ahead, subtle
  speed-based FOV, impulse shake API; TrafficSystem emits `traffic:nearmiss` → small
  camera shake + avatar flinch. Everything gated by tier and never covering the player.
- `src/audio/AudioEngine.js`: **fully procedural WebAudio** (zero audio files, zero
  licences to worry about): traffic rumble (filtered noise), occasional horns (synth),
  rickshaw bells, market chatter texture, fountain water at SAARC. District-dependent
  mix, starts on the ready-overlay tap (autoplay policy), mute toggle in HUD pause,
  off on `low` tier by default? (No: keep on all tiers, it is cheap CPU.)

## 4. Performance budget (Redmi 9, `low` tier)

| Budget | M2 actual | M3 target (low) |
|---|---|---|
| Draw calls | ~16-22 | **≤ 80** (smoke assertion updated 60 → 100; low tier realistically ~50-70) |
| Chunks | 2 draw calls each | +1 signs mesh per chunk with signs |
| Crowd | — | 14 walkers max (low), ~28 (high), 6 draw calls |
| Traffic | — | ~12 vehicles (low), ~26 (high) |
| Textures | 1 × 512 | + 1 × 1024 atlas + 1 × 128 face |
| Extra bytes | — | ≤ 0.5 MB (fonts 2 × ~220 KB) |
| Lights/shadows | 1 hemi + 1 dir, none | unchanged (no shadow maps; blob shadow only) |

No per-frame allocations in hot loops (reuse vectors/matrices); crowd/traffic matrices
rebuilt only when a part's pose changes materially (walkers every frame, sitters once).

## 5. Preservation (non-negotiable)

Landing page, route + landmarks, controls, ending system, Three.js vendored setup,
`play/` (untouched), `js/main.js` (dead but untouched), chunk streaming model, quality
system, save nothing else. `PlayerController` sim untouched; avatar swap is visual only.

## 6. Stages (each = one commit, suite green after every commit)

- M3.1 character kit + hero avatar + walk cycle tests
- M3.2 crowd system + tier counts + Game wiring
- M3.3 traffic system + lane sim + near-miss events
- M3.4 sign atlas + real signage + commerce kit + facade upgrade + fonts/ledger
- M3.5 district identities + road detail + atmosphere
- M3.6 cinematic camera + audio engine
- M3.7 docs, smoke extension, budgets, delivery packages

## 7. Test plan

Existing 52 stay green (`node tests/run.mjs`). New: `walkcycle.test.mjs` (pure pose),
`crowd.test.mjs` (deterministic layout, counts, pose validity, no NaN),
`traffic.test.mjs` (lane logic, gaps, no footpath invasion, data-model fields),
`signcatalog.test.mjs` (deterministic assignment, atlas bounds), `assets.test.mjs`
extended for fonts. `smoke.mjs` gains crowd/traffic/sign screenshot points (browser-only
— cannot run in this sandbox; reported honestly). Budget assertions in tests.

## 8. Delivery

Full project ZIP + web-upload ZIP (only new/modified files, original paths) + manifest
(NEW/MODIFIED per file) + honest testing report.
