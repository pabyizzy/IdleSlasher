// assets/sprites/manifest.js
export var SPRITES = {
  basePath: "assets/sprites/",

  // Shared spritesheet layout (based on your 2400x960 example => 5x2 of 480x480)
  sheet: {
    frameWidth: 480,
    frameHeight: 480,
    columns: 5,
    rows: 2,
    frameCount: 10
  },

  // Default FPS per action (tweak later)
  fps: {
    idle: 8,
    walk: 10,
    run: 12,
    attack: 14,
    hurt: 10,
    die: 8
  },

  // Character set (you can add more later)
  characters: {
    assassin: {
      // Map: direction -> action -> filename
      back: {
        idle: "Assassin/Back - Idle.png",
        walk: "Assassin/Back - Walking.png",
        run: "Assassin/Back - Running.png",
        attack: "Assassin/Back - Attacking.png",
        hurt: "Assassin/Back - Hurt.png"
      },
      front: {
        idle: "Assassin/Front - Idle.png",
        idleBlink: "Assassin/Front - Idle Blinking.png",
        walk: "Assassin/Front - Walking.png",
        run: "Assassin/Front - Running.png",
        attack: "Assassin/Front - Attacking.png",
        hurt: "Assassin/Front - Hurt.png",
        die: "Assassin/Dying.png"
      },
      left: {
        idle: "Assassin/Left - Idle.png",
        idleBlink: "Assassin/Left - Idle Blinking.png",
        walk: "Assassin/Left - Walking.png",
        run: "Assassin/Left - Running.png",
        attack: "Assassin/Left - Attacking.png",
        hurt: "Assassin/Left - Hurt.png"
      },
      right: {
        idle: "Assassin/Right - Idle.png",
        idleBlink: "Assassin/Right - Idle Blinking.png",
        walk: "Assassin/Right - Walking.png",
        run: "Assassin/Right - Running.png",
        attack: "Assassin/Right - Attacking.png",
        hurt: "Assassin/Right - Hurt.png"
      }
    }
  },

  sheetMeta: {
    assassin: {
      back: {
        idle: {
          file: "Assassin/Back - Idle.png",
          columns: null,
          rows: null,
          frameWidth: 480,
          frameHeight: 480,
          frameCount: null,
          anchorX: 0.5,
          anchorY: 0.62
        },
        walk: {
          file: "Assassin/Back - Walking.png",
          columns: 4,
          rows: 5,
          frameWidth: 480,
          frameHeight: 480,
          frameCount: 20,
          anchorX: 0.5,
          anchorY: 0.62,
          spacingX: 0,
          spacingY: 0,
          marginX: 0,
          marginY: 0
        }
      },
      front: {
        idle: {
          file: "Assassin/Front - Idle.png",
          columns: null,
          rows: null,
          frameWidth: 480,
          frameHeight: 480,
          frameCount: null,
          anchorX: 0.5,
          anchorY: 0.62
        },
        walk: {
          file: "Assassin/Front - Walking.png",
          columns: 4,
          rows: 5,
          frameWidth: 480,
          frameHeight: 480,
          frameCount: 20,
          anchorX: 0.5,
          anchorY: 0.62,
          spacingX: 0,
          spacingY: 0,
          marginX: 0,
          marginY: 0
        }
      },
      left: {
        idle: {
          file: "Assassin/Left - Idle.png",
          columns: null,
          rows: null,
          frameWidth: 480,
          frameHeight: 480,
          frameCount: null,
          anchorX: 0.5,
          anchorY: 0.62
        },
        walk: {
          file: "Assassin/Left - Walking.png",
          columns: 4,
          rows: 5,
          frameWidth: 480,
          frameHeight: 480,
          frameCount: 20,
          anchorX: 0.5,
          anchorY: 0.62,
          spacingX: 0,
          spacingY: 0,
          marginX: 0,
          marginY: 0
        }
      },
      right: {
        idle: {
          file: "Assassin/Right - Idle.png",
          columns: null,
          rows: null,
          frameWidth: 480,
          frameHeight: 480,
          frameCount: null,
          anchorX: 0.5,
          anchorY: 0.62
        },
        walk: {
          file: "Assassin/Right - Walking.png",
          columns: 4,
          rows: 5,
          frameWidth: 480,
          frameHeight: 480,
          frameCount: 20,
          anchorX: 0.5,
          anchorY: 0.62,
          spacingX: 0,
          spacingY: 0,
          marginX: 0,
          marginY: 0
        }
      }
    }
  },

  sheetOverrides: {
    assassin: {
      front: {
        walk: {
          columns: 4,
          rows: 6,
          frameWidth: 480,
          frameHeight: 400,
          frameCount: 24
        }
      }
    }
  },

  overrides: {
    assassin: {
      back: {
        attack: { frameCount: 9 }
      },
      front: {
        attack: { frameCount: 9 }
      },
      left: {
        attack: { frameCount: 9 }
      },
      right: {
        attack: { frameCount: 9 }
      }
    }
  }
};
