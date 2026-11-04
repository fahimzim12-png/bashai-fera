# BASHAI FERA — MILESTONE 4 PLAN
## Real Dhaka Reconstruction, Cinematic Visual Overhaul & Protagonist Redesign

**Status: PLAN — awaiting approval. No game code has been modified.**
**Baseline:** `origin/main` = `155ae5b` (your uploaded M3; tree verified identical to internal M3.7 `d1a8720`). Branch `m4` created from it. Test suite: **81/81 passing** (`node --test tests/*.test.mjs`).

---

## 0. What I did before writing this plan (Part 7 workflow)

1. **Synced with GitHub `main`** — fetched `origin/main` (`155ae5b`, your web upload), verified its tree is byte-identical to the completed M3 work, created branch `m4` from it. This is the M4 baseline.
2. **Verified current milestone commit** — M3.0–M3.7 all present; route JSON `data/routes/farmgate-saarc.json` is the single source of world layout.
3. **Inspected route JSON and geometry pipeline** — full audit of `RouteSpace/RouteModel/ChunkBuilder/ChunkManager/LandmarkManager` (details §3).
4. **Diagnosed the "generic junctions" problem** — the truth is the *opposite* of random junctions: the route data contains **zero junctions**. Details §3, Root Cause 1.
5. **Mapped the real route against geographic references** — downloaded real geometry from OpenStreetMap (Overpass API, 2026-11-04) for Kazi Nazrul Islam Avenue and the Farmgate junction area; cross-checked with Wikipedia (EN+BN), The Daily Star, Prothom Alo, bdnews24, Wikimedia Commons categories, and Nominatim geocoding. Raw OSM extracts are saved and will be committed to the repo under `docs/route-research/` with full provenance (ODbL credit).
6. **Audited every landmark** (footbridge, station, market, fountain) against 2023–2026 ground truth — several M2/M3 structures are outdated or fictional (§2.4).
7. **Reviewed the protagonist model and "the photographs used"** — **critical finding: no photographs were ever used or accessible.** The M3 "photo-based likeness" commit contains **no photo pipeline at all** — it is 6 hardcoded hex colors plus a 128-pixel painted face on a box head (§5.1). This matches the fact that no image attachment ever reached this working environment.
8. **Identified camera limitations** (§4.1).
9. **Prepared this plan** for your approval before any code changes.

---

## 1. Research findings — the real corridor (Part 1)

### 1.1 Alignment (from OSM geometry, extracted 2026-11-04)

Kazi Nazrul Islam Avenue (কাজী নজরুল ইসলাম সরণী) is mapped as **trunk**, **dual carriageway, one-way sides of 3–4 lanes each**, maxspeed 60 where tagged. Measured waypoints (local meter frame: x=east, z=north; origin at 23.7525N, 90.3920E):

| # | Real place | lat, lon | Along-corridor distance (approx.) |
|---|---|---|---|
| A | Farmgate junction (5-arm) | 23.7590, 90.3871 | s ≈ 0 |
| B | Avenue mid-sweep | 23.7557, 90.3912 | s ≈ 560 |
| C | Kawran Bazar metro station | 23.7517, 90.3926 | s ≈ 1030–1080 |
| D | SAARC Fountain (মোড়) | 23.7499, 90.3932 | s ≈ 1250 (end) |
| E | Sonargaon Hotel (beyond fountain) | 23.7496, 90.3949 | +160 m past D |

Key geometric facts:
- The corridor is **~1.25–1.3 km** of road (Farmgate→fountain). The game's 1200 m declared length is close; it will be re-fit to **≈1280 m** from the clean OSM centerline in M4.1.
- After leaving Farmgate the avenue is a **long, nearly constant-bearing sweep (~160°, SSE) with a gentle S-curve near the junction** — *not* a series of turns. The current 7-point spline's gentle wiggle is qualitatively right but quantitatively invented (its status field literally says `schematic`).
- **Cross roads touching the avenue** (OSM + press): at Farmgate — Mirpur Road (N & S arms), Green Road (S), Indira Road (NE, expressway exit lands here), Khamarbari Sarak; then Satrasta Road (north, via Mirpur Rd side), Nakhalpara Road; in the Kawran Bazar stretch — the Karwan Bazar **roundabout/signal** at the FDC road, Bijoy Sarani, Panthapath and Sonargaon Road all meeting at the SAARC mor. The current game has **none of these**.

### 1.2 Farmgate ground truth (2023–2026 state)

- **The M2-era footbridge design is obsolete.** The old bridge was demolished in 2022; the **new Farmgate footbridge opened 15 Oct 2023**: main span **~63 m × 6.4 m wide**, plus a **~21 m wing toward Holy Cross School** (L/T-shaped), designed by URBECO **inspired by Louis I Kahn's truss light experiments** — tensile canopy, **three cantilevered viewing pockets with planter boxes**, plaza with **bus bay + car drop under the bridge**, 3 stairs, escalators/lifts (escalator since famously out of service, cordoned with bamboo, used as a bin). A police box sits at its base. (Daily Star 3444541, 3450306, 3940596; Commons Category:Farmgate Foot Over Bridge.)
- **Farmgate metro station** (MRT-6, opened 5 Nov 2023) is elevated at the junction; viaduct is ~13 m elsewhere but **higher clearance at Farmgate**; uniquely, a **portal-frame pillar stands in the carriageway left of the median** (metro/expressway coordination failure — a famous local detail worth modeling). (Wikipedia MRT Line 6 incl. criticism section; Daily Star/bdnews24 on the Oct 2025 bearing-pad accident.)
- **Dhaka Elevated Expressway** Phase 1 (Kawla→Farmgate, opened Sep 2023) runs **along the railway corridor through Tejgaon, NOT over the junction**; its ramps **land just east of Farmgate** (Indira Road exit; Prothom Alo describes the loop joining at Farmgate; Commons photo "Farmgate ramp near Farmgate Metro Rail Station"). A second exit ramp opened at **FDC gate near Karwan Bazar, 20 Mar 2024**. ~5,000 vehicles/day came off at Farmgate by Oct 2023; Khamarbari became "Dhaka's new hub of traffic congestion."
- **Surroundings:** Khamarbari government complex (Dept. of Agricultural Extension HQ, BARC Bhaban, KIB auditorium — institutional blocks, fair banners); Shahid Anwara Udyan park beside the station (DMTCL site office, contested); Sezan Market and Green Supermarket at the footbridge; **Ananda Cinema Hall** on Green Road; hostel/coaching lanes. (Anam Rangs Plaza is NOT at Farmgate — it's in Dhanmondi; my earlier assumption was wrong and will be corrected.)
- Junction behavior: **signal-controlled 5-arm crossing, no roundabout**; left-hand traffic; constant jaywalking under the new bridge; BRTC + leguna + CNG + rickshaw mix.

### 1.3 Kawran Bazar ground truth

- **Scale:** one of South Asia's largest wholesale markets; DNCC owns **4 markets, 1,789 permanent + 180 temporary shops** (2024). Structure = **concrete multi-storey DNCC kitchen-market building (62+114 shops) + 180 tin-shed shops**, declared hazardous in parts.
- **Clock:** wholesale runs **midnight–7 am** (trucks crowd 4 m lanes); morning **makeshift retail stalls** along footpaths (10–15% cheaper); daytime = **staff buses/microbuses parked bumper-to-bumper along the Karwan Bazar–FDC road (Jahangir Tower→FDC gate)**; porters ("Mintis") carry loads **on their heads in bamboo tukri baskets** (Tk 30/day rental), night shift is busiest.
- **Zoning:** separate wholesale depot (আড়ৎ) per commodity — vegetables, fruit, huge fish market (blue stalls, ice), poultry, blacksmith row; named arats (Meghna Farm, Shah Ali Farm…).
- **Modern contrast (verified):** Pan Pacific Sonargaon (1981, 8-acre gardens, Peter Hsi), **BDBL Bhaban 18 floors**, BSEC Bhaban (RTV HQ), ETV/NTV/ATN studios + Prothom Alo/Daily Star offices, TCB Bhaban, Jahangir Tower; **17th-century three-domed Mughal mosque on a raised platform** amid the chaos.
- **Rail line:** the Dhaka trunk railway passes the market's NE edge (fish market on FDC Road beside the tracks); **Karwan Bazar level crossing** is a named choke point; Tejgaon station just north; expressway shadows the line. Metro viaduct is separate, on the avenue median.
- **FDC:** 7.63-acre studio compound on Karwan Bazar–FDC Road; 6-floor main building + 2015 "Digital Complex"; **12-storey complex under construction** (rebar skeleton); FDC gate = expressway ramp + rally ground.
- **Kawran Bazar metro station** (opened 31 Dec 2023) has **gate signs banning raw fish/meat/vegetables** because shoppers haul produce through it — a perfect authentic detail.

### 1.4 SAARC Fountain ground truth

- Location: **Kawran Bazar/Sonargaon crossing — intersection of Panthapath, Kazi Nazrul Islam Avenue and Sonargaon Road, in front of Pan Pacific Sonargaon**; OSM `amenity=fountain` at **23.74987, 90.39323**, addressed "Saarc Shonargaon Circle". It is a **large traffic-circle island / signalized plaza**, not a simple crossing.
- Sculpture by **Nitun Kundu** (1935–2006): **welded steel** cluster of upward-curving petal/sail fins on an **RCC pool**. M2's dimensions (9.75 m tall, 32 m pool) came from a sourced provenance note and remain the working numbers. Build year conflictingly reported 1985 (EN wiki) vs 1993 (BN wiki) — will be cited as "1980s–90s SAARC-era" in-game.
- **Condition:** long neglect — renovation announced 2017, unmaintained 2021, **cracks 2022**; civic monuments of this class sit behind **tin-sheet fences plastered with posters/banners**. Art direction: **dry/quiet fountain, tin fence, poster ring** — melancholy, recognizable, real.
- Approach (from Kawran Bazar, heading SSE): wide dual carriageway under the metro median viaduct; the steel fins rise above the island as the road bends into the mor; Sonargaon gardens behind it; traffic-police podium, hoardings, vendors at the island edge; protest-blockade history makes it a landmark of gatherings.

### 1.5 MRT-6 and expressway modeling facts

- Viaduct on **median columns**, hammerhead pier caps carrying **4 elastomeric bearing pads**, precast segmental girders, unpainted grey concrete with grime streaks, **pier spacing ≈20–25 m** (pillars numbered; ~430 near Farmgate), deck ~9–10 m soffit, **1500 V DC overhead catenary** (slim masts + messenger/contact wires), partial semi-enclosed noise barriers.
- Stations: **~180 m long, three levels** (street landings that encroach on the footpath, concourse, side platforms), glass/metal curtain boxes, nameplates **Bangla + English**, line brand green **#006747**, entry stairs/escalator cores with hawker clusters at street level.

### 1.6 Licensing discipline

- OSM data = **ODbL** → ASSETS.md gains a "© OpenStreetMap contributors" attribution row; raw extracts + digest committed under `docs/route-research/` for auditability.
- Press/Wikipedia facts are cited inline in the route JSON's `provenance` block (schema extended for junctions/arms).
- No new third-party models/textures are introduced; all art remains procedural-authored. Hind Siliguri (OFL) stays the only font.

---

## 2. What changes vs the current route (delta table)

| Aspect | M3 today | M4 target |
|---|---|---|
| Route status | `"schematic"`, no coordinates used | `"geo-referenced"`, centerline fitted to OSM chain; provenance block with sources + date |
| Centerline | 7 invented points, 1216 m | OSM-fitted spline ≈1280 m, gentle SSE sweep, junction kink at Farmgate |
| Junctions | **0** | **Named junction records**: Farmgate 5-arm (s≈60), Khamarbari (≈210), side-road stubs (≈520, ≈700), Karwan Bazar mor + FDC road (≈1050), SAARC mor (≈1250) — each with arms, side, signal state, median gap |
| Landmark positions | footbridge s=45, station s=180, market 645–995, fountain end+22 | footbridge over junction (s≈60), station box s≈70–170, market zone s≈900–1150 **with KB station at s≈1060**, fountain at the mor s≈1250, Sonargaon gardens beyond |
| Farmgate footbridge | M2 generic arch bridge | 2023 rebuild: L-shape + Holy Cross wing, tensile canopy, cantilever pockets w/ planters, plaza + bus bay + police box |
| Expressway | absent | ramp landing east of Farmgate + FDC-gate ramp + rail-corridor mainline to the NE |
| Market | generic sheds both sides | DNCC concrete kitchen market + tin-shed rows + fish market + arat signs + porter gangs w/ tukri + parked staff buses + rail line & level crossing + Mughal mosque + tower backdrop (BDBL/BSEC/TV studios) |
| Fountain | 9 static blades, plaza | steel petal cluster (real form), RCC pool, **dry/derelict state**, tin fence + poster ring, Sonargaon gardens, Panthapath/Bijoy Sarani arms |
| Buildings | 1 box generator + 1 facade texture | 8 district-authored archetypes (§3.3) |
| Materials | 3 Lambert vertex-color materials, no shadows | atlas-based materials + ACES tone mapping + blob shadows everywhere + real shadow map on high tier (§3.2) |
| Camera | fixed follow 4.6 m / 2.25 m | spring rig + shot grammar + landmark reveals + intro dolly (§4) |
| Hero | box head, painted face, baked arms, no photos | rebuilt body/animation now; **face likeness gated on your photographs** (§5) |

**Deliberately unchanged:** route-space (s, lateral) model, chunk streaming, 3+3 lane cross-section with median viaduct (it matches reality), TrafficSystem/CrowdSystem logic (visuals upgraded, systems preserved), player controller, ending system, landing page, controls, `play/` untouched.

---

## 3. Why it currently looks generic — code diagnosis (Part 2 target)

Root causes from the full audit (evidence in parentheses):

1. **No junctions exist in the data** (`farmgate-saarc.json` has no junction field; only 2 zebra crossings at s=45 and route end; zero cross-traffic). "Too many generic turns" perception = one unbroken smoothed ribbon + no side arms anywhere.
2. **One uniform road ribbon for 1.2 km** — 3 cross-section templates blended over 24 m; median + viaduct never vary except twice; lane dashes every 6 m with no bus bays/turning pockets (`RouteModel._blend`, `ChunkBuilder`).
3. **Buildings = one seeded box generator** (`RouteModel.get buildings`) — no archetypes, no setbacks, no district logic; `clears[]` around landmarks leaves vacant lots.
4. **A single 512² facade texture wallpapers the whole city** (`FacadeTexture.js`, 10 window archetypes, world-continuous UVs → visible repetition); exactly **3 materials game-wide** (`Game.js:95–97`), all Lambert vertex-color, **no shadows anywhere** (`Environment.js:1–2`).
5. **Scatter is a hash grid, not composition** — props at rigid 7/9/11/13 m lattices with hash jitter (`ChunkBuilder`) → statistically uniform, perceptibly periodic.
6. **Traffic is lane-center-locked 1-D flow** — symmetric 3+3 lanes, no intersections, no parked vehicles (`TrafficSystem.damp` to lane centers) while the route's own provenance notes footpath parking is the street's signature.
7. **Landmarks are isolated set-pieces** with abstract signage (station name board deliberately has no text) and cleared surroundings — disconnected from street grammar.
8. **Hero is boxes with a painted face** (`PlayerAvatar`: head = `BoxGeometry(0.23,0.27,0.24)`, 4-sphere hair, baked arms without elbows, **no likeness pipeline**).

### 3.1 Visual style target (agreed direction)

**Semi-realistic, grounded, cinematic Dhaka daylight.** Desaturated, dusty, warm-grey concrete world; traffic and people provide the color. Not cartoon, not toy-like, not over-saturated. Working palette (from photo research):

| Surface | Hex | | Surface | Hex |
|---|---|---|---|---|
| Worn asphalt | `#3B3E42` | | CNG auto green | `#1E8A4E` |
| Concrete viaduct/piers | `#A9A9A1` | | Bus livery red | `#A6231F` (trim `#8DB63C`) |
| Mosaic plaster facade | `#D8CCAF` (green-chip `#B9C4AD`) | | Dust-haze sky | `#C9CFD4` → horizon `#E4E2D8` |
| Rust/brick stain | `#8A4A32` | | Foliage | `#55703C` |
| Tin/CI sheet | `#9AA0A6` (rusty `#7E6A5A`) | | Road paint (faded) | `#E3E0D3` |
| Metro brand green | `#006747` (sourced) | | | |

### 3.2 Materials & lighting uplift (staged, Redmi-9-safe)

- **Tone mapping:** `ACESFilmicToneMapping` + exposure tuning; rebalanced sun/hemisphere/fog to the dry-season haze palette above. Fog stays distance-mapped (district moods preserved).
- **Contact blob shadows** (dark soft-edge ellipse decals) under avatar, all vehicles, all crowd members — grounds every object at ~0 cost, all tiers.
- **Real shadows on high tier only:** single directional light, 1024 map, tight 80×80 m ortho box following the player; buildings/landmarks/vehicles cast, ground receives. Low/medium keep decals only.
- **New authored atlases (canvas-generated, art-directed, no random noise):** road atlas (patchwork asphalt, tar seams, ghost paint, oil lanes, zebra, kerb wear); 4 per-district facade atlases (institutional mosaic / residential stained plaster / commercial glass+signband / market tin) replacing the single texture; tin+tarp atlas for market; footpath tile atlas. Material count stays ≤12 unique.
- **Weathering rules, not noise:** monsoon streaks under sills, drip stains under AC units (M3 already has the drip system — kept), rust creep on tin, faded paint bands, water tide-lines at kerbs.

### 3.3 Building archetypes (replace the box generator)

Eight authored, parametric-but-constrained generators (seeded per plot, per-district weight tables in route JSON):

1. `institutional` — Khamarbari-type: 2–3 floors, cream mosaic over red-brick base, flag masts, fair banners, wide steps.
2. `midrise_mosaic` — 4–7 floors, chip-tile facade, grille windows, balconies with drying clothes, rooftop water tanks + antennas.
3. `commercial_glass` — 6–9 floors, mirrored blue glass bands, AC outdoor unit rows, rooftop billboards.
4. `media_studio` — TV-channel block: satellite dish cluster, big brand band (sign atlas), generator sheds.
5. `market_block` — DNCC concrete kitchen market: stained concrete, vertical stacked Bangla signboard column, exposed rebar, floor-band shutters.
6. `tin_shed_row` — market sheds (M2 KarwanMarket engine reused/extended), rusty corrugation, tarp patches, open fronts with produce.
7. `half_built` — rebar stubs, bamboo scaffold poles + green netting, cement-bag stacks, unfinished top floor.
8. `hotel_garden` — Sonargaon-type: low-wide block set back in trees/lawns, perimeter wall, gate lamp.

Rules: per-segment archetype weight tables; no archetype >35% share within a segment (anti-repetition test); floor heights 2.9–3.6 m varied; setbacks by district; rooftop kits (tank/room/antenna/dish/billboard) chosen by archetype; signboards only at plausible commercial lines (no random Bengali text on blank walls).

### 3.4 De-periodized scatter — authored vignettes

Replace fixed hash-lattice props with **vignette spawners** (fixed internal layout + jitter, placed by district script): `bus_bay` (parked bus + queue + CNG rank), `tea_stall` (bench cluster + kettle cart + sitting crowd — reused M3 stall anchors), `porter_gang` (3–5 porters with tukri + crate walls), `poster_wall` (pillar/hoarding w/ layered posters), `hawker_row` (clothing racks + fruit pyramids), `footpath_wear` (stain decals + broken paver patches). Vignettes sit **on footpaths only** — playable path stays clear (validated by test).

### 3.5 Vehicles & crowd visual upgrade (systems preserved)

- Vehicles: keep all 8 instanced types + logic; restyle meshes with real proportions — bus double-leaf doors, roof racks, **Bangla route boards via sign atlas**, hand-painted livery stripes; CNG green `#1E8A4E` with canopy frame; rickshaw hood art strip + bell; cars in white/silver Axio/Allion tones; microbus Noah silhouette; **parked staff buses along the market edge** (static instanced row, off the playable path).
- Crowd: keep CrowdSystem + 8-draw-call renderer; add **two-segment arms with elbows for the hero** (crowd already has them), better head shapes (crowd gets one improved head mesh), sari drape quad, porter headload tukri baskets, lungi/panjabi variants. Population/budgets unchanged.

---

## 4. Cinematic camera redesign (Part 3)

`CameraRig.js` v2 — same route-space follow concept, film-quality execution (constants start values, tuned in playtests):

- **Two-stage critically-damped spring**: position spring k≈26 (critically damped) on (s, lateral, height); separate faster spring (k≈60) on the look target. Camera never snaps to the player; it *catches* them.
- **Framing:** distance 4.6 m, height 2.25 m, look-ahead 12 m, **rule-of-thirds lateral offset ~0.9 m** (character off-center, road vista favored); portrait keeps the existing keep-in-view clamp + FOV widening.
- **Speed language:** FOV base 58° (+4° kick at full stride, eased); camera height dips 0.15 m and distance grows 0.4 m with speed — subtle, never disorienting.
- **Handheld life:** 2-octave value-noise sway ≤0.05 rad yaw / 0.15 m position at ~0.1–0.3 Hz (time-coherent, deterministic-seeded), plus 0.02 m walk-cycle breathing. Caps enforced (no nausea).
- **Steer grammar:** ±1.0° roll into steering, ±0.5 m lateral drift, look-target leads steering velocity by 0.3 s.
- **Near-miss response:** existing shake retained + 60 ms FOV punch (+2°) + 150 ms lateral jolt *away* from the vehicle; always ≤0.3 s, control never blocked.
- **Landmark reveals:** at progress marks (Farmgate, Karwan Bazar, SAARC mor) a 2.5 s dolly (distance 6.2→4.6) + 1.2 s look-at the landmark; **any input skips instantly**.
- **Intro shot:** one 3.5 s arc (low front-side 3/4 angle of the hero at Farmgate → settle into follow); skippable; plays once per session.
- **DOF: none in M4.** No post pipeline exists; a cheap blur would harm visibility/perf on Redmi 9. Depth is earned via fog, framing layers (viaduct overhead, foreground props), and the haze palette. Revisit only if a post pass proves affordable later.
- All shots resolve through the existing `fov.js` aspect clamps; **player control is never modified by camera state**.

---

## 5. Protagonist redesign (Part 4) — ⚠ LIKENESS IS BLOCKED ON YOUR PHOTOS

### 5.1 Honest audit result

The M3 commit message says "photo-based likeness", but the code contains **no photograph, no upload path, no likeness config** — only 6 hardcoded hex colors + a 128-px painted face on a **box head** with **default rectangular glasses** and a generic hairstyle. You are right that it doesn't resemble you: nothing ever fed your appearance into it. **No image attachment has ever been accessible in this working environment** (including this session). Per your instruction, I am explicitly asking:

> **Please attach your 3–5 reference photographs again** (front, 3/4, profile; even lighting; hair visible). If you prefer, upload them to the repo or any image host and paste the links.

### 5.2 What ships in M4 regardless (body, clothing, animation)

- **Body:** 1.72 m real proportions; rebuilt torso with collar geometry, shirt hem curve, chest back-panel; trousers with crease texture; proper shoes with soles; **elbow joints added**; hands with thumbs; office bag kept (optional per your brief).
- **Head (geometry-only, no likeness claims):** rounded skull profile replacing the box, neck, ears; **no glasses** unless your photos show them.
- **Animation:** walkCycle v2 — hip rotation ±4°, shoulder counter-rotation, head stabilization (counter-yaw), foot contact placement synced to stride phase (feet stop sliding), weight transfer roll, idle breathing + weight shift, stumble/recovery pose hooks (via the existing unused `speedScale` hook), blendPose for all transitions.
- **Likeness QA gate:** when photos arrive — measured trait sheet (face width/jaw/brows/eye spacing/nose/lips/hairline/skin hex sampled from photos) → head texture + geometry pass → **3-view render sheet posted to you for approval before merge**. If the result is not recognizably you, I say so and iterate rather than ship a false claim.

---

## 6. Performance plan (Part 6) — Redmi 9 floor unchanged

| Budget | Low (Redmi 9) | Medium | High |
|---|---|---|---|
| Draw calls | **<100 total (smoke-tested)** | <100 | <110 (shadow pass extra) |
| Worst chunk tris | <24,000 (kept) | <24,000 | <28,000 |
| Traffic / crowd | 12 / 14 (unchanged) | 18 / 24 | 26 / 36 |
| Textures added | none extra (quality-gated) | road atlas | road + 4 facade atlases + tin atlas (~3.5 MB VRAM total) |
| Shadows | blob decals only | blob decals | +1× 1024 directional, 80 m box |
| New per-frame cost | none | ACES tonemap (GPU-free) | shadow map |

- Geometry strategy unchanged (merged chunks, instancing, pooling, culling); archetypes merge into the same 2–3 draw calls per chunk; atlas reuse means **texture state changes do not grow** with world size.
- AdaptiveQuality (struggle → scale → tier drop) retained; the dead `dust` tier flag is removed or implemented as a cheap 20-sprite system — decision in M4.2, no cost on low.
- No motion blur, no post-processing, no per-pixel effects. Normal gameplay stays smooth; screenshots are earned by composition, not effects.

---

## 7. Implementation stages (each independently shippable & revertible via web upload)

| Stage | Scope | Key files | Tests added/updated |
|---|---|---|---|
| **M4.1 Route geography** | OSM re-fetch (when Overpass quota resets; fallback: cached chain + waypoint fit), route JSON v2 (`junctions[]`, `sideRoads[]`, `busBays[]`, `geo.provenance`, landmark re-placement, declaredLength ≈1280), validator v2, centerline re-fit, progress marks, `docs/route-research/` commit | `data/routes/farmgate-saarc.json`, `RouteModel.js`, `validateRoute.js`, `signCatalog.js` (junction name signs), `docs/route-research/*` | `route.test.mjs` (length bounds 1200–1400, junction schema, curvature ≤ threshold, landmark s-table ±2%, provenance present), new `route-geo.test.mjs` |
| **M4.2 Light & tone** | ACES, sun/hemi/fog to Dhaka palette, sky dome regrade, blob shadow decals (vehicles/crowd/avatar), high-tier shadow map, `dust` flag decision | `RendererFactory.js`, `Environment.js`, `Game.js`, `tiers.js` | `quality.test.mjs` updates, `render-tone.test.mjs` (palette membership, exposure, shadow tier gating) |
| **M4.3 Road & ground materials** | road atlas (patches/ghost paint/zebra/oil), footpath atlas, kerb wear, lane-paint fade, patchwork strips | `ChunkBuilder.js`, `FacadeTexture.js` (renamed `SurfacesTexture` split), new `RoadTexture.js` | `chunk.test.mjs` updates (tris cap holds), `materials.test.mjs` (atlas count ≤12 materials, road atlas regions exist) |
| **M4.4 Building archetypes** | 8 generators + 4 facade atlases + rooftop kits + per-district weights in JSON | `RouteModel.js`, `ChunkBuilder.js`, `FacadeTexture.js`, route JSON | new `archetypes.test.mjs` (determinism, ≤35% dominance, height sanity, atlas variant count) |
| **M4.5 Farmgate set-piece** | 5-arm junction geometry + signals, footbridge v2 (L-shape, tensile canopy, pockets, plaza/bus bay, police box), station v2 (3-level, green brand, nameboard text, portal pillar), expressway ramp landing, Khamarbari blocks, Anwara park, Ananda/Sezan stubs | `landmarks/FarmgateFootbridge.js`, `FarmgateStation.js`, new `FarmgateJunction.js`, `ElevatedExpressway.js`, `Khamarbari.js`, `registry.js` | `landmarks.test.mjs` updates (new budgets), `farmgate.test.mjs` (arm count=5, footbridge span≥60, station straddles median, ramp lands east) |
| **M4.6 Kawran Bazar + corridor** | market v2 (DNCC block + shed rows + fish market + arat signs + crates + porter gangs + parked buses + rail line + level crossing + Mughal mosque + FDC compound/ramp + tower backdrop), corridor vignettes, bus bays | `landmarks/KarwanMarket.js`, new `KarwanBazarZone.js`, `RailLine.js`, `dressing.js`, `CrowdSystem.js` (porter/anchor data only) | `landmarks.test.mjs`, `crowd.test.mjs` (market crowd anchors), `karwan.test.mjs` (sheds 12–48 m lateral, rail line off-path, no vignette blocks walkable band) |
| **M4.7 SAARC mor** | fountain v2 (steel petals, RCC pool, dry state, tin fence + posters), plaza, Sonargaon gardens, Panthapath/Bijoy Sarani arms, approach bend | `landmarks/SaarcFountain.js`, new `SonargaonGardens.js` | `landmarks.test.mjs` (blade cluster 9–10 m, pool 30–34 m, fence ring, gardens laterally off-path) |
| **M4.8 Camera v2 + body/anim** | spring rig, shot grammar, reveals, intro dolly, FOV language; hero body rebuild, walkCycle v2, elbows, idle/stumble | `camera/CameraRig.js`, `fov.js`, `Game.js`, `PlayerAvatar.js`, `walkCycle.js` | new `camera.test.mjs` (spring settle <1 s, sway caps, reveal presets, near-miss punch decay, portrait clamp), `walkcycle.test.mjs` v2 (foot-phase sync, no slide) |
| **M4.9 Likeness (gated)** | trait sheet from your photos → head texture/geometry → 3-view approval sheet → merge | `PlayerAvatar.js`, new `likeliness.js` | new `likeliness.test.mjs` (schema, head params derive from sheet, no-glasses default) |

Each stage = 1–2 commits, full `node --test` run, and a **web-upload ZIP of only that stage's new/changed files at original paths** (same as M2/M3 delivery), plus a cumulative `UPLOAD_MANIFEST_M4.md`. `smoke.mjs` cannot run in this sandbox (no Chrome) — browser verification on your side after each upload, with a short what-to-look-for checklist per stage.

---

## 8. Full files-to-touch list

**Modified:** `data/routes/farmgate-saarc.json`, `src/world/{RouteModel,validateRoute,ChunkBuilder,dressing,Environment,signCatalog}.js`, `src/world/landmarks/{registry,FarmgateFootbridge,FarmgateStation,KarwanMarket,SaarcFountain}.js`, `src/render/{RendererFactory,FacadeTexture,tiers}.js`, `src/camera/CameraRig.js`, `src/player/{PlayerAvatar,walkCycle}.js`, `src/core/{Game,Config}.js`, `assets/ASSETS.md`, `docs/{ARCHITECTURE,DEVELOPMENT}.md`, tests (7 existing files updated).
**New:** `src/world/landmarks/{FarmgateJunction,ElevatedExpressway,Khamarbari,KarwanBazarZone,RailLine,SonargaonGardens}.js`, `src/render/{RoadTexture,SurfacesTexture}.js`, `src/player/likeliness.js` (gated), `docs/route-research/{README.md,osm-avenue.json,osm-farmgate.json,digest.md}`, `tests/{route-geo,render-tone,materials,archetypes,farmgate,karwan,camera,likeliness}.test.mjs`, `docs/MILESTONE4_PLAN.md` (this file), `UPLOAD_MANIFEST_M4.md` per stage.
**Untouched:** `play/`, landing page (`index.html`, `js/landing.js`), `src/input/*`, `src/ui/*`, `src/audio/*` (except small zone beds if budget allows), `src/core/{Loop,StateMachine,EventBus,ObjectPool,Rng,WakeLock}.js`, `vendor/three/*`.

## 9. Preserved invariants (non-negotiables)

Landing page • Farmgate→Karwan Bazar→SAARC route identity • controls • ending system • M2/M3 landmark architecture (extended, not replaced) • traffic & crowd **systems** (logic preserved, visuals upgraded) • mobile compatibility & Redmi-9 budgets • no unnecessary external dependencies (all art remains procedural; only data + fonts already bundled) • `play/` prototype stays rejected and untouched.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Overpass quota still throttled during M4.1 | Cached avenue chain + 6 verified waypoints + press coordinates are already sufficient to fit the centerline; re-query only refines it |
| Face likeness expectations | Likeness is **explicitly gated** on photos + your approval of a 3-view sheet; no false claims shipped |
| Test-budget churn (bigger landmark geometry) | Per-landmark budgets re-derived in the same commit that changes geometry; total cap raised only with evidence |
| Atlas VRAM on low tier | New atlases quality-gated; low tier keeps M3 materials until medium |
| Scope creep | Stages are separable; each ships alone through the proven web-upload path |

## 11. Approval checklist

1. **Re-attach your 3–5 photographs** (required only for M4.9 likeness; everything else can start without them).
2. Approve this plan (or mark amendments — e.g., route length ≈1280 m, fountain "dry/derelict" state, no-DOF decision).
3. On approval I implement **M4.1 → M4.8 in order**, delivering one web-upload ZIP + manifest per stage, full test output, and an honest browser-check checklist per stage.
