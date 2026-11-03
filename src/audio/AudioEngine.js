// Procedural city ambience - the soundscape of Dhaka with ZERO audio files: everything
// is synthesized with WebAudio (noise beds, oscillator horns, bell pings), so there is
// nothing to license and almost nothing to download. The mix follows the player's
// location: traffic rumble dominates at Farmgate, market murmur in Karwan Bazar, and the
// fountain's water hiss grows near the SAARC end of the route.
//
// The engine is created only after a user gesture (the start tap), per mobile autoplay
// rules. `?audio=0` disables it entirely. All gains are conservative; muting is instant.
import { clamp } from '../core/MathUtil.js';

const noiseBuffer = (ctx, seconds, brown) => {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else d[i] = w;
  }
  return buf;
};

export class AudioEngine {
  constructor(bus) {
    this.bus = bus; this.ctx = null; this.muted = false;
    this._beds = {}; this._lastHorn = 0;
  }

  /** Create/resume the context (must run inside a user gesture). Safe to call twice. */
  start() {
    if (this.ctx || this.muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(ctx.destination);

      const bed = (brown, filterType, freq, gain) => {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(ctx, 2.4, brown);
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = filterType; f.frequency.value = freq;
        const g = ctx.createGain(); g.gain.value = 0;
        src.connect(f).connect(g).connect(this.master);
        src.start();
        return { g, f, base: gain };
      };
      // traffic rumble / crowd murmur / fountain water beds
      this._beds.traffic = bed(true, 'lowpass', 340, 0.5);
      this._beds.crowd = bed(false, 'bandpass', 620, 0.16);
      this._beds.water = bed(false, 'highpass', 2400, 0.22);
      if (ctx.state === 'suspended') ctx.resume();
    } catch (_) { this.ctx = null; }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  /** Duck the whole mix when leaving gameplay (pause / end screen), restore on play. */
  duck(on) {
    if (!this.ctx || this.muted || !this.master) return;
    this.master.gain.setTargetAtTime(on ? 0.06 : 0.5, this.ctx.currentTime, 0.25);
  }

  /** Per-frame location mix: playerS along the route, crowdDensity 0..1. */
  update(playerS, routeLength, crowdDensity, dt) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const toEnd = clamp(1 - (routeLength - playerS) / 140, 0, 1);   // 1 near the fountain
    this._beds.traffic.g.gain.setTargetAtTime(this._beds.traffic.base * (1 - toEnd * 0.4), t, 0.4);
    this._beds.crowd.g.gain.setTargetAtTime(this._beds.crowd.base * clamp(crowdDensity, 0, 1), t, 0.6);
    this._beds.water.g.gain.setTargetAtTime(this._beds.water.base * toEnd * toEnd, t, 0.5);
  }

  /** A vehicle horn: bus/cng/car/truck get different voices. side = -1 left / 1 right. */
  horn(type, side = 0) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this._lastHorn < 350) return;               // never a horn wall
    this._lastHorn = now;
    const ctx = this.ctx, t = ctx.currentTime;
    const voice = {
      bus: [300, 0.5], truck: [240, 0.55], car: [440, 0.3],
      cng: [560, 0.28], microbus: [480, 0.3], van: [430, 0.3], motorcycle: [620, 0.22],
    }[type] || [440, 0.3];
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = voice[0] * (0.94 + Math.random() * 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(voice[1] * 0.24, t + 0.03);
    g.gain.setTargetAtTime(0, t + 0.18, 0.09);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = clamp(side, -1, 1) * 0.7;
    osc.connect(g);
    if (pan) { g.connect(pan).connect(this.master); } else g.connect(this.master);
    osc.start(t); osc.stop(t + 0.6);
  }

  /** Cycle-rickshaw bell: a bright double ping. */
  bell() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const off of [0, 0.14]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = 1750 + off * 300;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t + off);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.3);
      osc.connect(g).connect(this.master);
      osc.start(t + off); osc.stop(t + off + 0.35);
    }
  }
}
