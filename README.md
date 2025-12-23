# Idle Slasher Arena (Base)

A minimal, framework-free HTML5 canvas game. Open `index.html` and play.

## How to Run

- Option 1: Double-click `index.html` in a browser.
- Option 2: Serve the folder locally (recommended for audio):
  - `python -m http.server` then open `http://localhost:8000`.

## How to Replace Assets

All asset paths live in `src/assets.js` under `ASSET_MANIFEST`.

1. Drop your files into the `assets/` folders:
   - `assets/images/hero.png`
   - `assets/images/enemy.png`
   - `assets/images/weapon.png`
   - `assets/images/background.png`
   - `assets/audio/bgm.mp3`
   - `assets/audio/hit.wav`
   - `assets/audio/damage.wav`
   - `assets/audio/gameover.wav`
2. Update `ASSET_MANIFEST` to point to your new files if the names differ.
3. Adjust sprite sizing in `CONFIG.SPRITES` inside `src/game.js`.
4. If your sprites have different anchor points, update drawing logic in `src/entities.js`.

If any file is missing, the game falls back to simple shapes and silent audio so it still runs.

## Spritesheets

Sprite sheets live under `assets/sprites/` and are described in `assets/sprites/manifest.js`.

- Base path: `SPRITES.basePath`
- Frame layout: 5 columns x 2 rows
- Frame size: 480x480
- Frame count: 10

### Add a new character

1. Create a new folder in `assets/sprites/`, e.g. `assets/sprites/Knight/`.
2. Drop your sheets into that folder (one file per direction + action).
3. Add a new entry under `SPRITES.characters` in `assets/sprites/manifest.js`.
4. The renderer uses `SPRITES.basePath + filename` to load sheets.

To switch the test character, change the key passed to `CharacterRenderer` in `src/game.js`.

## Controls

- Move: WASD or Arrow Keys
- Boost: Shift (short burst with cooldown)
- Pause: P
- Start: Space (or click Start)

## Tuning

- Core gameplay numbers live in `CONFIG` in `src/game.js`.
- To lock the hero in place (no movement), set `CONFIG.HERO_LOCK_CENTER = true`.
- Difficulty presets are in `DIFFICULTY_PRESETS` in `src/game.js`.
