export const ASSET_MANIFEST = {
  images: {
    HERO: "assets/images/hero.png",
    ENEMY: "assets/images/enemy.png",
    WEAPON: "assets/images/weapon.png",
    BACKGROUND: "assets/images/background.png"
  },
  audio: {
    BGM: "assets/audio/evasionGameMusic.mp3",
    HIT: "assets/audio/weaponSlice.mp3",
    BOMB: "assets/audio/bombExplosion.mp3",
    DAMAGE: "assets/audio/damage.wav",
    GAME_OVER: "assets/audio/gameover.wav"
  }
};

export class AssetManager {
  constructor(manifest) {
    this.manifest = manifest;
    this.images = new Map();
    this.audio = new Map();
    this.failedImages = new Set();
  }

  async loadAll(overrideManifest) {
    const manifest = overrideManifest || this.manifest || {};
    const imageEntries = this.normalizeImageEntries(manifest.images);
    const audioEntries = Object.entries(manifest.audio || {});
    const spriteUrls = Array.isArray(manifest.spriteUrls) ? manifest.spriteUrls : [];

    const imagePromises = imageEntries.map(([key, src]) => this.loadImage(key, src));
    const spritePromises = spriteUrls.map((url) => this.loadImage(url, url));
    const audioPromises = audioEntries.map(([key, src]) => this.loadAudio(key, src));

    await Promise.all([...imagePromises, ...spritePromises, ...audioPromises]);
  }

  loadImage(key, src) {
    const normalizedSrc = this.normalizeKey(src);
    const normalizedKey = this.normalizeKey(key);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(normalizedKey, img);
        this.images.set(normalizedSrc, img);
        resolve();
      };
      img.onerror = () => {
        this.images.set(normalizedKey, null);
        this.images.set(normalizedSrc, null);
        if (!this.failedImages.has(normalizedSrc)) {
          this.failedImages.add(normalizedSrc);
          console.error(`Failed to load image: ${src}`);
        }
        resolve();
      };
      img.src = src;
    });
  }

  loadAudio(key, src) {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = "auto";
      audio.oncanplaythrough = () => {
        this.audio.set(key, audio);
        resolve();
      };
      audio.onerror = () => {
        this.audio.set(key, null);
        resolve();
      };
      audio.src = src;
    });
  }

  getImage(key) {
    return this.images.get(this.normalizeKey(key)) || null;
  }

  getAudio(key) {
    return this.audio.get(key) || null;
  }

  normalizeImageEntries(images) {
    if (!images) return [];
    if (Array.isArray(images)) {
      return images.map((src) => [src, src]);
    }
    return Object.entries(images);
  }

  normalizeKey(value) {
    if (typeof value !== "string") return value;
    return value.replace(/\\/g, "/").trim();
  }
}

export class SoundManager {
  constructor(assetManager) {
    this.assetManager = assetManager;
    this.enabled = true;
    this.unlocked = false;
    this.bgm = null;
    this.audioContext = null;
    this.bgmNode = null;
    this.bgmGain = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopBgm();
    } else if (this.unlocked) {
      this.playBgm();
    }
  }

  unlock() {
    this.unlocked = true;
    this.ensureAudioContext();
    this.playBgm();
  }

  playBgm() {
    if (!this.enabled || !this.unlocked) return;
    if (!this.bgm) {
      this.bgm = this.assetManager.getAudio("BGM");
      if (this.bgm) {
        this.bgm.loop = true;
        this.bgm.volume = 0.45;
      }
    }

    if (this.bgm) {
      const playPromise = this.bgm.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
      return;
    }
    this.startSynthBgm();
  }

  stopBgm() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    }
    this.stopSynthBgm();
  }

  playSfx(key, volume = 0.8) {
    if (!this.enabled || !this.unlocked) return;
    const sfx = this.assetManager.getAudio(key);
    if (sfx) {
      sfx.volume = volume;
      sfx.currentTime = 0;
      const playPromise = sfx.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
      return;
    }
    this.playSynthSfx(key, volume);
  }

  ensureAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = AudioCtx ? new AudioCtx() : null;
    }
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  startSynthBgm() {
    const ctx = this.ensureAudioContext();
    if (!ctx || this.bgmNode) return;
    this.bgmNode = ctx.createOscillator();
    this.bgmGain = ctx.createGain();
    this.bgmNode.type = "sine";
    this.bgmNode.frequency.value = 110;
    this.bgmGain.gain.value = 0.03;
    this.bgmNode.connect(this.bgmGain);
    this.bgmGain.connect(ctx.destination);
    this.bgmNode.start();
  }

  stopSynthBgm() {
    if (this.bgmNode) {
      this.bgmNode.stop();
      this.bgmNode.disconnect();
      this.bgmNode = null;
    }
    if (this.bgmGain) {
      this.bgmGain.disconnect();
      this.bgmGain = null;
    }
  }

  playSynthSfx(key, volume) {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const freqMap = {
      HIT: 520,
      DAMAGE: 220,
      GAME_OVER: 140
    };
    osc.type = "square";
    osc.frequency.value = freqMap[key] || 420;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22 * volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}
