// Audio engine: fully headless checks (no WebAudio in Node) - the engine must be a
// no-op-safe state machine that only makes sound after an explicit start() gesture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/audio/AudioEngine.js';

test('audio engine is inert until start() and never throws headless', () => {
  const a = new AudioEngine({ on() {}, emit() {} });
  assert.equal(a.ctx, null);
  a.update(400, 1200, 0.5, 1 / 60);          // no context: silent no-op
  a.horn('bus', 1);
  a.bell();
  a.duck(true);
  a.setMuted(true);
  a.setMuted(false);
  assert.equal(a.ctx, null, 'still no context without a gesture');
});

test('muted flag blocks future work; start stays safe without WebAudio', () => {
  const a = new AudioEngine({ on() {}, emit() {} });
  a.setMuted(true);
  a.start();                                  // muted: refuses to create a context
  assert.equal(a.ctx, null);
  a.setMuted(false);
  // no window.AudioContext in Node: start() must not throw
  a.start();
  assert.equal(a.ctx, null);
});
