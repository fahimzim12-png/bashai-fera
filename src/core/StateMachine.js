// Only ONE game state is active at a time (loading, ready, playing, ...).
// Only the active state's update/render run, so e.g. a cutscene can never
// accidentally keep traffic moving.
export class StateMachine {
  constructor(states) {
    this.states = states;
    this.name = null;
  }
  get current() { return this.name ? this.states[this.name] : null; }
  go(name, data) {
    if (!this.states[name]) throw new Error(`Unknown state: ${name}`);
    const prev = this.name;
    if (prev && this.states[prev].exit) this.states[prev].exit(name);
    this.name = name;
    if (this.states[name].enter) this.states[name].enter(prev, data);
  }
  update(dt) { const s = this.current; if (s && s.update) s.update(dt); }
  render(...args) { const s = this.current; if (s && s.render) s.render(...args); }
}
