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
src/world/             RouteSpace, RouteModel, validateRoute, ChunkBuilder (pure), ChunkManager, Environment
src/player/            PlayerController (pure sim), PlayerAvatar (placeholder body)
src/camera/            CameraRig, fov
src/render/            renderer factory, quality tiers + adaptive quality, GeometryBuilder, facade texture
src/ui/, src/debug/    HUD, overlays, debug overlay
data/routes/           route JSON (authored content + sources)
vendor/three/          pinned Three.js
tests/                 unit tests (node tests/run.mjs) + optional browser smoke test
```

## Performance design (Redmi 9 first)
* One street chunk (60 m) = 2 draw calls (vertex-coloured + textured facades). Whole scene ~16 draw calls, ~8k triangles.
* No real-time shadows, 2 lights, fog hides streaming, static meshes (matrixAutoUpdate off), pooled chunk meshes.
* Phones start on the LOW tier (render scale <= 1.0, 30 fps cap). `AdaptiveQuality` lowers resolution then tier when frames
  are late, and only raises quality after proving headroom (a failed promotion is reverted and never retried).
* `?debug=1` shows FPS, draw calls, triangles, memory, tier changes.

## Milestones
1. **Foundation** (done): entry point, renderer, quality system, input, route data, first 1.2 km of the route, camera, HUD.
2. Traffic + collision detection + context damage (stumble / fall / game-ending) + health model.
3. Hazards (unpredictable), crossings, signals, footbridge.
4. Audio engine + Bangla ambience zones.
5. Consequence flow + memorial cards (separate system) + cinematic transitions.
6. 2D backstory + route select + save/settings.
7. More routes/landmarks, GLB assets, art pass. 8. Polish, accessibility, QA matrix.
