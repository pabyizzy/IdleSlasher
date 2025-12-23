export class InputManager {
  constructor(target = window) {
    this.keys = new Set();
    this.lastPress = new Set();
    this.touchVector = { x: 0, y: 0 };
    this.touchActive = false;
    this.touchId = null;
    this.touchStart = { x: 0, y: 0 };
    this._down = (e) => {
      const key = e.key.toLowerCase();
      if (!this.keys.has(key)) {
        this.lastPress.add(key);
      }
      this.keys.add(key);
    };
    this._up = (e) => {
      const key = e.key.toLowerCase();
      this.keys.delete(key);
    };
    target.addEventListener("keydown", this._down);
    target.addEventListener("keyup", this._up);
  }

  attachTouch(element) {
    const maxDist = 60;
    const updateVector = (touch) => {
      const dx = touch.clientX - this.touchStart.x;
      const dy = touch.clientY - this.touchStart.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) {
        this.touchVector = { x: 0, y: 0 };
        return;
      }
      const scale = Math.min(1, dist / maxDist);
      this.touchVector = { x: (dx / dist) * scale, y: (dy / dist) * scale };
    };

    element.addEventListener(
      "touchstart",
      (e) => {
        if (this.touchActive) return;
        const touch = e.changedTouches[0];
        if (!touch) return;
        this.touchActive = true;
        this.touchId = touch.identifier;
        this.touchStart = { x: touch.clientX, y: touch.clientY };
        this.touchVector = { x: 0, y: 0 };
        e.preventDefault();
      },
      { passive: false }
    );

    element.addEventListener(
      "touchmove",
      (e) => {
        if (!this.touchActive) return;
        const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.touchId);
        if (!touch) return;
        updateVector(touch);
        e.preventDefault();
      },
      { passive: false }
    );

    element.addEventListener(
      "touchend",
      (e) => {
        if (!this.touchActive) return;
        const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.touchId);
        if (!touch) return;
        this.touchActive = false;
        this.touchId = null;
        this.touchVector = { x: 0, y: 0 };
        e.preventDefault();
      },
      { passive: false }
    );
  }

  isDown(key) {
    return this.keys.has(key.toLowerCase());
  }

  wasPressed(key) {
    return this.lastPress.has(key.toLowerCase());
  }

  consumePresses() {
    this.lastPress.clear();
  }

  getMoveVector() {
    const left = this.isDown("a") || this.isDown("arrowleft");
    const right = this.isDown("d") || this.isDown("arrowright");
    const up = this.isDown("w") || this.isDown("arrowup");
    const down = this.isDown("s") || this.isDown("arrowdown");
    let x = (right ? 1 : 0) - (left ? 1 : 0);
    let y = (down ? 1 : 0) - (up ? 1 : 0);
    x += this.touchVector.x;
    y += this.touchVector.y;
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));
    return { x, y };
  }
}
