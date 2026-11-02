// Tiny publish/subscribe hub. Systems announce things ("player:hit") and any
// other system can react, without the two needing to know about each other.
export class EventBus {
  constructor() { this._map = new Map(); }
  on(name, fn) {
    let set = this._map.get(name);
    if (!set) this._map.set(name, (set = new Set()));
    set.add(fn);
    return () => this.off(name, fn);
  }
  once(name, fn) {
    const off = this.on(name, (...a) => { off(); fn(...a); });
    return off;
  }
  off(name, fn) { const s = this._map.get(name); if (s) s.delete(fn); }
  emit(name, payload) {
    const s = this._map.get(name);
    if (!s) return;
    for (const fn of [...s]) fn(payload);
  }
}
