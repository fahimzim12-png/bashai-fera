// Pure input logic (no browser objects) so it can be unit-tested in Node.
// Every input device is reduced to ONE number: steer in [-1, +1]
// (-1 = left, +1 = right). The rest of the game never knows which device was used.

export function mixSteer({ keyLeft = false, keyRight = false, pointerLeft = false, pointerRight = false }) {
  const left = keyLeft || pointerLeft;
  const right = keyRight || pointerRight;
  return (right ? 1 : 0) - (left ? 1 : 0);   // both pressed => cancel out (0)
}

// Which half of the screen is a pointer on? -1 = left half, +1 = right half.
export function sideForX(clientX, width) {
  return clientX < width / 2 ? -1 : 1;
}

// Tracks every finger/mouse button currently held down.
export class PointerTracker {
  constructor() { this._sides = new Map(); }
  down(id, x, width) { this._sides.set(id, sideForX(x, width)); }
  move(id, x, width) { if (this._sides.has(id)) this._sides.set(id, sideForX(x, width)); }
  up(id) { this._sides.delete(id); }
  clear() { this._sides.clear(); }
  get left() { for (const v of this._sides.values()) if (v < 0) return true; return false; }
  get right() { for (const v of this._sides.values()) if (v > 0) return true; return false; }
  get count() { return this._sides.size; }
}
