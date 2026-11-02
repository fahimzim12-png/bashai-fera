// Watches how fast frames are delivered and nudges quality up/down.
// Pure logic: the caller supplies timestamps, so it is fully unit-testable.
//
// Strategy (cheapest fix first):
//   struggling -> lower the render resolution in 0.1 steps (down to 0.6)
//              -> if already at 0.6, drop one quality tier
//   comfortable for a long time -> try one step back up ("probation").
//   If the step up makes things bad again within a few seconds, undo it and remember
//   that this level is too much for this device (so we never flip-flop).
import { TIER_ORDER, TIERS } from './tiers.js';

export const MIN_SCALE = 0.6;
const WINDOW_MS = 1000;
const BAD_WINDOWS_TO_DROP = 2;
const GOOD_WINDOWS_TO_RISE = 8;
const MIN_MS_BETWEEN_CHANGES = 2000;
const MIN_MS_BEFORE_RISING = 8000;
const PROBATION_MS = 6000;

export class AdaptiveQuality {
  constructor({ tier = 'low', maxTier = 'high', scale = 1, enabled = true } = {}) {
    this.tier = tier;
    this.maxTier = maxTier;
    this.scale = scale;
    this.enabled = enabled;
    this.scaleCeiling = { low: 1, medium: 1, high: 1 };
    this.blockedTiers = new Set();
    this.resetClock();
  }

  resetClock() {
    this._winStart = null; this._sum = 0; this._n = 0;
    this._bad = 0; this._good = 0;
    this._lastChange = -Infinity;
    this._probation = null;
  }

  /** Frame-interval budget (ms) for the current tier: 30 fps cap => 33.3, uncapped => 16.7. */
  get budgetMs() { return TIERS[this.tier].targetFps === 30 ? 1000 / 30 : 1000 / 60; }

  /**
   * Call once per RENDERED frame.
   * @param {number} intervalMs time since the previous rendered frame
   * @param {number} nowMs      current time
   * @returns {null|{tier,scale,kind,reason}} a change to apply, or null
   */
  sample(intervalMs, nowMs) {
    if (!this.enabled) return null;
    if (intervalMs > 250) { this._winStart = null; this._sum = 0; this._n = 0; return null; }  // hitch / tab switch
    if (this._winStart === null) this._winStart = nowMs;
    this._sum += intervalMs; this._n++;
    if (nowMs - this._winStart < WINDOW_MS) return null;

    const avg = this._sum / this._n;
    this._winStart = nowMs; this._sum = 0; this._n = 0;
    const budget = this.budgetMs;

    if (avg > budget * 1.2) {            // struggling
      this._good = 0; this._bad++;
      if (this._bad >= BAD_WINDOWS_TO_DROP || this._probation) {
        if (nowMs - this._lastChange < MIN_MS_BETWEEN_CHANGES && !this._probation) return null;
        this._bad = 0;
        return this._stepDown(nowMs, `avg ${avg.toFixed(1)} ms > ${(budget * 1.2).toFixed(1)} ms`);
      }
      return null;
    }
    this._bad = 0;
    if (avg <= budget * 1.1) this._good++; else this._good = 0;

    if (this._probation && nowMs - this._probation.at > PROBATION_MS) this._probation = null;
    if (this._good >= GOOD_WINDOWS_TO_RISE && nowMs - this._lastChange >= MIN_MS_BEFORE_RISING) {
      this._good = 0;
      return this._stepUp(nowMs);
    }
    return null;
  }

  _stepDown(now, reason) {
    const prob = this._probation;
    this._probation = null;
    this._lastChange = now;
    if (prob) {                                   // the last step up was too much: undo it for good
      if (prob.kind === 'tier') this.blockedTiers.add(prob.toTier);
      else this.scaleCeiling[prob.tier] = Math.min(this.scaleCeiling[prob.tier], prob.fromScale);
      this.tier = prob.tier; this.scale = prob.fromScale;
      return { tier: this.tier, scale: this.scale, kind: 'revert', reason: 'step up failed: ' + reason };
    }
    if (this.scale > MIN_SCALE + 1e-6) {
      this.scale = Math.max(MIN_SCALE, Math.round((this.scale - 0.1) * 100) / 100);
      return { tier: this.tier, scale: this.scale, kind: 'scale', reason };
    }
    const i = TIER_ORDER.indexOf(this.tier);
    if (i > 0) {
      this.tier = TIER_ORDER[i - 1];
      this.scale = 0.9;
      return { tier: this.tier, scale: this.scale, kind: 'tier', reason };
    }
    return null;                                  // already at the floor: nothing more to give
  }

  _stepUp(now) {
    const ceil = this.scaleCeiling[this.tier];
    if (this.scale < ceil - 1e-6) {
      const fromScale = this.scale;
      this.scale = Math.min(ceil, Math.round((this.scale + 0.1) * 100) / 100);
      this._lastChange = now;
      this._probation = { kind: 'scale', tier: this.tier, fromScale, toTier: this.tier, at: now };
      return { tier: this.tier, scale: this.scale, kind: 'scale', reason: 'headroom' };
    }
    const i = TIER_ORDER.indexOf(this.tier);
    const max = TIER_ORDER.indexOf(this.maxTier);
    const next = TIER_ORDER[i + 1];
    if (i < max && next && !this.blockedTiers.has(next)) {
      const fromScale = this.scale;
      const fromTier = this.tier;
      this.tier = next; this.scale = 1;
      this._lastChange = now;
      this._probation = { kind: 'tier', tier: fromTier, fromScale, toTier: next, at: now };
      return { tier: this.tier, scale: this.scale, kind: 'tier', reason: 'headroom' };
    }
    return null;
  }
}
