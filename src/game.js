import { AssetManager, ASSET_MANIFEST, SoundManager } from "./assets.js";
import { Hero, Enemy, Weapon, Particle, PowerUp } from "./entities.js";
import { InputManager } from "./input.js";
import { circleCollision } from "./collisions.js";
import { CharacterRenderer } from "./characterRenderer.js";
import { SPRITES } from "../assets/sprites/manifest.js";

export const CONFIG = {
  HERO_LOCK_CENTER: false,
  HERO_SPEED: 220,
  HERO_BOOST_MULT: 1.65,
  HERO_BOOST_DURATION: 0.35,
  HERO_BOOST_COOLDOWN: 1.8,
  HERO_RADIUS: 18,
  HERO_HEALTH: 100,
  HERO_SPRITE_SCALE: 0.18,

  WEAPON_ORBIT_RADIUS: 60,
  WEAPON_ANGULAR_SPEED: 4.4,
  WEAPON_RADIUS: 20,
  WEAPON_COLLISION_ANGLE_STEP: 0.12,

  ENEMY_RADIUS: 16,
  ENEMY_SPEED_BASE: 90,
  ENEMY_SPEED_RAMP: 1.6,
  ENEMY_HIT_COOLDOWN: 0,

  SPAWN_INTERVAL_BASE: 0.4,
  SPAWN_INTERVAL_MIN: 0.12,
  SPAWN_INTERVAL_DECAY_PER_SCORE: 0.006,

  DAMAGE_PER_HIT: 12,

  CLEANUP_DISTANCE: 1400,
  PARTICLE_COUNT: 8,
  PARTICLE_LIFE: 0.5,
  HIT_PARTICLE_LIFE: 0.18,

  POWERUP_RADIUS: 16,
  POWERUP_DURATION: 7,
  POWERUP_SPAWN_INTERVAL_BASE: 7.5,
  POWERUP_SPAWN_INTERVAL_MIN: 3.5,
  POWERUP_SPAWN_INTERVAL_DECAY: 0.01,
  POWERUP_HEAL_AMOUNT: 25,
  ARMOR_DURATION: 5,
  FLOAT_TEXT_DURATION: 1.2,
  LEVEL_SCORE_STEP: 12,
  LEVEL_SPEED_SCALE: 0.05,
  LEVEL_SPAWN_SCALE: 0.03,
  BOSS_SCORE_STEP: 30,
  BOSS_HEALTH: 18,
  BOSS_HEALTH_SCALE: 1.6,
  BOSS_RADIUS: 44,
  BOSS_SPEED_MULT: 0.7,
  BOSS_HIT_COOLDOWN: 0,
  BOSS_LEVEL_INTERVAL: 5,
  BOSS_WEAPON_BONUS_LEVEL: 20,
  WEAPON_DAMAGE_BASE: 0.2,
  WEAPON_DAMAGE_BONUS: 0.2,
  BOSS_KNOCKBACK: 520,
  KNOCKBACK_DECAY: 7,
  MOBILE_ZOOM: 0.55,
  MOBILE_MAX_WIDTH: 900,

  COLORS: {
    HERO: "#64e4ff",
    ENEMY: "#ff6b6b",
    WEAPON: "#ffd36f",
    PARTICLE: "#ffe7a3",
    HIT_PARTICLE: "#fff3c1"
  },

  BOMB_TYPES: {
    POWERUP: {
      key: "POWERUP",
      awardsPoints: true,
      particleColor: "#ffd36f",
      particleCount: 80,
      waveSpeed: 1200,
      flashRgb: "255, 210, 120",
      waveRgb: "255, 220, 150"
    },
    BOSS: {
      key: "BOSS",
      awardsPoints: false,
      particleColor: "#c38bff",
      particleCount: 50,
      waveSpeed: 1000,
      flashRgb: "200, 140, 255",
      waveRgb: "215, 185, 255"
    }
  },

  SPRITES: {
    HERO_SCALE: 0.7,
    ENEMY_SCALE: 0.7,
    WEAPON_SCALE: 0.7
  }
};

const DIFFICULTY_PRESETS = {
  easy: { spawn: 1.4, speed: 0.9 },
  normal: { spawn: 1.0, speed: 1.0 },
  hard: { spawn: 0.8, speed: 1.15 }
};

const ENEMY_TYPES = [
  { key: "SCOUT", shape: "circle", color: "#ff6b6b", health: 1, weight: 70, points: 1 },
  { key: "GUARD", shape: "diamond", color: "#7be7ff", health: 2, weight: 20, points: 2 },
  { key: "BRUTE", shape: "square", color: "#ffb347", health: 3, weight: 10, points: 3 }
];

const BOSS_TYPE = {
  key: "BOSS",
  shape: "hex",
  color: "#c38bff",
  health: CONFIG.BOSS_HEALTH,
  radius: CONFIG.BOSS_RADIUS,
  hitCooldown: CONFIG.BOSS_HIT_COOLDOWN,
  points: 10
};

function collectSpriteUrls() {
  const urls = new Set();
  const characters = SPRITES.characters || {};
  Object.values(characters).forEach((dirSet) => {
    Object.values(dirSet).forEach((actionSet) => {
      Object.values(actionSet).forEach((file) => {
        if (file) {
          urls.add(SPRITES.basePath + file);
        }
      });
    });
  });
  return Array.from(urls);
}

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.assets = new AssetManager(ASSET_MANIFEST);
    this.sound = new SoundManager(this.assets);
    this.input = new InputManager(window);

    this.state = "loading";
    this.hero = new Hero(0, 0, CONFIG);
    this.weapon = new Weapon(this.hero, CONFIG);
    this.weaponPrevAngle = this.weapon.angle;
    this.characterRenderer = new CharacterRenderer(this.assets, "assassin");
    this.characterRenderer.setScale(CONFIG.HERO_SPRITE_SCALE);
    this.enemies = [];
    this.particles = [];
    this.powerUps = [];
    this.floatTexts = [];
    this.guideTarget = null;
    this.guideAwaiting = false;
    this.guideActive = false;
    this.guideStacks = 0;
    this.armorTimer = 0;
    this.guideTargets = [];
    this.nearestPowerUp = null;
    this.carryPowerupKey = null;
    this.carryPowerupLevels = { SWING: 0, SPEED: 0, MULTI: 0, GUIDE: 0 };
    this.lastRunLevels = null;
    this.fullscreenEnabled = false;
    this.bossGateLevel = CONFIG.BOSS_LEVEL_INTERVAL;
    this.bossActiveLevel = null;
    this.weaponDamage = CONFIG.WEAPON_DAMAGE_BASE;
    this.weaponDamageBonusApplied = false;
    this.heroKnockback = { x: 0, y: 0 };
    this.pendingBomb = false;
    this.lastWeaponBonusLevel = 0;
    this.bombFlash = 0;
    this.bombWave = 0;
    this.bombOrigin = { x: 0, y: 0 };
    this.bombProfile = CONFIG.BOMB_TYPES.POWERUP;

    this.score = 0;
    this.elapsed = 0;
    this.level = 1;
    this.nextLevelScore = CONFIG.LEVEL_SCORE_STEP;
    this.nextBossScore = CONFIG.BOSS_SCORE_STEP;
    this.bossActive = null;
    this.spawnTimer = 0;
    this.powerupTimer = 0;
    this.accumulator = 0;
    this.fixedStep = 1 / 60;
    this.lastTime = 0;

    this.fps = 0;
    this.fpsTimer = 0;
    this.frames = 0;

    this.boostTimer = 0;
    this.boostCooldown = 0;

    this.swingBoostLevel = 0;
    this.speedBoostLevel = 0;
    this.extraWeaponLevel = 0;
    this.guideUses = 0;
    this.guideActive = false;
    this.heroMoving = false;
    this.heroDir = "front";
    this.guideStacks = 0;
    this.armorTimer = 0;
    this.guideTargets = [];
    this.bossGateLevel = CONFIG.BOSS_LEVEL_INTERVAL;
    this.bossActiveLevel = null;
    this.weaponDamage = CONFIG.WEAPON_DAMAGE_BASE;
    this.weaponDamageBonusApplied = false;
    this.heroKnockback = { x: 0, y: 0 };
    this.pendingBomb = false;
    this.lastWeaponBonusLevel = 0;
    this.bombFlash = 0;
    this.bombWave = 0;
    this.bombOrigin = { x: 0, y: 0 };
    this.bombProfile = CONFIG.BOMB_TYPES.POWERUP;

    this.difficulty = "normal";
    this.showFps = false;
    this.isMobile = false;

    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
  }

  async init() {
    this.ui.showLoading();
    await this.assets.loadAll({
      images: ASSET_MANIFEST.images,
      audio: ASSET_MANIFEST.audio,
      spriteUrls: collectSpriteUrls()
    });
    this.logSpritePreloadStatus();
    this.resize();
    this.ui.showMenu();
    this.state = "menu";
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const isMobile = window.matchMedia("(pointer: coarse)").matches
      || window.innerWidth <= CONFIG.MOBILE_MAX_WIDTH;
    const isPortrait = window.innerHeight > window.innerWidth;
    if (this.isMobile !== isMobile) {
      this.isMobile = isMobile;
      if (this.ui?.setMobileMode) {
        this.ui.setMobileMode(isMobile);
      }
    }
    if (this.ui?.setPortraitMode) {
      this.ui.setPortraitMode(isMobile && isPortrait);
    }
    if (isMobile) {
      this.lockOrientation();
    }
    const scale = isMobile ? CONFIG.MOBILE_ZOOM : 1;
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    this.viewWidth = window.innerWidth / scale;
    this.viewHeight = window.innerHeight / scale;
  }

  setDifficulty(level) {
    this.difficulty = level in DIFFICULTY_PRESETS ? level : "normal";
  }

  setSoundEnabled(enabled) {
    this.sound.setEnabled(enabled);
  }

  setShowFps(enabled) {
    this.showFps = enabled;
  }

  setFullscreenEnabled(enabled) {
    this.fullscreenEnabled = enabled;
    if (enabled) {
      this.requestFullscreen();
    } else {
      this.exitFullscreen();
    }
  }

  requestFullscreen() {
    const target = document.documentElement;
    if (document.fullscreenElement || !target?.requestFullscreen) return;
    target.requestFullscreen().catch(() => {});
  }

  exitFullscreen() {
    if (!document.fullscreenElement || !document.exitFullscreen) return;
    document.exitFullscreen().catch(() => {});
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      this.exitFullscreen();
    } else {
      this.requestFullscreen();
    }
  }

  lockOrientation() {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
  }

  startGame() {
    this.sound.unlock();
    this.lockOrientation();
    this.reset();
    this.applyCarryPowerup();
    this.state = "playing";
    this.ui.hideAll();
    this.ui.showHud();
  }

  reset() {
    this.hero.reset(0, 0);
    this.weapon = new Weapon(this.hero, CONFIG);
    this.weaponPrevAngle = this.weapon.angle;
    this.enemies.length = 0;
    this.particles.length = 0;
    this.powerUps.length = 0;
    this.floatTexts.length = 0;
    this.guideTarget = null;
    this.guideAwaiting = false;
    this.guideActive = false;
    this.guideStacks = 0;
    this.armorTimer = 0;
    this.guideTargets = [];
    this.nearestPowerUp = null;
    this.score = 0;
    this.elapsed = 0;
    this.level = 1;
    this.nextLevelScore = CONFIG.LEVEL_SCORE_STEP;
    this.nextBossScore = CONFIG.BOSS_SCORE_STEP;
    this.bossActive = null;
    this.spawnTimer = 0;
    this.powerupTimer = 0;
    this.boostTimer = 0;
    this.boostCooldown = 0;
    this.swingBoostLevel = 0;
    this.speedBoostLevel = 0;
    this.extraWeaponLevel = 0;
    this.guideUses = 0;
    this.guideActive = false;
    this.heroMoving = false;
    this.heroDir = "front";
    this.guideStacks = 0;
    this.armorTimer = 0;
    this.guideTargets = [];
  }

  pauseToggle() {
    if (this.state === "playing") {
      this.state = "paused";
      this.ui.showPause();
    } else if (this.state === "paused") {
      this.state = "playing";
      this.ui.hidePause();
    }
  }

  gameOver() {
    this.state = "gameover";
    this.sound.playSfx("GAME_OVER", 0.9);
    this.lastRunLevels = {
      SWING: this.swingBoostLevel,
      SPEED: this.speedBoostLevel,
      MULTI: this.extraWeaponLevel,
      GUIDE: this.guideStacks
    };
    this.carryPowerupKey = null;
    this.ui.hideHud();
    this.ui.showGameOver(this.score, this.elapsed, this.level);
  }

  loop(timestamp) {
    const delta = Math.min((timestamp - this.lastTime) / 1000, 0.25);
    this.lastTime = timestamp;
    this.accumulator += delta;

    this.handleInput();

    while (this.accumulator >= this.fixedStep) {
      this.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }

    this.render();
    this.updateFps(delta);
    requestAnimationFrame((t) => this.loop(t));
  }

  handleInput() {
    if (this.input.wasPressed("p")) {
      if (this.state === "playing" || this.state === "paused") {
        this.pauseToggle();
      }
    }

    if (this.input.wasPressed("f")) {
      this.toggleFullscreen();
    }

    if (this.state === "menu" && this.input.wasPressed(" ")) {
      this.startGame();
    }

    if (this.state === "gameover" && this.input.wasPressed(" ")) {
      this.startGame();
    }

    this.input.consumePresses();
  }

  update(dt) {
    if (this.state !== "playing") {
      return;
    }

    this.elapsed += dt;

    this.updateHero(dt);
    this.updateWeapon(dt);
    this.characterRenderer.update(dt);
    this.characterRenderer.setState(this.heroDir, this.heroMoving ? "walk" : "idle");

    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer += this.getSpawnInterval();
    }

    this.powerupTimer -= dt;
    while (this.powerupTimer <= 0) {
      this.spawnPowerUp();
      this.powerupTimer += this.getPowerupInterval();
    }

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (this.bombWave > 0 && enemy.type.key !== "BOSS") {
        const bx = this.bombOrigin.x;
        const by = this.bombOrigin.y;
        const dist = Math.hypot(enemy.x - bx, enemy.y - by);
        if (dist <= this.bombWave) {
          if (!this.bossActive && this.bombProfile.awardsPoints) {
            this.score += enemy.type.points ?? 1;
          }
          this.spawnDeathParticles(enemy.x, enemy.y);
          this.enemies[i] = this.enemies[this.enemies.length - 1];
          this.enemies.pop();
          continue;
        }
      }
      enemy.update(dt, this.hero);

      const heroHit = circleCollision(enemy.x, enemy.y, enemy.radius, this.hero.x, this.hero.y, this.hero.radius);
      if (heroHit && enemy.type.key === "BOSS") {
        this.applyBossCollision(enemy);
        if (this.hero.health <= 0) {
          this.hero.health = 0;
          this.gameOver();
          break;
        }
      }
      if (heroHit && enemy.type.key !== "BOSS") {
        if (this.armorTimer <= 0) {
          this.sound.playSfx("DAMAGE", 0.7);
          this.hero.health -= CONFIG.DAMAGE_PER_HIT;
        }
        this.enemies[i] = this.enemies[this.enemies.length - 1];
        this.enemies.pop();
        if (this.hero.health <= 0) {
          this.hero.health = 0;
          this.gameOver();
          break;
        }
        continue;
      }

      if (this.checkWeaponCollision(enemy)) {
        if (enemy.hitCooldown > 0) {
          continue;
        }
        enemy.hitCooldown = enemy.hitCooldownDuration;
        this.spawnHitParticle(enemy.x, enemy.y);
        this.sound.playSfx("HIT", 0.6);
        enemy.health -= this.weaponDamage;
        if (enemy.health <= 0) {
          this.spawnDeathParticles(enemy.x, enemy.y);
          if (!this.bossActive || enemy.type.key === "BOSS") {
            this.score += enemy.type.points ?? 1;
          }
          if (enemy.type.key === "BOSS") {
            const defeatedLevel = this.bossActiveLevel ?? this.bossGateLevel;
            this.onBossDefeated(defeatedLevel, { x: enemy.x, y: enemy.y });
          }
          this.enemies[i] = this.enemies[this.enemies.length - 1];
          this.enemies.pop();
        }
        continue;
      }

      const dist = Math.hypot(enemy.x - this.hero.x, enemy.y - this.hero.y);
      if (dist > this.getCleanupDistance() && enemy.type.key !== "BOSS") {
        this.enemies[i] = this.enemies[this.enemies.length - 1];
        this.enemies.pop();
      }
    }

    if (this.pendingBomb) {
      this.applyBombEffect();
      this.pendingBomb = false;
    }

    if (this.bombFlash > 0) {
      this.bombFlash = Math.max(0, this.bombFlash - dt);
    }
    if (this.bombWave > 0) {
      this.bombWave += this.bombProfile.waveSpeed * dt;
      if (this.bombWave > Math.max(this.viewWidth, this.viewHeight) * 0.9) {
        this.bombWave = 0;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.update(dt);
      if (particle.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }

    for (let i = this.powerUps.length - 1; i >= 0; i -= 1) {
      const powerUp = this.powerUps[i];
      powerUp.update(dt);
      const heroHit = circleCollision(powerUp.x, powerUp.y, powerUp.radius, this.hero.x, this.hero.y, this.hero.radius);
      const weaponHit = this.checkPowerupWeaponCollision(powerUp);
      if (heroHit || weaponHit) {
        if (!this.bossActive) {
          this.score += powerUp.type.points ?? 1;
        }
        this.applyPowerUp(powerUp.type.key);
        if (this.guideTarget === powerUp) {
          this.guideTarget = null;
        }
        this.powerUps[i] = this.powerUps[this.powerUps.length - 1];
        this.powerUps.pop();
      }
    }

    this.updatePowerupTargets();
    this.updatePowerupTimers(dt);
    this.updateFloatTexts(dt);
    this.updateArmorTimer(dt);
    this.updateLevelProgress();
    const bossInfo = this.bossActive
      ? { current: this.bossActive.health, max: this.bossActive.maxHealth }
      : null;
    this.ui.updateHud(
      this.score,
      this.elapsed,
      this.level,
      this.hero.health,
      this.hero.maxHealth,
      this.showFps,
      this.fps,
      bossInfo,
      this.weaponDamage
    );
  }

  updateHero(dt) {
    if (CONFIG.HERO_LOCK_CENTER) {
      this.heroMoving = false;
      return;
    }
    const move = this.input.getMoveVector();
    this.heroMoving = move.x !== 0 || move.y !== 0;
    if (this.heroMoving) {
      if (Math.abs(move.x) > Math.abs(move.y)) {
        this.heroDir = move.x > 0 ? "right" : "left";
      } else {
        this.heroDir = move.y > 0 ? "front" : "back";
      }
    }
    const length = Math.hypot(move.x, move.y) || 1;
    let speed = this.hero.speed;
    if (this.speedBoostLevel > 0) {
      speed *= 1 + this.speedBoostLevel * 0.25;
    }

    if (this.boostCooldown > 0) {
      this.boostCooldown -= dt;
    }

    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      speed *= CONFIG.HERO_BOOST_MULT;
    } else if ((this.input.isDown("shift") || this.input.isSprintActive()) && this.boostCooldown <= 0) {
      this.boostTimer = CONFIG.HERO_BOOST_DURATION;
      this.boostCooldown = CONFIG.HERO_BOOST_COOLDOWN;
      speed *= CONFIG.HERO_BOOST_MULT;
    }

    if (move.x !== 0 || move.y !== 0) {
      this.hero.x += (move.x / length) * speed * dt;
      this.hero.y += (move.y / length) * speed * dt;
    }

    const speedFactor = speed / this.hero.speed;
    this.characterRenderer.setSpeedFactor(speedFactor);

    if (this.heroKnockback.x !== 0 || this.heroKnockback.y !== 0) {
      this.hero.x += this.heroKnockback.x * dt;
      this.hero.y += this.heroKnockback.y * dt;
      const decay = Math.exp(-CONFIG.KNOCKBACK_DECAY * dt);
      this.heroKnockback.x *= decay;
      this.heroKnockback.y *= decay;
      if (Math.abs(this.heroKnockback.x) < 1) this.heroKnockback.x = 0;
      if (Math.abs(this.heroKnockback.y) < 1) this.heroKnockback.y = 0;
    }
  }

  updateWeapon(dt) {
    if (this.weaponPrevAngle === undefined || Number.isNaN(this.weaponPrevAngle)) {
      this.weaponPrevAngle = this.weapon.angle;
    }
    const prevAngle = this.weapon.angle;
    const originalSpeed = this.weapon.angularSpeed;
    if (this.swingBoostLevel > 0) {
      this.weapon.angularSpeed = originalSpeed * (1 + this.swingBoostLevel * 0.3);
    }
    this.weapon.update(dt);
    this.weapon.angularSpeed = originalSpeed;
    this.weaponPrevAngle = prevAngle;
  }

  getCleanupDistance() {
    const viewW = this.viewWidth || window.innerWidth;
    const viewH = this.viewHeight || window.innerHeight;
    const base = Math.hypot(viewW, viewH) / 2 + 360;
    return Math.max(CONFIG.CLEANUP_DISTANCE, base);
  }

  getSpawnRadius(margin) {
    const viewW = this.viewWidth || window.innerWidth;
    const viewH = this.viewHeight || window.innerHeight;
    const base = Math.hypot(viewW, viewH) / 2 + margin;
    return Math.min(base, this.getCleanupDistance() - 80);
  }

  spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const screenRadius = this.getSpawnRadius(120);
    const spawnX = this.hero.x + Math.cos(angle) * screenRadius;
    const spawnY = this.hero.y + Math.sin(angle) * screenRadius;
    const speedScale = 1 + (this.level - 1) * CONFIG.LEVEL_SPEED_SCALE;
    const speed = CONFIG.ENEMY_SPEED_BASE * this.getDifficultyScale("speed") * speedScale + this.elapsed * CONFIG.ENEMY_SPEED_RAMP;
    const type = this.rollEnemyType();
    this.enemies.push(new Enemy(spawnX, spawnY, speed, CONFIG, type));
  }

  getSpawnInterval() {
    const levelScale = Math.max(0.4, 1 - (this.level - 1) * CONFIG.LEVEL_SPAWN_SCALE);
    const base = CONFIG.SPAWN_INTERVAL_BASE * this.getDifficultyScale("spawn") * levelScale;
    const scoreDecay = this.score * CONFIG.SPAWN_INTERVAL_DECAY_PER_SCORE;
    return Math.max(CONFIG.SPAWN_INTERVAL_MIN, base - scoreDecay);
  }

  getDifficultyScale(key) {
    return DIFFICULTY_PRESETS[this.difficulty]?.[key] ?? 1;
  }

  rollEnemyType() {
    const total = ENEMY_TYPES.reduce((sum, type) => sum + type.weight, 0);
    let roll = Math.random() * total;
    for (const type of ENEMY_TYPES) {
      roll -= type.weight;
      if (roll <= 0) return type;
    }
    return ENEMY_TYPES[0];
  }

  spawnBoss() {
    if (this.bossActive) return;
    const angle = Math.random() * Math.PI * 2;
    const screenRadius = this.getSpawnRadius(220);
    const spawnX = this.hero.x + Math.cos(angle) * screenRadius;
    const spawnY = this.hero.y + Math.sin(angle) * screenRadius;
    const speed = CONFIG.ENEMY_SPEED_BASE * CONFIG.BOSS_SPEED_MULT;
    const bossIndex = Math.max(1, Math.ceil(this.bossGateLevel / CONFIG.BOSS_LEVEL_INTERVAL));
    const scaledHealth = Math.round(CONFIG.BOSS_HEALTH * Math.pow(CONFIG.BOSS_HEALTH_SCALE, bossIndex - 1));
    const bossType = {
      ...BOSS_TYPE,
      health: scaledHealth,
      radius: CONFIG.BOSS_RADIUS,
      hitCooldown: CONFIG.BOSS_HIT_COOLDOWN,
      points: BOSS_TYPE.points
    };
    const boss = new Enemy(spawnX, spawnY, speed, CONFIG, bossType);
    this.bossActive = boss;
    this.bossActiveLevel = this.bossGateLevel;
    this.enemies.push(boss);
    this.spawnFloatText("Boss Approaches");
  }

  getPowerupInterval() {
    return Math.max(
      CONFIG.POWERUP_SPAWN_INTERVAL_MIN,
      CONFIG.POWERUP_SPAWN_INTERVAL_BASE - this.elapsed * CONFIG.POWERUP_SPAWN_INTERVAL_DECAY
    );
  }

  spawnPowerUp() {
    const types = this.getPowerupTypes();
    const type = types[Math.floor(Math.random() * types.length)];
    const angle = Math.random() * Math.PI * 2;
    const viewW = this.viewWidth || window.innerWidth;
    const viewH = this.viewHeight || window.innerHeight;
    const screenRadius = Math.hypot(viewW, viewH) / 2 - 80;
    const x = this.hero.x + Math.cos(angle) * screenRadius;
    const y = this.hero.y + Math.sin(angle) * screenRadius;
    const powerUp = new PowerUp(x, y, type, CONFIG);
    this.powerUps.push(powerUp);
    if (this.powerUps.length > 8) {
      this.powerUps.shift();
    }
  }

  getPowerupTypes() {
    return [
      { key: "SWING", shape: "diamond", hueRange: [20, 70], cycleSpeed: 80, size: 14, name: "Swing +", points: 10 },
      { key: "SPEED", shape: "triangle", hueRange: [160, 210], cycleSpeed: 90, size: 14, name: "Speed +", points: 10 },
      { key: "MULTI", shape: "square", hueRange: [260, 320], cycleSpeed: 70, size: 13, name: "Extra Blade", points: 10 },
      { key: "HEAL", shape: "circle", hueRange: [90, 140], cycleSpeed: 85, size: 14, name: "Heal", points: 10 },
      { key: "BOMB", shape: "diamond", hueRange: [0, 20], cycleSpeed: 120, size: 15, name: "Bomb", points: 10 },
      { key: "GUIDE", shape: "triangle", hueRange: [320, 360], cycleSpeed: 95, size: 13, name: "Finder", points: 10 },
      { key: "ARMOR", shape: "diamond", hueRange: [200, 260], cycleSpeed: 80, size: 13, name: "Armor", points: 10 }
    ];
  }

  applyPowerUp(key) {
    const type = this.getPowerupTypes().find((item) => item.key === key);
    if (type) {
      this.spawnFloatText(type.name);
    }
    switch (key) {
      case "SWING":
        this.swingBoostLevel += 1;
        break;
      case "SPEED":
        this.speedBoostLevel += 1;
        break;
      case "MULTI":
        this.extraWeaponLevel += 1;
        break;
      case "HEAL":
        this.hero.health = Math.min(this.hero.maxHealth, this.hero.health + CONFIG.POWERUP_HEAL_AMOUNT);
        break;
      case "BOMB": {
        this.triggerBomb("POWERUP");
        break;
      }
      case "GUIDE":
        this.guideUses += 1;
        this.guideStacks = Math.min(3, this.guideStacks + 1);
        this.guideActive = this.guideStacks > 0;
        this.guideAwaiting = true;
        break;
      case "ARMOR":
        this.armorTimer = Math.max(this.armorTimer, CONFIG.ARMOR_DURATION);
        break;
      default:
        break;
    }
  }

  onBossDefeated(defeatedLevel, origin) {
    this.bossActive = null;
    this.bossActiveLevel = null;
    if (defeatedLevel >= this.bossGateLevel) {
      this.bossGateLevel += CONFIG.BOSS_LEVEL_INTERVAL;
    }
    if (defeatedLevel >= CONFIG.BOSS_WEAPON_BONUS_LEVEL) {
      const bonusLevel = Math.floor(defeatedLevel / CONFIG.BOSS_WEAPON_BONUS_LEVEL) * CONFIG.BOSS_WEAPON_BONUS_LEVEL;
      if (bonusLevel > this.lastWeaponBonusLevel) {
        this.weaponDamage += CONFIG.WEAPON_DAMAGE_BONUS;
        this.lastWeaponBonusLevel = bonusLevel;
        this.spawnFloatText("WEAPON UPGRADE");
        this.ui.showWeaponUpgrade();
      }
    }
    this.spawnFloatText("Boss Down");
    this.triggerBomb("BOSS", origin);
  }

  triggerBomb(typeKey = "POWERUP", origin = null) {
    this.pendingBomb = { typeKey, origin };
  }

  applyBombEffect() {
    const pending = this.pendingBomb;
    if (!pending) return;
    const profile = CONFIG.BOMB_TYPES[pending.typeKey] ?? CONFIG.BOMB_TYPES.POWERUP;
    this.spawnFloatText("Bomb!");
    this.sound.playSfx("BOMB", 0.85);
    this.bombFlash = 0.25;
    this.bombWave = 20;
    this.bombOrigin = pending.origin ?? { x: this.hero.x, y: this.hero.y };
    this.bombProfile = profile;
    this.spawnBombParticles(profile);
  }

  spawnBombParticles(profile) {
    const count = profile.particleCount;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 240 + Math.random() * 360;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 2 + Math.random() * 3;
      this.particles.push(new Particle(this.bombOrigin.x, this.bombOrigin.y, vx, vy, 0.7, size, profile.particleColor));
      if (this.particles.length > 240) {
        this.particles.shift();
      }
    }
  }

  updatePowerupTimers(_) {}

  getWeaponPositions(angleOverride = this.weapon.angle) {
    const positions = [];
    const total = 1 + this.extraWeaponLevel;
    const innerMax = 5;
    const outerMax = 8;
    const innerCount = Math.min(total, innerMax);
    const outerCount = Math.min(Math.max(0, total - innerMax), outerMax);
    const innerRadius = this.weapon.orbitRadius;
    const outerRadius = this.weapon.orbitRadius + 45;

    for (let i = 0; i < innerCount; i += 1) {
      const offset = (Math.PI * 2 * i) / innerCount;
      const angle = angleOverride + offset;
      const x = this.hero.x + Math.cos(angle) * innerRadius;
      const y = this.hero.y + Math.sin(angle) * innerRadius;
      positions.push({ x, y, angle });
    }

    if (outerCount > 0) {
      for (let i = 0; i < outerCount; i += 1) {
        const offset = (Math.PI * 2 * i) / outerCount;
        const angle = angleOverride * 1.5 + offset + Math.PI / outerCount;
        const x = this.hero.x + Math.cos(angle) * outerRadius;
        const y = this.hero.y + Math.sin(angle) * outerRadius;
        positions.push({ x, y, angle });
      }
    }
    return positions;
  }

  checkWeaponCollision(enemy) {
    return this.checkWeaponCollisionAt(enemy.x, enemy.y, enemy.radius);
  }

  checkPowerupWeaponCollision(powerUp) {
    return this.checkWeaponCollisionAt(powerUp.x, powerUp.y, powerUp.radius);
  }

  checkWeaponCollisionAt(targetX, targetY, targetRadius) {
    const delta = this.weapon.angle - this.weaponPrevAngle;
    const step = CONFIG.WEAPON_COLLISION_ANGLE_STEP;
    const steps = Math.max(1, Math.ceil(Math.abs(delta) / step));
    for (let i = 0; i <= steps; i += 1) {
      const t = steps === 0 ? 1 : i / steps;
      const angle = this.weaponPrevAngle + delta * t;
      const positions = this.getWeaponPositions(angle);
      for (const pos of positions) {
        if (circleCollision(targetX, targetY, targetRadius, pos.x, pos.y, this.weapon.radius)) {
          return true;
        }
      }
    }
    return false;
  }

  updatePowerupTargets() {
    this.nearestPowerUp = this.findNearestPowerUp();
    if (!this.guideActive) {
      this.guideTargets = [];
      this.guideTarget = null;
      return;
    }
    this.guideTargets = this.findNearestPowerUps(this.guideStacks);
    this.guideTarget = this.guideTargets[0] || null;
    this.guideAwaiting = this.guideTargets.length === 0;
  }

  findNearestPowerUp() {
    if (this.powerUps.length === 0) return null;
    let nearest = this.powerUps[0];
    let bestDist = Math.hypot(nearest.x - this.hero.x, nearest.y - this.hero.y);
    for (let i = 1; i < this.powerUps.length; i += 1) {
      const p = this.powerUps[i];
      const d = Math.hypot(p.x - this.hero.x, p.y - this.hero.y);
      if (d < bestDist) {
        bestDist = d;
        nearest = p;
      }
    }
    return nearest;
  }

  findNearestPowerUps(count) {
    if (this.powerUps.length === 0 || count <= 0) return [];
    const sorted = [...this.powerUps].sort((a, b) => {
      const da = Math.hypot(a.x - this.hero.x, a.y - this.hero.y);
      const db = Math.hypot(b.x - this.hero.x, b.y - this.hero.y);
      return da - db;
    });
    return sorted.slice(0, Math.min(count, sorted.length));
  }

  updateArmorTimer(dt) {
    if (this.armorTimer > 0) {
      this.armorTimer = Math.max(0, this.armorTimer - dt);
    }
  }

  setCarryPowerup(key) {
    this.carryPowerupKey = key;
  }

  applyCarryPowerup() {
    if (this.carryPowerupKey && this.lastRunLevels) {
      const gained = this.lastRunLevels[this.carryPowerupKey] ?? 0;
      const current = this.carryPowerupLevels[this.carryPowerupKey] ?? 0;
      if (gained > current) {
        this.carryPowerupLevels[this.carryPowerupKey] = gained;
      }
    }
    this.carryPowerupKey = null;
    this.lastRunLevels = null;

    this.swingBoostLevel = this.carryPowerupLevels.SWING ?? 0;
    this.speedBoostLevel = this.carryPowerupLevels.SPEED ?? 0;
    this.extraWeaponLevel = this.carryPowerupLevels.MULTI ?? 0;
    this.guideStacks = Math.min(3, this.carryPowerupLevels.GUIDE ?? 0);
    this.guideActive = this.guideStacks > 0;
    this.guideAwaiting = this.guideStacks > 0;
    if (this.level >= CONFIG.BOSS_WEAPON_BONUS_LEVEL) {
      const bonusLevel = Math.floor(this.level / CONFIG.BOSS_WEAPON_BONUS_LEVEL) * CONFIG.BOSS_WEAPON_BONUS_LEVEL;
      if (bonusLevel > this.lastWeaponBonusLevel) {
        this.weaponDamage += CONFIG.WEAPON_DAMAGE_BONUS;
        this.lastWeaponBonusLevel = bonusLevel;
        this.spawnFloatText("WEAPON UPGRADE");
        this.ui.showWeaponUpgrade();
      }
    }
  }

  applyBossCollision(boss) {
    const dx = this.hero.x - boss.x;
    const dy = this.hero.y - boss.y;
    const dist = Math.hypot(dx, dy) || 1;
    const push = CONFIG.BOSS_KNOCKBACK;
    this.heroKnockback.x = (dx / dist) * push;
    this.heroKnockback.y = (dy / dist) * push;
    if (this.armorTimer <= 0) {
      this.sound.playSfx("DAMAGE", 0.7);
      this.hero.health -= CONFIG.DAMAGE_PER_HIT;
    }
  }

  spawnHitParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 160 + Math.random() * 60;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = 1.6 + Math.random() * 1.4;
    this.particles.push(new Particle(x, y, vx, vy, CONFIG.HIT_PARTICLE_LIFE, size, CONFIG.COLORS.HIT_PARTICLE));
    if (this.particles.length > 200) {
      this.particles.shift();
    }
  }

  spawnDeathParticles(x, y) {
    const count = Math.max(2, Math.floor(CONFIG.PARTICLE_COUNT / 2));
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 80;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 2 + Math.random() * 2;
      this.particles.push(new Particle(x, y, vx, vy, CONFIG.PARTICLE_LIFE, size, CONFIG.COLORS.PARTICLE));
      if (this.particles.length > 200) {
        this.particles.shift();
      }
    }
  }

  updateFps(dt) {
    this.frames += 1;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = this.frames / this.fpsTimer;
      this.frames = 0;
      this.fpsTimer = 0;
    }
  }

  spawnFloatText(text) {
    this.floatTexts.push({
      text,
      time: 0,
      duration: CONFIG.FLOAT_TEXT_DURATION
    });
    if (this.floatTexts.length > 4) {
      this.floatTexts.shift();
    }
  }

  updateFloatTexts(dt) {
    for (let i = this.floatTexts.length - 1; i >= 0; i -= 1) {
      const item = this.floatTexts[i];
      item.time += dt;
      if (item.time >= item.duration) {
        this.floatTexts.splice(i, 1);
      }
    }
  }

  updateLevelProgress() {
    while (this.score >= this.nextLevelScore) {
      if (this.level >= this.bossGateLevel && this.bossActive) {
        break;
      }
      this.level += 1;
      this.nextLevelScore += CONFIG.LEVEL_SCORE_STEP + Math.floor(this.level * 1.5);
      this.spawnFloatText(`Level ${this.level}`);
      if (this.level === this.bossGateLevel && !this.bossActive) {
        this.spawnBoss();
      }
    }
    if (this.level === this.bossGateLevel && !this.bossActive) {
      this.spawnBoss();
    }
  }

  render() {
    const ctx = this.ctx;
    const width = this.viewWidth;
    const height = this.viewHeight;

    const camX = this.hero.x - width / 2;
    const camY = this.hero.y - height / 2;
    const heroScreenX = this.hero.x - camX;
    const heroScreenY = this.hero.y - camY;
    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, width, height);
    this.drawBombEffect(ctx, width, height);
    this.drawPowerupGlow(ctx, width, height, camX, camY);
    this.drawBossIndicator(ctx, width, height, camX, camY);
    // Draw hero in screen space (camera keeps hero centered).
    this.characterRenderer.draw(ctx, heroScreenX, heroScreenY);
    this.drawHeroHealth(ctx, heroScreenX, heroScreenY);
    this.drawArmorTimer(ctx, width);

    ctx.save();
    ctx.translate(-camX, -camY);
    const weaponPositions = this.getWeaponPositions();
    for (const pos of weaponPositions) {
      this.weapon.drawAt(ctx, this.assets, CONFIG, pos.x, pos.y, pos.angle);
    }

    for (const enemy of this.enemies) {
      enemy.draw(ctx, this.assets, CONFIG);
    }

    for (const powerUp of this.powerUps) {
      powerUp.draw(ctx);
    }

    this.drawGuideArrow(ctx);
    this.drawFloatTexts(ctx);

    for (const particle of this.particles) {
      particle.draw(ctx);
    }

    ctx.restore();

    if (this.state === "paused") {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, width, height);
    }
  }

  drawBackground(ctx, width, height) {
    const bg = this.assets.getImage("BACKGROUND");
    if (bg) {
      if (!this.bgPattern) {
        this.bgPattern = ctx.createPattern(bg, "repeat");
      }
      ctx.fillStyle = this.bgPattern;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    ctx.fillStyle = "#131a23";
    ctx.fillRect(0, 0, width, height);

    const grid = 60;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const offsetX = -(this.hero.x % grid);
    const offsetY = -(this.hero.y % grid);
    for (let x = offsetX; x < width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = offsetY; y < height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  drawGuideArrow(ctx) {
    if (!this.guideTargets.length) return;
    for (let i = 0; i < this.guideTargets.length; i += 1) {
      const target = this.guideTargets[i];
      const dx = target.x - this.hero.x;
      const dy = target.y - this.hero.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) continue;
      const angle = Math.atan2(dy, dx);
      const length = 70 + i * 8;
      const baseX = this.hero.x + Math.cos(angle) * (32 + i * 3);
      const baseY = this.hero.y + Math.sin(angle) * (32 + i * 3);
      const tipX = this.hero.x + Math.cos(angle) * length;
      const tipY = this.hero.y + Math.sin(angle) * length;

      ctx.save();
      ctx.strokeStyle = "rgba(255, 220, 120, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 220, 120, 0.9)";
      ctx.translate(tipX, tipY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, 5);
      ctx.lineTo(-10, -5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "rgba(255, 240, 200, 0.9)";
      ctx.font = "10px Segoe UI, Tahoma, sans-serif";
      ctx.textAlign = "center";
      const label = target.type?.name ? `${target.type.name} ${Math.round(dist)}` : `${Math.round(dist)}`;
      ctx.fillText(label, tipX, tipY - 18);
      ctx.restore();
    }
  }

  drawPowerupGlow(ctx, width, height, camX, camY) {
    if (this.powerUps.length === 0) return;
    const fade = "rgba(0,0,0,0)";
    const radius = Math.max(width, height) * 0.3;
    const maxDist = Math.hypot(width, height) * 1.2;

    for (const target of this.powerUps) {
      const dx = target.x - this.hero.x;
      const dy = target.y - this.hero.y;
      const screenX = target.x - camX;
      const screenY = target.y - camY;
      const range = target.hueMax - target.hueMin;
      const hue = target.hueMin + ((target.time * target.cycleSpeed) % range);
      const baseAlpha = 0.22;
      const color = `hsla(${hue}, 80%, 60%, ${baseAlpha})`;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      ctx.save();
      const offscreen = screenX < 0 || screenX > width || screenY < 0 || screenY > height;
      if (offscreen) {
        const push = 0.55 + Math.min(0.2, (dist / maxDist) * 0.2);
        const cx = width / 2 + Math.cos(angle) * (width * push);
        const cy = height / 2 + Math.sin(angle) * (height * push);
        ctx.translate(cx, cy);
        const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, fade);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      const minAlpha = 0.06;
      const glowAlpha = minAlpha + (baseAlpha - minAlpha) * (1 - Math.exp(-dist / 420));
      const onColor = `hsla(${hue}, 80%, 60%, ${glowAlpha.toFixed(3)})`;
      ctx.translate(screenX, screenY);
      const grad = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius * 0.7);
      grad.addColorStop(0, onColor);
      grad.addColorStop(1, fade);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawBossIndicator(ctx, width, height, camX, camY) {
    const boss = this.bossActive;
    if (!boss) return;
    const screenX = boss.x - camX;
    const screenY = boss.y - camY;
    const onScreen = screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height;
    if (onScreen) return;

    const dx = boss.x - this.hero.x;
    const dy = boss.y - this.hero.y;
    const angle = Math.atan2(dy, dx);
    const radius = Math.min(width, height) * 0.45;
    const cx = width / 2 + Math.cos(angle) * radius;
    const cy = height / 2 + Math.sin(angle) * radius;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(210, 120, 255, 0.85)";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-12, 8);
    ctx.lineTo(-12, -8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(230, 200, 255, 0.9)";
    ctx.font = "bold 12px Segoe UI, Tahoma, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Boss", cx, cy - 14);
    ctx.restore();
  }
  drawHeroHealth(ctx, screenX, screenY) {
    const width = 54;
    const height = 6;
    const x = screenX - width / 2;
    const y = screenY - this.hero.radius - 18;
    const pct = Math.max(0, Math.min(1, this.hero.health / this.hero.maxHealth));
    ctx.save();
    ctx.fillStyle = "rgba(12, 20, 30, 0.7)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#55d26a";
    ctx.fillRect(x, y, width * pct, height);
    ctx.restore();
  }

  drawArmorTimer(ctx, width) {
    if (this.armorTimer <= 0) return;
    const label = `Armor activated ${this.armorTimer.toFixed(1)}s`;
    const y = this.bossActive ? 78 : 42;
    ctx.save();
    ctx.fillStyle = "rgba(120, 200, 255, 0.9)";
    ctx.font = "bold 16px Segoe UI, Tahoma, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, width / 2, y);
    ctx.restore();
  }

  drawBombEffect(ctx, width, height) {
    if (this.bombFlash > 0) {
      const alpha = Math.min(0.45, this.bombFlash * 1.8);
      ctx.save();
      ctx.fillStyle = `rgba(${this.bombProfile.flashRgb}, ${alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    if (this.bombWave > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(${this.bombProfile.waveRgb}, 0.7)`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, this.bombWave, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawFloatTexts(ctx) {
    if (this.floatTexts.length === 0) return;
    for (let i = 0; i < this.floatTexts.length; i += 1) {
      const item = this.floatTexts[i];
      const t = Math.min(item.time / item.duration, 1);
      const rise = 18 + t * 16;
      const alpha = 1 - t;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#fff5d6";
      ctx.font = "bold 14px Segoe UI, Tahoma, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.text, this.hero.x, this.hero.y - this.hero.radius - rise - i * 14);
      ctx.restore();
    }
  }

  logSpritePreloadStatus() {
    const idleFile = SPRITES.characters?.assassin?.front?.idle;
    if (!idleFile) return;
    const url = SPRITES.basePath + idleFile;
    const img = this.assets.getImage(url);
    if (img && img.complete) {
      console.log(`Sprite loaded: ${url} ${img.width}x${img.height}`);
    } else {
      console.log(`Sprite missing after preload: ${url}`);
    }
  }
}
