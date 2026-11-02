// One place that answers "what does the player want right now?"
// Sources (keyboard, touch) are plugged in here. A gamepad source can be added
// later without touching any gameplay code.
import { mixSteer } from './SteeringMixer.js';
import { KeyboardSource } from './KeyboardSource.js';
import { PointerSource } from './PointerSource.js';

export class InputManager {
  constructor(bus, pointerElement) {
    this.bus = bus;
    this.keyboard = new KeyboardSource(bus);
    this.pointer = new PointerSource(pointerElement, bus);
    this.device = 'keyboard';
    bus.on('input:device', (d) => { this.device = d; });
  }
  attach() { this.keyboard.attach(); this.pointer.attach(); }
  detach() { this.keyboard.detach(); this.pointer.detach(); }
  reset() { this.keyboard.left = this.keyboard.right = false; this.pointer.clear(); }

  /** -1 (left) .. +1 (right). */
  get steer() {
    return mixSteer({
      keyLeft: this.keyboard.left, keyRight: this.keyboard.right,
      pointerLeft: this.pointer.tracker.left, pointerRight: this.pointer.tracker.right,
    });
  }
}
