import { Game } from "./game.js";
import { UIManager } from "./ui.js";

const canvas = document.getElementById("game-canvas");
const ui = new UIManager();
const game = new Game(canvas, ui);
game.input.attachTouch(canvas);

function applySettings() {
  const difficulty = ui.settingDifficulty.value;
  const soundEnabled = ui.settingSound.checked;
  const showFps = ui.settingFps.checked;
  const fullscreenEnabled = ui.settingFullscreen.checked;
  game.setDifficulty(difficulty);
  game.setSoundEnabled(soundEnabled);
  game.setShowFps(showFps);
  game.setFullscreenEnabled(fullscreenEnabled);
}

function setCarryChoice(choiceButton) {
  ui.powerupChoices.forEach((btn) => btn.classList.remove("active"));
  if (choiceButton) {
    choiceButton.classList.add("active");
    const key = choiceButton.getAttribute("data-powerup");
    game.setCarryPowerup(key);
  }
}

function syncCarryChoice() {
  const active = ui.powerupChoices.find((btn) => btn.classList.contains("active"));
  if (active) {
    game.setCarryPowerup(active.getAttribute("data-powerup"));
  }
}

ui.btnStart.addEventListener("click", () => {
  applySettings();
  syncCarryChoice();
  game.startGame();
});

ui.btnRestart.addEventListener("click", () => {
  applySettings();
  syncCarryChoice();
  game.startGame();
});

ui.settingSound.addEventListener("change", () => {
  game.setSoundEnabled(ui.settingSound.checked);
});

ui.settingFps.addEventListener("change", () => {
  game.setShowFps(ui.settingFps.checked);
});

ui.settingFullscreen.addEventListener("change", () => {
  game.setFullscreenEnabled(ui.settingFullscreen.checked);
});

ui.settingDifficulty.addEventListener("change", () => {
  game.setDifficulty(ui.settingDifficulty.value);
});

ui.powerupChoices.forEach((btn) => {
  btn.addEventListener("click", () => {
    setCarryChoice(btn);
  });
});

game.init();

window.game = game;
