// src/spritesheetAnimator.js
export function SpriteSheetAnimator(options) {
  this.image = options.image;                 // HTMLImageElement
  this.frameWidth = options.frameWidth;       // px
  this.frameHeight = options.frameHeight;     // px
  this.columns = options.columns;             // frames per row
  this.rows = options.rows;                   // rows
  this.frameCount = options.frameCount;       // total frames
  this.spacingX = options.spacingX || 0;
  this.spacingY = options.spacingY || 0;
  this.marginX = options.marginX || 0;
  this.marginY = options.marginY || 0;
  this.fps = options.fps;                     // frames per second
  this.loop = options.loop !== false;         // default true

  this.time = 0;
  this.frameIndex = 0;
  this.done = false;
}

SpriteSheetAnimator.prototype.reset = function() {
  this.time = 0;
  this.frameIndex = 0;
  this.done = false;
};

SpriteSheetAnimator.prototype.setFps = function(fps) {
  this.fps = fps;
};

SpriteSheetAnimator.prototype.update = function(dt) {
  if (this.done) return;

  this.time += dt;
  var frameDuration = 1 / this.fps;

  while (this.time >= frameDuration) {
    this.time -= frameDuration;
    this.frameIndex += 1;

    if (this.frameIndex >= this.frameCount) {
      if (this.loop) {
        this.frameIndex = 0;
      } else {
        this.frameIndex = this.frameCount - 1;
        this.done = true;
        break;
      }
    }
  }
};

SpriteSheetAnimator.prototype.draw = function(ctx, x, y, drawWidth, drawHeight, options) {
  // x,y are world/screen coords for the sprite's "anchor"
  // We center the sprite by default.
  options = options || {};
  var anchorX = (options.anchorX != null) ? options.anchorX : 0.5;
  var anchorY = (options.anchorY != null) ? options.anchorY : 0.5;

  var idx = this.frameIndex;
  var col = idx % this.columns;
  var row = Math.floor(idx / this.columns);

  var sx = this.marginX + col * (this.frameWidth + this.spacingX);
  var sy = this.marginY + row * (this.frameHeight + this.spacingY);

  var dx = Math.round(x - drawWidth * anchorX);
  var dy = Math.round(y - drawHeight * anchorY);

  ctx.drawImage(
    this.image,
    sx, sy, this.frameWidth, this.frameHeight,
    dx, dy, drawWidth, drawHeight
  );
};
