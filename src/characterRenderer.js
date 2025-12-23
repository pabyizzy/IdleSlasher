// src/characterRenderer.js
import { SpriteSheetAnimator } from "./spritesheetAnimator.js";
import { SPRITES } from "../assets/sprites/manifest.js";

var trimmedFrameCache = new Map();
var trimLogOnce = new Set();
var sheetValidationLogOnce = new Set();
var baselineCache = new Map();
var baselineLogOnce = new Set();
var TRIM_ALPHA_THRESHOLD_RATIO = 0.002;
var IDLE_TRIM_ALPHA_THRESHOLD_RATIO = 0.006;
var ENABLE_BASELINE_OFFSETS = true;
var baselineWalkLogOnce = false;
var walkSpacingLogOnce = false;

function computeEffectiveFrameCount(image, frameW, frameH, columns, frameCount, threshold) {
  var canvas = document.createElement("canvas");
  canvas.width = frameW;
  canvas.height = frameH;
  var ctx = canvas.getContext("2d");

  for (var i = frameCount - 1; i >= 0; i -= 1) {
    var col = i % columns;
    var row = Math.floor(i / columns);
    var sx = col * frameW;
    var sy = row * frameH;

    ctx.clearRect(0, 0, frameW, frameH);
    ctx.drawImage(image, sx, sy, frameW, frameH, 0, 0, frameW, frameH);
    var data = ctx.getImageData(0, 0, frameW, frameH).data;
    var count = 0;
    for (var p = 3; p < data.length; p += 4) {
      if (data[p] > 10) {
        count += 1;
        if (count >= threshold) {
          return i + 1;
        }
      }
    }
  }
  return 1;
}

function computeBaselineOffsets(image, frameW, frameH, columns, frameCount) {
  var canvas = document.createElement("canvas");
  canvas.width = frameW;
  canvas.height = frameH;
  var ctx = canvas.getContext("2d");
  var bottoms = new Array(frameCount);
  var baselineY = 0;

  for (var i = 0; i < frameCount; i += 1) {
    var col = i % columns;
    var row = Math.floor(i / columns);
    var sx = col * frameW;
    var sy = row * frameH;
    ctx.clearRect(0, 0, frameW, frameH);
    ctx.drawImage(image, sx, sy, frameW, frameH, 0, 0, frameW, frameH);

    var data = ctx.getImageData(0, 0, frameW, frameH).data;
    var found = false;
    var bottom = frameH - 1;
    for (var y = frameH - 1; y >= 0; y -= 1) {
      var rowIndex = y * frameW * 4;
      for (var x = 0; x < frameW; x += 1) {
        var alpha = data[rowIndex + x * 4 + 3];
        if (alpha > 10) {
          bottom = y;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    bottoms[i] = bottom;
    if (bottom > baselineY) baselineY = bottom;
  }

  var offsets = new Array(frameCount);
  var maxOffset = 0;
  for (var j = 0; j < frameCount; j += 1) {
    var offset = baselineY - bottoms[j];
    offsets[j] = offset;
    if (offset > maxOffset) maxOffset = offset;
  }

  return {
    offsets: offsets,
    baselineY: baselineY,
    maxOffset: maxOffset
  };
}

export function CharacterRenderer(assetManager, characterKey) {
  this.assetManager = assetManager;
  this.characterKey = characterKey;

  this.direction = "front";
  this.action = "idle";
  this.scale = 1.0;

  this._animKey = null;
  this._animator = null;
  this._missingLogged = new Set();
  this._sheetKey = null;
  this._sheetMeta = null;
  this._baselineOffsets = null;

  this.anchorX = 0.5;
  this.anchorY = 0.62;
  this.speedFactor = 1;

  if (!baselineWalkLogOnce) {
    baselineWalkLogOnce = true;
    console.log("Baseline offsets disabled for walk (test mode)");
  }
}

CharacterRenderer.prototype.setScale = function(scale) {
  this.scale = scale;
};

CharacterRenderer.prototype.setSpeedFactor = function(factor) {
  this.speedFactor = Math.max(0.1, factor || 1);
};

CharacterRenderer.prototype.setState = function(direction, action) {
  if (direction) this.direction = direction;
  if (action) this.action = action;
};

CharacterRenderer.prototype._getSheetPath = function() {
  var meta = SPRITES.sheetMeta
    && SPRITES.sheetMeta[this.characterKey]
    && SPRITES.sheetMeta[this.characterKey][this.direction]
    && SPRITES.sheetMeta[this.characterKey][this.direction][this.action];
  if (meta && meta.file) {
    return SPRITES.basePath + meta.file;
  }

  var charDef = SPRITES.characters[this.characterKey];
  if (!charDef) return null;
  var dirDef = charDef[this.direction];
  if (!dirDef) return null;
  var file = dirDef[this.action];
  if (!file) return null;
  return SPRITES.basePath + file;
};

CharacterRenderer.prototype._getFps = function() {
  var base = SPRITES.fps[this.action] || 10;
  return base * this.speedFactor;
};

CharacterRenderer.prototype._getSheetMeta = function() {
  var base = SPRITES.sheet;
  var meta = SPRITES.sheetMeta
    && SPRITES.sheetMeta[this.characterKey]
    && SPRITES.sheetMeta[this.characterKey][this.direction]
    && SPRITES.sheetMeta[this.characterKey][this.direction][this.action];
  if (!meta) {
    return {
      frameWidth: base.frameWidth,
      frameHeight: base.frameHeight,
      columns: base.columns,
      rows: base.rows,
      frameCount: base.frameCount,
      spacingX: 0,
      spacingY: 0,
      marginX: 0,
      marginY: 0,
      anchorX: this.anchorX,
      anchorY: this.anchorY,
      explicit: false
    };
  }
  return {
    frameWidth: meta.frameWidth || base.frameWidth,
    frameHeight: meta.frameHeight || base.frameHeight,
    columns: meta.columns,
    rows: meta.rows,
    frameCount: meta.frameCount,
    spacingX: meta.spacingX || 0,
    spacingY: meta.spacingY || 0,
    marginX: meta.marginX || 0,
    marginY: meta.marginY || 0,
    anchorX: (meta.anchorX != null) ? meta.anchorX : this.anchorX,
    anchorY: (meta.anchorY != null) ? meta.anchorY : this.anchorY,
    explicit: true
  };
};

CharacterRenderer.prototype._resolveSheetMeta = function(image, meta) {
  var base = SPRITES.sheet;
  var resolved = {
    frameWidth: meta.frameWidth || base.frameWidth,
    frameHeight: meta.frameHeight || base.frameHeight,
    columns: meta.columns,
    rows: meta.rows,
    frameCount: meta.frameCount,
    spacingX: meta.spacingX || 0,
    spacingY: meta.spacingY || 0,
    marginX: meta.marginX || 0,
    marginY: meta.marginY || 0,
    anchorX: (meta.anchorX != null) ? meta.anchorX : this.anchorX,
    anchorY: (meta.anchorY != null) ? meta.anchorY : this.anchorY
  };

  if (!resolved.columns) {
    if (image.width % resolved.frameWidth === 0) {
      resolved.columns = Math.max(1, Math.floor(image.width / resolved.frameWidth));
    } else {
      resolved.columns = base.columns;
    }
  }

  if (!resolved.rows) {
    if (image.height % resolved.frameHeight === 0) {
      resolved.rows = Math.max(1, Math.floor(image.height / resolved.frameHeight));
    } else {
      resolved.rows = base.rows;
    }
  }

  if (!resolved.frameCount) {
    resolved.frameCount = resolved.columns * resolved.rows;
  }

  return resolved;
};

CharacterRenderer.prototype._getFrameCountOverride = function() {
  var override = SPRITES.overrides
    && SPRITES.overrides[this.characterKey]
    && SPRITES.overrides[this.characterKey][this.direction]
    && SPRITES.overrides[this.characterKey][this.direction][this.action];
  if (!override || !override.frameCount) return null;
  return override.frameCount;
};

CharacterRenderer.prototype._ensureAnimator = function() {
  var sheetPath = this._getSheetPath();
  if (!sheetPath) return;

  var animKey = this.characterKey + ":" + this.direction + ":" + this.action;
  var img = this.assetManager.getImage(sheetPath);
  if (!img) return;

  var meta = this._getSheetMeta();
  if (this.action === "walk" || this.action === "walking") {
    if (!meta.spacingY) {
      meta.spacingY = 1;
      if (!walkSpacingLogOnce) {
        walkSpacingLogOnce = true;
        console.log("Walk spacingY test override = 1");
      }
    }
  }
  meta = this._resolveSheetMeta(img, meta);
  var overrideCount = this._getFrameCountOverride();
  if (overrideCount) {
    meta.frameCount = overrideCount;
  }

  if (!meta.explicit && (img.width !== meta.frameWidth * meta.columns || img.height !== meta.frameHeight * meta.rows)) {
    if (img.width === meta.frameWidth * meta.columns && meta.rows) {
      meta.frameHeight = Math.floor(img.height / meta.rows);
    } else if (!meta.rows && meta.frameCount && meta.columns) {
      meta.rows = Math.ceil(meta.frameCount / meta.columns);
      meta.frameHeight = Math.floor(img.height / meta.rows);
    }
  }

  var cacheKey = sheetPath
    + "|" + meta.frameWidth + "x" + meta.frameHeight
    + "|" + meta.columns + "x" + meta.rows
    + "|" + meta.frameCount
    + "|" + meta.spacingX + "," + meta.spacingY
    + "|" + meta.marginX + "," + meta.marginY;

  var frameCount = meta.frameCount;
  if (trimmedFrameCache.has(cacheKey)) {
    frameCount = trimmedFrameCache.get(cacheKey);
  } else {
    var ratio = (this.action === "idle" || this.action === "idleblink")
      ? IDLE_TRIM_ALPHA_THRESHOLD_RATIO
      : TRIM_ALPHA_THRESHOLD_RATIO;
    var threshold = Math.floor(meta.frameWidth * meta.frameHeight * ratio);
    var trimmed = computeEffectiveFrameCount(
      img,
      meta.frameWidth,
      meta.frameHeight,
      meta.columns,
      frameCount,
      threshold
    );
    trimmedFrameCache.set(cacheKey, trimmed);
    if (trimmed < frameCount && !trimLogOnce.has(cacheKey)) {
      trimLogOnce.add(cacheKey);
      console.log(`Trimmed blank frames: ${sheetPath} from ${frameCount} to ${trimmed} (threshold ${threshold} px)`);
    }
    frameCount = trimmed;
  }

  meta.frameCount = frameCount;
  this._sheetMeta = meta;

  var sheetKey = cacheKey;
  if (sheetKey !== this._sheetKey || !this._animator || animKey !== this._animKey) {
    this._animator = new SpriteSheetAnimator({
      image: img,
      frameWidth: meta.frameWidth,
      frameHeight: meta.frameHeight,
      columns: meta.columns,
      rows: meta.rows,
      frameCount: frameCount,
      spacingX: meta.spacingX,
      spacingY: meta.spacingY,
      marginX: meta.marginX,
      marginY: meta.marginY,
      fps: this._getFps(),
      loop: true
    });
    this._sheetKey = sheetKey;
    this._animKey = animKey;
    this._animator.reset();
    console.log(`Animator rebuild: ${sheetKey}`);
    console.log(
      `Animator meta: ${sheetPath} meta=${meta.frameWidth}x${meta.frameHeight} grid=${meta.columns}x${meta.rows} count=${frameCount} | animator=${this._animator.frameWidth}x${this._animator.frameHeight} grid=${this._animator.columns} count=${this._animator.frameCount} img=${img.width}x${img.height}`
    );
  } else {
    this._animator.setFps(this._getFps());
  }

  if (!sheetValidationLogOnce.has(sheetKey)) {
    sheetValidationLogOnce.add(sheetKey);
    console.log(
      `Sheet meta: ${sheetPath} ${img.width}x${img.height} frame ${meta.frameWidth}x${meta.frameHeight} grid ${meta.columns}x${meta.rows} count ${meta.frameCount} anchorY ${meta.anchorY}`
    );
    if (img.width !== meta.frameWidth * meta.columns || img.height !== meta.frameHeight * meta.rows) {
      console.warn(`Sheet grid mismatch: ${sheetPath}`);
    }
  }

  if (meta.frameWidth !== meta.frameHeight) {
    if (baselineCache.has(sheetKey)) {
      this._baselineOffsets = baselineCache.get(sheetKey);
    } else {
      var baselineData = computeBaselineOffsets(
        img,
        meta.frameWidth,
        meta.frameHeight,
        meta.columns,
        frameCount
      );
      baselineCache.set(sheetKey, baselineData.offsets);
      this._baselineOffsets = baselineData.offsets;
      if (!baselineLogOnce.has(sheetKey)) {
        baselineLogOnce.add(sheetKey);
        console.log(
          `Baseline offsets computed: ${sheetPath} baselineY=${baselineData.baselineY} maxOffset=${baselineData.maxOffset}`
        );
      }
    }
  } else {
    this._baselineOffsets = null;
  }
};

CharacterRenderer.prototype.resetAnimation = function() {
  if (this._animator) this._animator.reset();
};

CharacterRenderer.prototype.update = function(dt) {
  this._ensureAnimator();
  if (this._animator) this._animator.update(dt);
};

CharacterRenderer.prototype.draw = function(ctx, x, y) {
  if (!this._animator) {
    var sheetPath = this._getSheetPath();
    if (sheetPath && this.assetManager.getImage(sheetPath)) {
      return;
    }
    if (sheetPath && !this._missingLogged.has(sheetPath)) {
      this._missingLogged.add(sheetPath);
      console.error(`Missing spritesheet for ${this.characterKey}: ${sheetPath}`);
    }
    this.drawPlaceholder(ctx, x, y);
    return;
  }

  var meta = this._sheetMeta || SPRITES.sheet;
  var w = meta.frameWidth * this.scale;
  var h = meta.frameHeight * this.scale;
  var yAdjusted = y;
  var isWalk = this.action === "walk" || this.action === "walking";
  if (ENABLE_BASELINE_OFFSETS && !isWalk && this._baselineOffsets && this._animator) {
    var idx = this._animator.frameIndex || 0;
    var offset = this._baselineOffsets[idx] || 0;
    yAdjusted = y + offset * this.scale;
  }

  this._animator.draw(ctx, x, yAdjusted, w, h, {
    anchorX: (meta.anchorX != null) ? meta.anchorX : this.anchorX,
    anchorY: (meta.anchorY != null) ? meta.anchorY : this.anchorY
  });
};

CharacterRenderer.prototype.drawPlaceholder = function(ctx, x, y) {
  var size = 26 * this.scale;
  ctx.save();
  ctx.fillStyle = "rgba(100, 228, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};
