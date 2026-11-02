// Desktop keyboard: A / D / Left / Right to steer, Esc or P to pause.
export class KeyboardSource {
  constructor(bus) {
    this.bus = bus;
    this.left = false;
    this.right = false;
    this._down = (e) => this._onKey(e, true);
    this._up = (e) => this._onKey(e, false);
    this._blur = () => { this.left = false; this.right = false; };
  }
  attach() {
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('blur', this._blur);   // avoids "stuck" keys after alt-tab
  }
  detach() {
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
    window.removeEventListener('blur', this._blur);
  }
  _onKey(e, isDown) {
    switch (e.code) {
      case 'KeyA': case 'ArrowLeft':
        this.left = isDown; this._claim(e, isDown); break;
      case 'KeyD': case 'ArrowRight':
        this.right = isDown; this._claim(e, isDown); break;
      case 'Escape': case 'KeyP':
        if (isDown && !e.repeat) this.bus.emit('input:pause');
        break;
      case 'Backquote':
        if (isDown && !e.repeat) this.bus.emit('input:debugToggle');
        break;
      default: return;
    }
  }
  _claim(e, isDown) {
    if (isDown) this.bus.emit('input:device', 'keyboard');
    e.preventDefault();   // stop arrow keys scrolling the page
  }
}
