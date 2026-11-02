// All tunable numbers live here so balancing never means hunting through code.
export const CONFIG = Object.freeze({
  version: '0.1.0',
  sim: {
    step: 1 / 60,          // game rules always advance in 1/60 s steps
    maxStepsPerFrame: 6,   // safety valve if a frame takes very long
    maxFrameDelta: 0.25,   // ignore huge gaps (e.g. returning to the tab)
  },
  player: {
    forwardSpeed: 3.0,     // m/s: automatic walking along the route
    lateralMaxSpeed: 4.2,  // m/s: sideways speed at full steer
    lateralAccel: 16,      // m/s^2: speeding up sideways
    lateralBrake: 22,      // m/s^2: slowing sideways when input released
    strideRate: 0.62,      // walk-cycle cycles per metre travelled
  },
  camera: {
    distance: 4.6,         // metres behind the player (along the route)
    height: 2.25,          // metres above the ground
    lookAhead: 10,         // metres ahead the camera looks at
    lookHeight: 1.15,
    followLateral: 0.78,   // 1 = camera locks to player sideways, 0 = stays on route centre
    damping: 6.5,
    near: 0.4,
    far: 800,
    vFovBase: 60,          // preferred vertical field of view (degrees)
    hFovMin: 62,           // never narrower than this horizontally (portrait phones)
    hFovMax: 100,          // never wider than this (ultra-wide phones)
    vFovMax: 86,
  },
  world: {
    chunkLength: 60,       // metres of road per streamed chunk
    sliceStep: 5,          // road cross-sections every 5 m inside a chunk
    chunksBehind: 1,
    maxBuildPerFrame: 1,   // spread chunk building over frames
  },
});
