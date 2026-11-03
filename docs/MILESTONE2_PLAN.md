# Milestone 2 — Recognisable Dhaka Environment and Landmark Identity

**Implementation plan for approval — no code has been changed.**

| | |
|---|---|
| Author | Primary developer (on behalf of Fahim Muntasir Zim) |
| Date | 2026-11-04 |
| Repo state reviewed | `repo-bashai-fera` @ `6c5cd1d` (synced with `origin/main`), 40/40 tests passing on Node 24 |
| Target after approval | Commit as `docs/MILESTONE2_PLAN.md`, then implement sub-milestones M2.1–M2.5 |

---

## 0. Parameters you locked in

Your five answers are treated as binding scope for this milestone:

| # | Question area | Your answer | What it means here |
|---|---|---|---|
| 1 | Art direction / palette | **my wish** | Fixed in §2 of this plan; you can veto any colour before M2.2 starts |
| 2 | Landmark role | **scenery only** | Landmarks are set dressing. No collision volumes, no triggers, no interaction, no gameplay code touched |
| 3 | Motion | **static** | No animated water, no cloth, no rotating/moving parts, no new per-frame updates anywhere |
| 4 | Asset sourcing / licensing | **my wish** | Policy fixed in §5 (CC0-first, CC-BY-with-attribution second, BY-SA avoided) |
| 5 | Everything else (order, density, LOD) | **my wish** | Proposed in §9; changeable at any sub-milestone boundary |

Standing constraints from your earlier message, still honoured:

- **No traffic, collision, injury or health systems.** Those stay out of this milestone entirely.
- **`play/` is untouched** — not deleted, not read as a basis, not referenced by any new code.
- **Routes, controls, ending, architecture and landing page are preserved.** The plan only *extends* data files and world-building modules; it does not alter route generation math, `PlayerController`, the state machine, `CameraRig`, input, or `index.html`/`js/landing.js`.
- Nothing is modified until you approve this plan.

---

## 1. Diagnosis — why the world looks generic despite district data

This is the important finding: **the data layer already carries district identity, the form layer throws it away.** Six concrete causes, with evidence from the current tree:

**1.1 One shared facade pattern for every building in every district.**
`src/render/FacadeTexture.js` draws exactly one 256 px canvas — a 4×4 grid of identical window bays (12 m × 12.8 m of wall) with `RepeatWrapping` — and every building in Farmgate, the Avenue, Karwan Bazar and the SAARC approach is skinned with it. A residential podium, a wholesale warehouse and a glass-fronted tower all show the same bay rhythm, same window size, same 12 %-lit-window draw. Your eye reads window rhythm before colour, so everything collapses into "boxes with windows".

**1.2 Boxes have no district silhouette.**
`RouteModel.js` seeds boxes with per-segment height/width/depth ranges (which *is* good data: `[14,40]` m in Farmgate vs `[8,22]` m in Karwan Bazar vs `[18,46]` m at SAARC), but the massing is always a rectangular prism on a flat plinth. Dhaka's districts are told apart by *form*: the elevated station box and footbridge arches at Farmgate, the long low gabled sheds and tin roofs of Karwan Bazar, the open plaza bowl at SAARC. None of these forms exist yet, so the height data alone can't carry identity.

**1.3 Landmarks are explicitly abstract placeholders.**
`ChunkBuilder.js` `landmarks()` (lines 231–254) renders the only landmark in `farmgate-saarc.json` — `kind: "fountain-circle"`, self-labelled `"status": "placeholder-geometry"` — as a 16-segment ring of stone boxes (radius 16 m, so the sourced 32 m diameter is correct), a flat water disc, and one 1.4 m steel column with two cross bars at y=3.6/6.4. The JSON note honestly says: *"It is NOT a model of the real sculpture yet."* The single most recognisable object on the route is a generic monument. The Metro viaduct (correctly spaced piers, `spacing = 28`, deck from the section profile) reads as infrastructure but has no station, no footbridge, no overhead line posts — nothing that says "MRT-6".

**1.4 Uniform ground treatment.**
Every chunk's ground is vertex-coloured planes from the same section template — same asphalt tone, same footpath tone, same median tone along all ~1.2 km. No district staining (market runoff), no plaza paving at the fountain, no road-marking or patch variation. Ground occupies ~40 % of the lower screen and currently contributes zero identity.

**1.5 Signboards and awnings are colour-only, not structure.**
The storefront pass (`ChunkBuilder.js` shops section) tints awnings/signs from the segment palette — the colours are plausible — but signs are flat quads with no signboard *band* structure, no vertical shopfront rhythm, no density difference between a commercial stretch and an institutional one. Bangladeshi streetscapes read largely through the signboard band at 2.5–4 m height; without it, no street looks like Dhaka.

**1.6 Uniform atmosphere.**
`Environment.js` applies one global late-afternoon lighting/fog setup (correctly evocative — see `lighting` in the JSON). But there is no per-district tint: the hazy market air of Karwan Bazar and the open plaza sky at SAARC feel identical. Cheap to fix (lerp fog colour/density and hemisphere ground tint along `s`), high identity payoff.

**Why this diagnosis matters for the fix.** Recognisability at this game's scale — walking at ~3 m/s, fog at ~150–200 m, phones rendering at pixelRatio ≤ 1.0 — comes in a strict order: **silhouette → colour band → detail texture.** The current build invests only in layer 3 (facade texture detail) and layer 2 (palettes). Milestone 2 therefore invests primarily in **layer 1 (form)**: three landmark structures, district-specific massing kits, and a signboard band — with textures and atmosphere as support, not foundation.

---

## 2. Art direction (your wish #1 — my call, veto-able per colour)

Keep the existing warm late-afternoon lighting (it matches the story: *"the father promised to be home before evening"*) and push identity through a distinct **value + colour signature per district**:

| District (s-range) | Dominant form language | Colour signature | Overhead reading |
|---|---|---|---|
| **Farmgate** (0–300) | Vertical: elevated station box + twin-arch footbridge + dense midrise | Warm plaster ochre/cream walls, **one teal band crossing the sky** (station canopy), saturated signboard strip | Tangled cables thicken, billboards |
| **Avenue** (300–620) | Same grammar as Farmgate but calmer; transition zone | Same palette family, fewer signs, more residential shutters | Viaduct continuous |
| **Karwan Bazar** (620–990) | Horizontal: long low gabled sheds, deep blocks behind | Red-oxide and galvanised tin roofs, blue/orange tarpaulins, muted walls, stained ground | Low skyline — sky opens up over the sheds |
| **SAARC approach + fountain** (990–end) | Open: taller towers recede, plaza bowl opens | Pale paving, white/light-grey sculpture, one warm emissive rim; sky takes over | Nothing overhead — the release after two crowded kilometres |

Rules I will hold to:

- All colours stay inside the existing palette system in `farmgate-saarc.json` (extend values, don't bypass it).
- **No real shop names, no real brand marks, no real Bengali words on signs.** Signboards get abstract glyph-like shapes (procedural rectangles/strokes that *read* as Bengali script at distance) — avoids mislabelling real businesses and avoids font/licensing issues.
- Signs/awnings saturation may rise ~10–15 %; walls stay desaturated and sun-washed. The street is colourful, the architecture is tired — that contrast *is* Dhaka.

---

## 3. Hybrid asset strategy (three asset classes, one pipeline rule)

The pipeline rule that everything below obeys: **`ChunkBuilder.js` stays pure-array geometry with zero Three.js imports** (its own header comment states this is deliberate, for future Workerisation). All new geometry generation follows the same pattern: deterministic builders → plain vertex/index/color arrays → merged at the existing 2-draw-call chunk boundary or emitted as one-off static meshes.

**Class A — Parametric district geometry (code, ~80 % of the work).**
District massing kits added to `ChunkBuilder.js`: gabled market sheds, tin roofs, signboard bands, stair cores, tarpaulin-covered clutter, sack/basket stacks, billboards, thicker cable clusters, rooftop antennas and coloured water tanks. All seeded from the existing `(route, chunkIndex)` Rng discipline, so output stays deterministic and fully unit-testable.

**Class B — Licensed photographic textures (few, small, ledgered).**
Photographic texture is used **only** where procedural canvas cannot sell the material: corrugated tin, grimy plaster, plaza paving. Sizes capped at 512 px, packed into at most **one 512 px atlas per material family** (target: 1–2 atlases total). Process:

1. Source from ambientCG / Poly Haven (CC0) or Wikimedia Commons (CC BY, attribution; CC BY-SA avoided — see §5).
2. Normalise offline (flatten baked lighting/contrast, desaturate slightly) so they tint correctly under vertex colour and the warm sun, like the current near-white facade texture does.
3. Commit the processed PNGs (no runtime downloads — keeps GitHub Pages hosting offline-friendly and deterministic).
4. Every file gets a row in `assets/ASSETS.md` (source URL, author, licence, derivation) **enforced by a test** (§8).

**Class C — Landmark structures, modelled in code (the three anchors).**
The three landmarks are Dhaka-specific real structures — no CC0 asset library will contain the Farmgate footbridge or the Nitun Kundu sculpture, and downloaded near-misses would read *worse* than clean parametric geometry. So each landmark is a **dedicated pure-array builder module** (same discipline as Class A), hand-tuned against reference photos, emitted once (not per-chunk) as a static merged mesh. An upgrade path to Blender-authored glTF stays open (three r187 already loads glTF) but is explicitly *out of scope* this milestone: code geometry is reviewable in PRs, deterministic, and adds zero dependencies.

No downloaded meshes, no new npm/vendor dependencies, no shader changes, no runtime network traffic.

---

## 4. Landmark designs (static, scenery-only)

All three: no collision, no triggers, no animation. Water, flags, cables — everything frozen. Static emissive materials are allowed (they cost nothing extra).

### 4.1 Farmgate — MRT-6 station + footbridge (s ≈ 0–300)

Two anchors, both crossing *over* the player's road so the player walks through their shadow line — the strongest identity moment of the route.

- **Metro station (s ≈ 150–210, one instance, ~60 m long):** elevated concourse box straddling the existing median viaduct (viaduct top 10.6 m per section data), a slightly larger platform-level box, **teal panel band** (the signature colour), stair/elevator cores descending to both footpaths (visual only — they simply *look* like they land on the footpath; no walkable geometry is touched), flat roof canopy with a small overhang, and a plain station-name board shape (no readable text this milestone).
- **Footbridge (s ≈ 45, one instance):** the iconic twin **bowed steel arch ribs** over the full carriageway (~45 m span, ~9 m clearance), deck box between them, one stair flight + landing descending to each footpath, a few cable stays from arch to deck. Low-poly: arches as segmented tube boxes (~10 segments per rib).
- **Supports:** overhead-line posts on the viaduct every 2nd pier, parapet lips on the deck edge, denser cable bundles near the station.
- **Budget:** footbridge ≤ 2.5 k tris / 1 draw call; station ≤ 6 k tris / 1 draw call.

### 4.2 Karwan Bazar — wholesale kitchen market environment (s ≈ 620–990)

Identity by **density shift**, not by a single object.

- **Market sheds** replace generated buildings on the side *across the road from the walkable footpath* (right side, beyond x = 16.1 in section terms; the route JSON is schematic and its own `statusNote` says street geometry needs verification — I'll sanity-check the real market's side against photos during M2.3 and flip if wrong). 2–3 long gabled sheds (~30 m each): steel truss silhouettes (thin king-post truss boxes every ~6 m), corrugated tin roof texture (Class B), open dark sides with hanging stall suggestion (vertex-colour strips — red meat zone, green produce zone, no literal detail).
- **Behind the sheds:** one multi-storey wholesale/cold-storage block (12–22 m, small windows, grimy plaster) to keep depth.
- **Clutter kit (both sides, density-driven):** sack-pile pyramids, plastic crate stacks, rattan-basket stacks, bamboo poles, tarpaulin sheets in blue/orange, tin fences, a couple of rickshaw-garage canopies, stained-ground patches (darker vertex-colour quads on the asphalt/footpath).
- **Footpath encroachment on the walkable side** stays as-is per the sourced Daily Star claim (parked vehicles pushing pedestrians onto the road) — that's Milestone 1 narrative data, we only *dress* it.
- **Budget:** sheds ≤ 4 k tris merged into their chunks' existing 2 draw calls; clutter ≤ 2 k tris, same merging; zero new draw calls if merged, else +1.

### 4.3 SAARC Fountain — the terminus (s = route.length + 22, placement untouched)

The real sculpture: **Nitun Kundu, 1985, steel, ~9.75 m tall, 32 m diameter**, fountain jets over a circular pool at the five-road junction — currently a placeholder ring + column. Rebuild (all static):

- **Pool:** keep the sourced 32 m footprint but replace the 16 visible box segments with a smoother two-ring basin (outer rim + inner shoulder, both low-segment rounds — 24 segments is plenty at this distance), water disc slightly below the rim with a **lighter foam ring** band (vertex-colour, no shader).
- **Sculpture:** the recognisable form — a radial cluster of **8–12 curved steel fin blades** rising with vertical stagger to the sourced 9.75 m (the real piece reads as a fan/flower of blades over the pool, not a column). Built from bent segmented boxes; pale steel colour kept from the placeholder palette.
- **Plaza:** radial paving pattern via one 512 px Class B texture or three concentric vertex-colour rings (decided during M2.4 by how it looks in-game; texture is the default), 8 static lamp posts, a low hedge ring, and a **static emissive strip on the inner rim** — at late-afternoon lighting it will read as the fountain catching sun, and it makes the terminus visible from ~300 m down the avenue.
- **Skyline release:** the `saarc_approach` segment already widens the road and raises buildings; the fountain side gets no buildings (the section's `gapChance` and ground bands already allow this; enforced by the landmark placement code).
- **Budget:** ≤ 3 k tris / 1 draw call. Placement stays exactly `route.length + aheadOfEnd (22 m)` — the ending sequence is not touched.

### 4.4 Route-wide dressing pass (all districts)

Per-chunk, merged into existing draw calls: rooftop water tanks in varied colours, TV antennas, 1–2 billboard hoardings per chunk on Farmgate/Avenue (skipped on LOW tier if the frame budget says so), thicker drooping cable clusters (the existing cables are too thin to read), tea stalls and vendor umbrellas near Farmgate, tin boundary fences. Density numbers per segment go into the route JSON (§6) so tuning never requires code edits.

---

## 5. Asset inventory + source / licensing requirements (your wish #4 policy)

**Policy (tightened to the existing `assets/ASSETS.md` rule — "nothing without a clear licence that allows free use in a public game; NC/ND/unclear rejected"):**

1. **CC0** (ambientCG, Poly Haven) — preferred, no attribution obligation (we credit anyway, it's polite and future-proof).
2. **CC BY 4.0 or 3.0** (Wikimedia Commons photos) — allowed with author + licence + URL in `assets/ASSETS.md`; in-game credits line added to the landing page footer *only if* CC BY assets ship (keeps the landing page untouched otherwise).
3. **CC BY-SA** — avoided. If a texture is uniquely right and only exists BY-SA, it needs your explicit sign-off first.
4. No Google Maps imagery (already the repo's rule). No real trademarks/brands. No photos of identifiable private individuals used as textures.

**Proposed texture inventory (small by design — most identity comes from Class A/C geometry):**

| Asset | Used for | Max size | Preferred source / licence | Fallback |
|---|---|---|---|---|
| Corrugated tin / metal sheet | Karwan Bazar shed roofs, tin fences | 512 px | ambientCG — CC0 | procedural stripe canvas (upgrade of existing approach) |
| Grimy plaster / stucco | Karwan Bazar walls, cold-storage block | 512 px | ambientCG / Poly Haven — CC0 | existing flat colour |
| Plaza paving, radial pattern | SAARC fountain plaza | 512 px | Poly Haven — CC0 (tiled) | vertex-colour rings |
| Concrete pier/grime overlay (optional) | viaduct piers, footbridge | 512 px | ambientCG — CC0 | skip — vertex colour is probably enough |

Total new texture VRAM with mipmaps: **≤ ~2 MB.** Everything else stays procedural canvas or vertex colour, as today.

**Reference photos for modelling (not shipped, not committed):** Farmgate footbridge + MRT-6 Farmgate station, Karwan Bazar kitchen market sheds, SAARC Fountain (Wikipedia has the sourced coordinate 23.749909, 90.393162; the JSON already carries the 32 m / 9.75 m / Nitun Kundu 1985 facts with provenance). These are working references only; if any image is ever derived into a committed texture, it enters the ledger like any other asset.

**Ledger discipline (new):** `assets/ASSETS.md` gains a "Textures" table (file, source URL, author, licence, date, derivation note) and a test asserts every file under `assets/textures/` has a row (§8). This turns the existing manual rule into an enforced one.

---

## 6. Files — what changes, what provably doesn't

### Modified (7 files, all additive or parameter-level)

| File | Change | Guard |
|---|---|---|
| `data/routes/farmgate-saarc.json` | **Additive only**: new `landmark` entries (`farmgate-footbridge`, `farmgate-metro-station`, `karwan-market-sheds` with `s`, `side`, dims), per-segment `dressing` density params, palette value tweaks. Existing fields untouched — `saarc-fountain` gets its `kind` upgraded from `fountain-circle` to a real builder id and its `status: placeholder-geometry` note replaced | All 40 current tests must stay green; `validateRoute.js` extended in the same change |
| `src/world/ChunkBuilder.js` | New district kit functions (sheds, signband, clutter, cables v2); landmark placement loop extended from the current single-`kind` `continue` (line 235) to a registry lookup. Pure-array discipline kept — zero Three.js imports | Existing header rule; chunk merge still produces exactly 2 meshes |
| `src/render/FacadeTexture.js` | One texture → **2–3 palette-driven variants** (residential / commercial-with-signband / tower), still 256 px canvases; caller picks by segment palette | Variant selection deterministic per building seed |
| `src/world/Environment.js` | Per-district fog colour/density + hemisphere ground tint, lerped along `s` | Global `lighting` block in JSON stays the base; lerp is a delta |
| `src/world/ChunkManager.js` | Registers landmark static meshes (≤ 4), distance-culls them by tier; existing chunk pooling untouched | Landmark mesh count asserted in tests |
| `src/world/validateRoute.js` | Accept new additive fields; reject unknown landmark kinds | New negative tests |
| `src/ui/DebugOverlay.js` | Show landmark draw/tri counts (keeps perf work verifiable on-device) | Display-only |

### New (6 files)

| File | Purpose |
|---|---|
| `src/world/landmarks/FarmgateFootbridge.js` | Class C builder, pure arrays, deterministic |
| `src/world/landmarks/FarmgateStation.js` | Class C builder |
| `src/world/landmarks/KarwanMarket.js` | Class C builder (shed row + depth block) |
| `src/world/landmarks/SaarcFountain.js` | Class C builder (replaces the inline placeholder block) |
| `src/world/landmarks/registry.js` | Maps JSON landmark `kind` → builder; unknown kind = validation error |
| `assets/textures/` + `assets/textures/README.md` | Class B PNGs (≤ 4 files) + per-file ledger pointer |

### Explicitly NOT touched

`src/world/RouteModel.js` (geometry math unchanged — kits *consume* its output), `src/world/RouteSpace.js`, `src/player/*`, `src/input/*`, `src/camera/*`, `src/core/*` (Game/Loop/StateMachine/Config/Rng/EventBus/ObjectPool), `src/render/RendererFactory.js`, `tiers.js`, `QualityManager.js`, `AdaptiveQuality.js`, `index.html`, `js/landing.js`, `game/*`, **`play/`**, and the deferred housekeeping items (`js/main.js` dead file, CI workflow, ready/ended redraw, restart spike) — those remain separate approvals from my first report.

Estimated diff: ~600–900 LOC across ~13 files, plus ≤ 4 texture PNGs.

---

## 7. Redmi 9 performance budget (the reference minimum)

Baseline today (LOW tier): ~2 draw calls per chunk × 4–5 resident chunks + avatar/sky ≈ **~16 draw calls**, ~8 k tris per chunk, pixelRatio ≤ 1.0, fog-culled streaming. Budgets this milestone must fit **on top of that baseline without tier demotions**:

| Metric | Budget on Redmi 9 (LOW) | How it's held |
|---|---|---|
| Draw calls | ≤ **22** total (vs ~16 today) | Landmarks = ≤ 4 static draws, distance-culled at ~180 m on LOW → typically only 1–2 active; dressing is merged, +0 draws |
| Triangles | Chunks stay ≤ 8 k each; landmarks 2.5–6 k each, one-off | Worst visible case ≈ 47 k tris total — far under the Adreno 610-class comfort line at 30 fps |
| Texture memory | ≤ **~3 MB** added total | 3 × 256 px facade variants + 1–2 × 512 px atlases, mipmapped, anisotropy 1 (unchanged policy) |
| Shaders/lights | **+0** | Everything stays vertex-coloured + existing materials; "glow" is static emissive on existing material slots; no new lights, no shadows, no post-processing |
| Per-frame CPU | **+0 updates** | Landmarks are static meshes with `matrixAutoUpdate = false`; nothing animated (your #3); dressing is baked into chunk builds |
| Init time | ≤ **~10 ms** added | Landmark builders run once, few hundred primitives each, memoised |
| AdaptiveQuality | Must never demote below LOW *because of* landmarks | Trial-period measurement in M2.5; billboard-hoarding density is the first sacrifice if the margin is thin |

Fog already hides streaming pop-in; landmark distance culling reuses the same radius discipline (LOW: 2-chunk radius; HIGH: unlimited). The pre-existing `ready`/`ended` full-scene redraw issue is *not* made worse — landmarks add no per-frame work — but fixing it remains deferred housekeeping, per your earlier scoping.

---

## 8. Testing strategy

**Unit (Node 24, extends the current 8-file/40-test suite — all 40 stay green):**

- **New `tests/landmarks.test.mjs`:** deterministic output (same route + seed → byte-identical arrays), hard triangle/vertex budget asserts per §4, no NaN/Infinite values, placement within declared `s` bounds, fountain still resolves to `route.length + 22`.
- **Extend `tests/route.test.mjs`:** `validateRoute` accepts every new additive field; rejects unknown landmark `kind`s and out-of-range `s`; old schema files still validate (backward compat).
- **Extend `tests/chunk.test.mjs`:** with dressing enabled, each chunk still merges to exactly 2 meshes; palette-driven facade variant selection is deterministic per building; district fog lerp sampled every 2 m shows no discontinuity at segment boundaries.
- **New `tests/assets.test.mjs` (licence guard):** parse `assets/ASSETS.md`; every file under `assets/textures/` must have a ledger row with source URL + licence; fail the suite otherwise. License compliance becomes machine-checked, not memory-checked.

**Browser smoke (existing optional path):** extend `tests/smoke.mjs` with three headless screenshots — Farmgate (s≈60), Karwan Bazar (s≈700), SAARC fountain (s≈route.length+10) — as visual-regression artefacts. Still gated on Chrome being available (not available in this sandbox; runs on your machine or in CI later).

**Device protocol (the real gate):** on the Redmi 9 — fps overlay ≥ 28 sustained at all three landmarks, no AdaptiveQuality demotion during a 10-minute run, thermal behaviour unchanged vs current build, landmark silhouettes readable at 100 m, districts distinguishable from screenshots alone. Desktop Chrome/Firefox spot check at HIGH tier for the full-density dressing.

**Visual acceptance (short, checkable):** (1) a screenshot of each district is identifiable *without* the HUD district label; (2) the fountain is recognisably "the fan-of-blades sculpture", not a generic monument; (3) Farmgate reads as "under the metro" within 5 seconds of spawn.

---

## 9. Work order (your wish #5 — my proposed sequence)

| Sub-milestone | Contents | Review point |
|---|---|---|
| **M2.1** Infrastructure | JSON additive schema, `validateRoute`, facade variants, district fog/tint, landmark registry (no visible landmarks yet) | Tests green + two screenshots (palette/fog only) |
| **M2.2** Farmgate | Footbridge + station + signboard bands + cable v2 | Spawn-area screenshot + device fps spot check |
| **M2.3** Karwan Bazar | Sheds, clutter kit, stained ground, density shift | Screenshot + verify market side against photos |
| **M2.4** SAARC terminus | Fountain rebuild + plaza + skyline release | End-of-route screenshot + ending sequence untouched |
| **M2.5** Polish + proof | Dressing pass, DebugOverlay counts, texture ledger + licence test, full device protocol | Redmi 9 sign-off checklist |

Each sub-milestone is independently shippable to GitHub Pages and independently revertable; if any landmark underperforms on-device, it degrades to "cull earlier" before it ever degrades the frame.

---

## 10. Risks & deliberate exclusions

**Risks:** (1) photo textures arrive with baked lighting → mitigated by normalisation step and low-contrast usage under vertex tint; (2) a wanted texture only exists BY-SA → parked until you sign off (policy §5.3); (3) unknown-GPU regression → AdaptiveQuality probation remains authoritative, landmarks are first to cull; (4) schematic route ≠ real street geometry → landmark placements are schematic by design (the JSON's own `statusNote`), real side-of-road for the market verified against photos in M2.3.

**Deliberately excluded from this milestone:** traffic/collision/injury/health (banned by you), any `play/` usage, runtime asset downloads, downloaded meshes/glTF, new dependencies, animated anything, OSM integration (ledger already reserves the future credit line), and all deferred housekeeping (CI, `js/main.js`, redraw fixes, restart spike).

---

*End of plan. Nothing in the repository has been modified. On your approval, this document becomes `docs/MILESTONE2_PLAN.md` and M2.1 begins.*
