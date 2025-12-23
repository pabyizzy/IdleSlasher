export class UIManager {
  constructor() {
    this.loading = document.getElementById("overlay-loading");
    this.menu = document.getElementById("overlay-menu");
    this.pause = document.getElementById("overlay-pause");
    this.gameOver = document.getElementById("overlay-gameover");

    this.btnStart = document.getElementById("btn-start");
    this.btnRestart = document.getElementById("btn-restart");
    this.settingDifficulty = document.getElementById("setting-difficulty");
    this.settingSound = document.getElementById("setting-sound");
    this.settingFps = document.getElementById("setting-fps");
    this.settingFullscreen = document.getElementById("setting-fullscreen");
    this.menuHint = document.getElementById("menu-hint");
    this.defaultMenuHint = this.menuHint?.textContent ?? "";

    this.hudScore = document.getElementById("hud-score");
    this.hudTime = document.getElementById("hud-time");
    this.hudLevel = document.getElementById("hud-level");
    this.hudWeapon = document.getElementById("hud-weapon");
    this.hudFps = document.getElementById("hud-fps");
    this.hudHealth = document.getElementById("hud-health");
    this.hud = document.getElementById("hud");
    this.hudLeft = document.querySelector(".hud-left");
    this.hudRight = document.querySelector(".hud-right");
    this.hudLeftToggle = document.getElementById("hud-left-toggle");
    this.hudRightToggle = document.getElementById("hud-right-toggle");
    this.hudLeftBody = document.getElementById("hud-left-body");
    this.hudRightBody = document.getElementById("hud-right-body");
    this.sprintButton = document.getElementById("btn-sprint");
    this.pauseButton = document.getElementById("btn-pause");
    this.exitFullscreenButton = document.getElementById("btn-exit-fullscreen");
    this.bossBar = document.getElementById("boss-bar");
    this.bossHealth = document.getElementById("boss-health");

    this.finalScore = document.getElementById("final-score");
    this.finalTime = document.getElementById("final-time");
    this.finalLevel = document.getElementById("final-level");
    this.powerupChoices = Array.from(document.querySelectorAll(".powerup-choice"));
    this.weaponToast = document.getElementById("weapon-toast");
    this.weaponToastTimer = null;
    this.isMobile = false;

    if (this.hudLeftToggle) {
      this.hudLeftToggle.addEventListener("click", () => {
        this.toggleHudSection("left");
      });
    }
    if (this.hudRightToggle) {
      this.hudRightToggle.addEventListener("click", () => {
        this.toggleHudSection("right");
      });
    }
  }

  hideAll() {
    this.loading.classList.remove("visible");
    this.menu.classList.remove("visible");
    this.pause.classList.remove("visible");
    this.gameOver.classList.remove("visible");
  }

  showLoading() {
    this.hideAll();
    this.hideHud();
    this.loading.classList.add("visible");
  }

  showMenu() {
    this.hideAll();
    this.hideHud();
    this.menu.classList.add("visible");
  }

  showPause() {
    this.pause.classList.add("visible");
  }

  hidePause() {
    this.pause.classList.remove("visible");
  }

  showGameOver(score, time, level) {
    this.hideAll();
    this.hideHud();
    this.gameOver.classList.add("visible");
    this.finalScore.textContent = `Score: ${score}`;
    this.finalTime.textContent = `Time: ${time.toFixed(1)}s`;
    this.finalLevel.textContent = `Level: ${level}`;
    this.powerupChoices.forEach((btn) => btn.classList.remove("active"));
  }

  showWeaponUpgrade() {
    if (!this.weaponToast) return;
    this.weaponToast.classList.add("visible");
    if (this.weaponToastTimer) {
      clearTimeout(this.weaponToastTimer);
    }
    this.weaponToastTimer = setTimeout(() => {
      this.weaponToast.classList.remove("visible");
    }, 1600);
  }

  setMobileMode(isMobile) {
    if (this.isMobile === isMobile) return;
    this.isMobile = isMobile;
    document.body.classList.toggle("mobile", isMobile);
    if (this.menuHint) {
      this.menuHint.textContent = isMobile ? "Tap Start to play" : "Press Space to start";
    }
    if (isMobile) {
      this.setHudSectionCollapsed("right", true);
      this.setHudSectionCollapsed("left", false);
    } else {
      this.setHudSectionCollapsed("right", false);
      this.setHudSectionCollapsed("left", false);
    }
  }

  setPortraitMode(isPortrait) {
    document.body.classList.toggle("portrait", isPortrait);
    if (!this.menuHint) return;
    if (this.isMobile && isPortrait) {
      this.menuHint.textContent = "Rotate device for landscape";
      return;
    }
    if (this.isMobile) {
      this.menuHint.textContent = "Tap Start to play";
      return;
    }
    this.menuHint.textContent = this.defaultMenuHint || "Press Space to start";
  }

  bindSprintButton(input) {
    if (!this.sprintButton || !input) return;
    const start = (e) => {
      input.setSprintActive(true);
      e.preventDefault();
    };
    const end = (e) => {
      input.setSprintActive(false);
      e.preventDefault();
    };
    this.sprintButton.addEventListener("pointerdown", start);
    this.sprintButton.addEventListener("pointerup", end);
    this.sprintButton.addEventListener("pointercancel", end);
    this.sprintButton.addEventListener("pointerleave", end);
    this.sprintButton.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  setHudSectionCollapsed(side, collapsed) {
    const panel = side === "left" ? this.hudLeft : this.hudRight;
    const body = side === "left" ? this.hudLeftBody : this.hudRightBody;
    const toggle = side === "left" ? this.hudLeftToggle : this.hudRightToggle;
    if (!panel || !body || !toggle) return;
    panel.classList.toggle("collapsed", collapsed);
    body.classList.toggle("collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
  }

  toggleHudSection(side) {
    const panel = side === "left" ? this.hudLeft : this.hudRight;
    if (!panel) return;
    this.setHudSectionCollapsed(side, !panel.classList.contains("collapsed"));
  }

  showHud() {
    if (!this.hud) return;
    this.hud.classList.remove("hidden");
  }

  hideHud() {
    if (!this.hud) return;
    this.hud.classList.add("hidden");
  }

  updateHud(score, time, level, health, maxHealth, showFps, fps, boss, weaponDamage) {
    this.hudScore.textContent = score;
    this.hudTime.textContent = time.toFixed(1);
    this.hudLevel.textContent = level;
    if (this.hudWeapon) {
      this.hudWeapon.textContent = Math.round(weaponDamage * 10);
    }
    const pct = Math.max(0, Math.min(1, health / maxHealth));
    this.hudHealth.style.width = `${pct * 100}%`;
    this.hudFps.textContent = showFps ? Math.round(fps).toString() : "--";
    if (boss && boss.max > 0) {
      const bossPct = Math.max(0, Math.min(1, boss.current / boss.max));
      this.bossHealth.style.width = `${bossPct * 100}%`;
      this.bossBar.classList.remove("hidden");
    } else {
      this.bossBar.classList.add("hidden");
    }
  }
}
