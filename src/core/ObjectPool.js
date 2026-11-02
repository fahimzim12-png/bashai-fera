// Re-uses objects instead of creating/destroying them (avoids garbage-collector
// hitches on phones). Used for world chunk meshes now; vehicles later.
export class ObjectPool {
  constructor(create, reset = () => {}, max = Infinity) {
    this._create = create; this._reset = reset; this._max = max;
    this._free = []; this.created = 0;
  }
  acquire() {
    if (this._free.length) return this._free.pop();
    this.created++;
    return this._create();
  }
  release(obj) {
    this._reset(obj);
    if (this._free.length < this._max) this._free.push(obj);
  }
  get freeCount() { return this._free.length; }
}
