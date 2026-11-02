// Glue between the pure quality logic (tiers + AdaptiveQuality) and the real renderer.
import { TIERS, chooseTier, maxTierFor, detectProfile } from './tiers.js';
import { AdaptiveQuality } from './AdaptiveQuality.js';

export class QualityManager {
  constructor({ renderer, profile, forcedTier = null, adaptive = true, onChange = () => {} }) {
    this.renderer = renderer;
    this.profile = profile;
    this.forcedTier = forcedTier;
    this.onChange = onChange;
    const tier = chooseTier(profile, forcedTier);
    this.aq = new AdaptiveQuality({ tier, maxTier: maxTierFor(profile, forcedTier), scale: 1, enabled: adaptive && !forcedTier });
    this.width = 1; this.height = 1;
    this.lastChange = null;
  }

  get tier() { return TIERS[this.aq.tier]; }
  get scale() { return this.aq.scale; }
  get pixelRatio() { return Math.max(0.5, Math.min(this.profile.dpr || 1, this.tier.maxPixelRatio) * this.aq.scale); }

  resize(width, height) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);   // false: CSS (100%) controls the on-screen size
  }

  /** Call once per rendered frame. Applies any quality change and returns it (or null). */
  sample(intervalMs, nowMs) {
    const change = this.aq.sample(intervalMs, nowMs);
    if (change) {
      this.lastChange = { ...change, at: Math.round(nowMs) };
      this.resize(this.width, this.height);
      this.onChange(change);
    }
    return change;
  }

  resetClock() { this.aq.resetClock(); }
}

export { detectProfile };
